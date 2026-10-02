import "server-only";
import type { Pool } from "pg";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Deps } from "@/orchestrator";
import type { Json, TablesUpdate } from "@/types/database";

type RunStore = Deps["store"];
type Telemetry = Deps["telemetry"];

const json = (value: unknown) => JSON.parse(JSON.stringify(value ?? null)) as Json;

const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

const TRIP_STATUS = {
  running: "planning",
  paused: "paused",
  failed: "failed",
  completed: "ready",
  completed_over_budget: "over_budget",
} as const;

/**
 * Persists a run to Supabase. Uses the service-role client: the route has
 * already verified that the user owns the trip before a run starts, and the
 * run tables are read-only for clients.
 */
export function createRunStore(): RunStore {
  const db = createAdminClient();

  return {
    async lastSeq(runId) {
      const { data, error } = await db
        .from("agent_messages")
        .select("seq")
        .eq("run_id", runId)
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();
      fail("Could not read the transcript", error);
      return data?.seq ?? -1;
    },

    async appendMessage(run, seq, event) {
      const { error } = await db.from("agent_messages").insert({
        run_id: run.runId,
        trip_id: run.tripId,
        user_id: run.userId,
        seq,
        agent: event.agent,
        kind: event.kind,
        round: event.round ?? null,
        content: event.text,
        data: event.data ? json(event.data) : null,
      });
      fail("Could not save an agent message", error);
    },

    async saveParsedRequest(run, request, assumptions) {
      const { data: runRow, error: runError } = await db
        .from("agent_runs")
        .select("request_id")
        .eq("id", run.runId)
        .single();
      fail("Could not load the run", runError);

      const [requestUpdate, tripUpdate] = await Promise.all([
        db.from("trip_requests").update({ parsed: json(request), assumptions }).eq("id", runRow!.request_id),
        db
          .from("trips")
          .update({
            title: `${request.days} days in ${request.destination.name}`,
            destination: [request.destination.name, request.destination.country].filter(Boolean).join(", "),
            destination_lat: request.destination.lat,
            destination_lng: request.destination.lng,
            origin: request.origin.name,
            start_date: request.startDate,
            end_date: request.endDate,
            travellers: request.travellers,
            budget_amount: request.budget.amount,
            currency: request.budget.currency,
          })
          .eq("id", run.tripId),
      ]);
      fail("Could not save the parsed request", requestUpdate.error);
      fail("Could not update the trip", tripUpdate.error);
    },

    async saveAudit(run, audit) {
      const { error } = await db.from("budget_audits").insert({
        run_id: run.runId,
        trip_id: run.tripId,
        user_id: run.userId,
        round: audit.round,
        status: audit.status,
        currency: audit.breakdown.currency,
        budget_amount: audit.budget,
        total: audit.breakdown.total,
        breakdown: json(audit.breakdown),
        target_agent: audit.instruction?.target ?? null,
        target_category: audit.instruction?.category ?? null,
        ceiling: audit.instruction?.ceiling ?? null,
        over_by: audit.overBy,
        feedback: audit.feedback,
      });
      fail("Could not save the budget audit", error);
    },

    async saveItinerary(run, itinerary) {
      // One itinerary per trip: a new run replaces the previous one.
      fail("Could not replace the itinerary", (await db.from("itineraries").delete().eq("trip_id", run.tripId)).error);

      const { data: row, error } = await db
        .from("itineraries")
        .insert({
          trip_id: run.tripId,
          run_id: run.runId,
          user_id: run.userId,
          currency: itinerary.currency,
          budget_amount: itinerary.budget,
          total_cost: itinerary.breakdown.total,
          fits_budget: itinerary.fitsBudget,
          over_by: itinerary.overBy,
          cost_breakdown: json(itinerary.breakdown),
          assumptions: itinerary.assumptions,
          summary_markdown: itinerary.markdown,
        })
        .select("id")
        .single();
      fail("Could not save the itinerary", error);

      const { data: days, error: daysError } = await db
        .from("itinerary_days")
        .insert(
          itinerary.days.map((day) => ({
            itinerary_id: row!.id,
            user_id: run.userId,
            day_number: day.dayNumber,
            date: day.date,
            title: day.title,
          }))
        )
        .select("id, day_number");
      fail("Could not save the itinerary days", daysError);

      const dayId = new Map(days!.map((d) => [d.day_number, d.id]));
      const items = itinerary.days.flatMap((day) =>
        day.items.map((item, position) => ({
          itinerary_id: row!.id,
          day_id: dayId.get(day.dayNumber)!,
          user_id: run.userId,
          type: item.type,
          position,
          title: item.title,
          description: item.description,
          start_time: item.startTime,
          end_time: item.endTime,
          cost_amount: item.cost,
          currency: itinerary.currency,
          lat: item.lat,
          lng: item.lng,
          provider: item.provider,
          external_id: item.externalId,
          deep_link: item.deepLink,
        }))
      );
      if (items.length) fail("Could not save the itinerary items", (await db.from("itinerary_items").insert(items)).error);

      fail(
        "Could not update the trip total",
        (await db.from("trips").update({ total_cost: itinerary.breakdown.total }).eq("id", run.tripId)).error
      );
    },

    async updateRun(run, patch) {
      const update: TablesUpdate<"agent_runs"> = {};
      if (patch.round !== undefined) update.round = patch.round;
      if (patch.rejections !== undefined) update.rejections = patch.rejections;
      if (patch.usage) {
        update.llm_calls = patch.usage.llmCalls;
        update.tool_calls = patch.usage.toolCalls;
      }
      if (patch.error !== undefined) {
        update.error_code = patch.error?.code ?? null;
        update.error_message = patch.error?.message ?? null;
      }
      if (patch.status) {
        update.status = patch.status;
        if (patch.status !== "running" && patch.status !== "paused") update.finished_at = new Date().toISOString();
      }
      if (Object.keys(update).length === 0) return;

      fail("Could not update the run", (await db.from("agent_runs").update(update).eq("id", run.runId)).error);
      if (patch.status) {
        fail(
          "Could not update the trip status",
          (await db.from("trips").update({ status: TRIP_STATUS[patch.status] }).eq("id", run.tripId)).error
        );
      }
    },
  };
}

