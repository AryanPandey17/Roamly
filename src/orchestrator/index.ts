// Public entry of the orchestrator. Nothing in this folder imports Next.js or
// Supabase; everything external arrives through `deps` (see ports.ts).

import { GraphRecursionError } from "@langchain/langgraph";
import { LIMITS } from "./config";
import { isRequestError, isResumable } from "./errors";
import type { AgentEventInput, OnEvent } from "./events";
import { buildGraph } from "./graph";
import type { Deps, RunRef, RunStatus } from "./ports";
import type { Hints, Preferences, TripStateType, Usage } from "./state";

/** What a node wrote, as it appears in the "updates" stream. */
type NodeUpdate = Partial<Pick<TripStateType, "request" | "assumptions" | "audits" | "itinerary" | "usage" | "negotiation">>;

export type TripRunRequest = RunRef & {
  prompt: string;
  hints: Hints;
  preferences: Preferences;
};

export type RunResult = {
  status: RunStatus;
  error?: { code: string; message: string };
};

/**
 * Plans a trip. Streams every agent event to `onEvent` as it happens and
 * persists progress through `deps.store`. State is checkpointed after every
 * step under thread id = runId.
 */
export function runTrip(request: TripRunRequest, onEvent: OnEvent, deps: Deps): Promise<RunResult> {
  return execute(request, onEvent, deps, false);
}

/**
 * Continues a paused or interrupted run from its last checkpoint. Nodes that
 * already finished are not run again. If no checkpoint exists yet, the run
 * starts from the beginning.
 */
export function resumeTrip(request: TripRunRequest, onEvent: OnEvent, deps: Deps): Promise<RunResult> {
  return execute(request, onEvent, deps, true);
}

async function execute(request: TripRunRequest, onEvent: OnEvent, deps: Deps, resume: boolean): Promise<RunResult> {
  const run: RunRef = { runId: request.runId, tripId: request.tripId, userId: request.userId };
  const graph = buildGraph(deps);
  const config = { configurable: { thread_id: request.runId }, recursionLimit: LIMITS.recursionLimit };

  let seq = (await deps.store.lastSeq(run.runId)) + 1;
  const emit = async (event: AgentEventInput) => {
    const current = seq++;
    await deps.store.appendMessage(run, current, event);
    await onEvent({ type: "agent", seq: current, at: deps.now().toISOString(), ...event });
  };

  const finish = async (status: RunStatus, error?: { code: string; message: string }): Promise<RunResult> => {
    await deps.store.updateRun(run, { status, error: error ?? null });
    if (status === "completed" || status === "completed_over_budget") {
      await onEvent({ type: "done", status, tripId: run.tripId });
    } else if (status === "paused" && error) {
      await onEvent({ type: "paused", ...error });
    } else if (error) {
      await emit({ agent: "system", kind: "error", text: error.message });
      await onEvent({ type: "error", ...error });
    }
    return { status, error };
  };

  try {
    // Decide whether there is a checkpoint to continue from.
    const snapshot = resume ? await graph.getState(config) : null;
    const hasCheckpoint = Boolean(snapshot && Object.keys(snapshot.values ?? {}).length > 0);
    if (hasCheckpoint && snapshot!.next.length === 0 && snapshot!.values.itinerary) {
      // The graph already finished; only the final bookkeeping was lost.
      return finish(snapshot!.values.itinerary.fitsBudget ? "completed" : "completed_over_budget");
    }

    const usage: Usage = hasCheckpoint ? { ...snapshot!.values.usage } : { llmCalls: 0, toolCalls: 0 };
    await deps.store.updateRun(run, { status: "running", error: null });
    if (hasCheckpoint) await emit({ agent: "system", kind: "info", text: "Resuming from the last saved step." });

    const input = hasCheckpoint
      ? null
      : {
          runId: request.runId,
          tripId: request.tripId,
          userId: request.userId,
          rawRequest: request.prompt,
          structuredHints: request.hints,
          preferences: request.preferences,
        };

    const stream = await graph.stream(input, { ...config, streamMode: ["updates", "custom"] as const });

    for await (const [mode, chunk] of stream) {
      if (mode === "custom") {
        await emit(chunk as AgentEventInput);
        continue;
      }
      // "updates": { nodeName: partialState }. Persist what changed.
      for (const update of Object.values(chunk as Record<string, NodeUpdate | undefined>)) {
        if (!update) continue;
        if (update.request) await deps.store.saveParsedRequest(run, update.request, update.assumptions ?? []);
        for (const audit of update.audits ?? []) await deps.store.saveAudit(run, audit);
        if (update.itinerary) await deps.store.saveItinerary(run, update.itinerary);
        if (update.usage) {
          usage.llmCalls += update.usage.llmCalls;
          usage.toolCalls += update.usage.toolCalls;
        }
        if (update.usage || update.negotiation) {
          await deps.store.updateRun(run, {
            usage,
            ...(update.negotiation
              ? { round: update.negotiation.round, rejections: update.negotiation.rejections }
              : {}),
          });
        }
      }
    }

    const final = await graph.getState(config);
    const itinerary = final.values.itinerary;
    if (!itinerary) return finish("failed", { code: "no_itinerary", message: "The run ended without an itinerary." });
    return finish(itinerary.fitsBudget ? "completed" : "completed_over_budget");
  } catch (error) {
    if (isResumable(error)) {
      return finish("paused", { code: error.code, message: error.message });
    }
    if (isRequestError(error)) {
      return finish("failed", { code: error.code, message: error.message });
    }
    if (error instanceof GraphRecursionError || (error as Error)?.name === "GraphRecursionError") {
      return finish("failed", { code: "recursion_limit", message: "The agents could not converge. Try a different budget or dates." });
    }
    console.error(JSON.stringify({ level: "error", where: "orchestrator", runId: run.runId, message: String(error) }));
    return finish("failed", { code: "internal_error", message: "Something went wrong while planning. Try again." });
  }
}

export type { Deps, RunRef, RunStore, TelemetryPort, TravelProviders, LlmPort } from "./ports";
export type { TripEvent, OnEvent, AgentEventInput, BudgetSnapshot } from "./events";
export type { Hints, Preferences, Itinerary, ParsedRequest, BudgetAudit } from "./state";
export { hintsSchema } from "./state";
export { createLlm } from "./llm";
