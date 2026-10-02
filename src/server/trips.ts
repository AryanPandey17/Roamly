import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hintsSchema, type Hints, type Preferences } from "@/orchestrator";
import type { TripRunRequest } from "@/orchestrator";
import { ApiError, notFound } from "@/server/http";
import type { Json } from "@/types/database";

const TERMINAL = ["completed", "completed_over_budget", "failed"] as const;
/** A run marked "running" with no activity for this long is treated as interrupted. */
const STALE_AFTER_MS = 3 * 60_000;

export const isTerminal = (status: string) => (TERMINAL as readonly string[]).includes(status);

/** Creates the trip, its request and a queued run. Returns their ids. */
export async function createTrip(userId: string, input: { prompt: string; hints: Hints }) {
  const supabase = await createClient();

  // As the user, so RLS confirms ownership on insert.
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({ user_id: userId, title: input.prompt.slice(0, 80), status: "planning" })
    .select("id")
    .single();
  if (tripError) throw new Error(`Could not create the trip: ${tripError.message}`);

  const { data: request, error: requestError } = await supabase
    .from("trip_requests")
    .insert({ trip_id: trip.id, user_id: userId, raw_prompt: input.prompt, structured_hints: input.hints as Json })
    .select("id")
    .single();
  if (requestError) throw new Error(`Could not save the request: ${requestError.message}`);

  // Runs are server-written (clients have no insert policy on agent_runs).
  const admin = createAdminClient();
  const { data: run, error: runError } = await admin
    .from("agent_runs")
    .insert({ trip_id: trip.id, user_id: userId, request_id: request.id, status: "queued" })
    .select("id")
    .single();
  if (runError) throw new Error(`Could not create the run: ${runError.message}`);

  await admin.from("trips").update({ current_run_id: run.id }).eq("id", trip.id);
  return { tripId: trip.id, runId: run.id };
}

/** The run, if it belongs to this user. RLS enforces ownership. */
export async function getRun(runId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("agent_runs").select("*").eq("id", runId).maybeSingle();
  if (error) throw new Error(`Could not load the run: ${error.message}`);
  if (!data) throw notFound("Run");
  return data;
}

/**
 * Transcript rows after a sequence number. Pass `asServer` only after the
 * caller has verified the user owns the run (used inside the SSE stream,
 * where request cookies are no longer available).
 */
export async function getMessagesAfter(runId: string, afterSeq: number, asServer = false) {
  const supabase = asServer ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("agent_messages")
    .select("seq, agent, kind, round, content, data, created_at")
    .eq("run_id", runId)
    .gt("seq", afterSeq)
    .order("seq", { ascending: true });
  if (error) throw new Error(`Could not load the transcript: ${error.message}`);
  return data;
}

/** Current status of a run. Server-side read; verify ownership first. */
export async function getRunStatus(runId: string) {
  const { data, error } = await createAdminClient()
    .from("agent_runs")
    .select("status, error_code, error_message, trip_id")
    .eq("id", runId)
    .single();
  if (error) throw new Error(`Could not load the run: ${error.message}`);
  return data;
}

/**
 * Atomically takes ownership of a run so only one request executes it.
 * A queued run can always be claimed. A "running" run can be claimed only if
 * it has gone quiet (the process that owned it died).
 */
export async function claimRun(runId: string): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const queued = await admin
    .from("agent_runs")
    .update({ status: "running", started_at: now })
    .eq("id", runId)
    .eq("status", "queued")
    .select("id");
  if (queued.data?.length) return true;

  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const stale = await admin
    .from("agent_runs")
    .update({ status: "running", updated_at: now })
    .eq("id", runId)
    .eq("status", "running")
    .lt("updated_at", staleBefore)
    .select("id");
  return Boolean(stale.data?.length);
}

/** Marks a paused or failed run as ready to be picked up again. */
export async function requeueRun(runId: string) {
  const run = await getRun(runId); // ownership check
  if (run.status !== "paused" && run.status !== "failed") {
    throw new ApiError(409, "not_resumable", "This run is not paused.");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_runs")
    .update({ status: "queued", error_code: null, error_message: null, finished_at: null })
    .eq("id", runId);
  if (error) throw new Error(`Could not resume the run: ${error.message}`);
  await admin.from("trips").update({ status: "planning" }).eq("id", run.trip_id);
}

/** Everything the orchestrator needs to start or resume this run. */
export async function loadRunRequest(run: {
  id: string;
  trip_id: string;
  user_id: string;
  request_id: string;
}): Promise<TripRunRequest> {
  const supabase = await createClient();
  const [request, prefs] = await Promise.all([
    supabase.from("trip_requests").select("raw_prompt, structured_hints").eq("id", run.request_id).single(),
    supabase.from("user_preferences").select("*").eq("user_id", run.user_id).maybeSingle(),
  ]);
  if (request.error) throw new Error(`Could not load the request: ${request.error.message}`);

  const hints = hintsSchema.safeParse(request.data.structured_hints ?? {});
  const p = prefs.data;
  const preferences: Preferences = {
    homeCity: p?.home_city ?? process.env.DEFAULT_ORIGIN_CITY ?? null,
    currency: p?.currency ?? process.env.DEFAULT_CURRENCY ?? "INR",
    budgetStyle: p?.budget_style ?? "balanced",
    pace: p?.pace ?? "balanced",
    interests: p?.interests ?? [],
    dietary: p?.dietary ?? [],
  };

  return {
    runId: run.id,
    tripId: run.trip_id,
    userId: run.user_id,
    prompt: request.data.raw_prompt,
    hints: hints.success ? hints.data : {},
    preferences,
  };
}

/** Trip page data: the trip, its current run, the itinerary and the audits. */
export async function getTripDetail(tripId: string) {
  const supabase = await createClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the trip: ${error.message}`);
  if (!trip) return null;

  const [run, itinerary, request] = await Promise.all([
    trip.current_run_id
      ? supabase.from("agent_runs").select("*").eq("id", trip.current_run_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("itineraries").select("*").eq("trip_id", tripId).maybeSingle(),
    supabase
      .from("trip_requests")
      .select("raw_prompt, assumptions")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const [days, items, messages] = await Promise.all([
    itinerary.data
      ? supabase.from("itinerary_days").select("*").eq("itinerary_id", itinerary.data.id).order("day_number")
      : Promise.resolve({ data: [] }),
    itinerary.data
      ? supabase.from("itinerary_items").select("*").eq("itinerary_id", itinerary.data.id).order("position")
      : Promise.resolve({ data: [] }),
    run.data ? getMessagesAfter(run.data.id, -1) : Promise.resolve([]),
  ]);

  return {
    trip,
    run: run.data,
    request: request.data,
    itinerary: itinerary.data,
    days: days.data ?? [],
    items: items.data ?? [],
    messages,
  };
}

export async function softDeleteTrip(tripId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", tripId)
    .select("id");
  if (error) throw new Error(`Could not delete the trip: ${error.message}`);
  if (!data.length) throw notFound("Trip");
}