/**
 * Per-call logs and the daily request counter. Logging must never break a
 * run, so failures are reported to the console and swallowed.
 */
export function createTelemetry(pool: Pool): Telemetry {
  const db = createAdminClient();
  const warn = (what: string, error: unknown) =>
    console.warn(JSON.stringify({ level: "warn", where: "telemetry", what, message: String(error) }));

  return {
    async logLlmCall(log) {
      const { error } = await db.from("llm_call_logs").insert({
        run_id: log.runId,
        user_id: log.userId,
        agent: log.agent,
        role: log.role,
        provider: log.provider,
        requested_model: log.requestedModel,
        served_model: log.servedModel,
        fallback_depth: log.fallbackDepth,
        prompt_tokens: log.promptTokens,
        completion_tokens: log.completionTokens,
        latency_ms: log.latencyMs,
        status: log.status,
        error_code: log.errorCode,
        error_message: log.errorMessage,
      });
      if (error) warn("llm_call_logs", error.message);
    },

    async logToolCall(log) {
      const { error } = await db.from("tool_call_logs").insert({
        run_id: log.runId,
        user_id: log.userId,
        agent: log.agent,
        tool: log.tool,
        provider: log.provider,
        latency_ms: log.latencyMs,
        cache_hit: log.cacheHit,
        status: log.status,
        error_message: log.errorMessage,
      });
      if (error) warn("tool_call_logs", error.message);
    },

    async quotaUsedToday(provider) {
      const day = new Date().toISOString().slice(0, 10);
      const { data } = await db
        .from("provider_quota_usage")
        .select("requests")
        .eq("provider", provider)
        .eq("day", day)
        .maybeSingle();
      return data?.requests ?? 0;
    },

    async recordProviderRequest(provider, failed) {
      // Atomic increment; the Data API has no "x = x + 1", so this goes through Postgres directly.
      try {
        await pool.query(
          `insert into public.provider_quota_usage (provider, day, requests, errors)
           values ($1, (now() at time zone 'utc')::date, 1, $2)
           on conflict (provider, day) do update
             set requests = public.provider_quota_usage.requests + 1,
                 errors = public.provider_quota_usage.errors + excluded.errors,
                 updated_at = now()`,
          [provider, failed ? 1 : 0]
        );
      } catch (error) {
        warn("provider_quota_usage", error);
      }
    },
  };
}
