import { resumeTrip, type TripEvent } from "@/orchestrator";
import { requireUuid, withUser } from "@/server/http";
import { getDeps } from "@/server/orchestrator";
import { sseResponse } from "@/server/sse";
import { claimRun, getMessagesAfter, getRun, getRunStatus, isTerminal, loadRunRequest } from "@/server/trips";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_MS = 1500;
const MAX_TAIL_MS = 10 * 60_000;

type Row = Awaited<ReturnType<typeof getMessagesAfter>>[number];

const toEvent = (row: Row) => ({
  type: "agent" as const,
  seq: row.seq,
  at: row.created_at,
  agent: row.agent,
  kind: row.kind,
  round: row.round ?? undefined,
  text: row.content,
  data: row.data ?? undefined,
});

function terminalEvent(run: { status: string; error_code: string | null; error_message: string | null; trip_id: string }) {
  if (run.status === "completed" || run.status === "completed_over_budget") {
    return { type: "done", status: run.status, tripId: run.trip_id };
  }
  if (run.status === "paused") {
    return { type: "paused", code: run.error_code ?? "paused", message: run.error_message ?? "This run is paused." };
  }
  if (run.status === "failed") {
    return { type: "error", code: run.error_code ?? "failed", message: run.error_message ?? "This run failed." };
  }
  return null;
}

/**
 * Live feed for a run. Replays stored events after `after` (or Last-Event-ID),
 * then either executes the run and streams it, or, if another request already
 * owns it, follows along from the database.
 */
export const GET = withUser<{ params: Promise<{ id: string }> }>(async ({ request, context }) => {
  const id = requireUuid((await context.params).id, "Run");
  const url = new URL(request.url);
  const after = Number(request.headers.get("last-event-id") ?? url.searchParams.get("after") ?? -1);

  // Everything that needs the user's cookies happens before the stream starts.
  const run = await getRun(id); // 404 unless the signed-in user owns it
  const backlog = await getMessagesAfter(id, Number.isFinite(after) ? after : -1);
  const runRequest = await loadRunRequest(run);

  return sseResponse(async (send) => {
    let lastSeq = Number.isFinite(after) ? after : -1;
    const forward = (row: Row) => {
      if (row.seq <= lastSeq) return;
      lastSeq = row.seq;
      send(toEvent(row), row.seq);
    };
    backlog.forEach(forward);

    if (isTerminal(run.status) || run.status === "paused") {
      send(terminalEvent(run));
      return;
    }

    if (await claimRun(id)) {
      const deps = await getDeps();
      await resumeTrip(
        runRequest,
        (event: TripEvent) => {
          if (event.type === "agent") {
            if (event.seq <= lastSeq) return;
            lastSeq = event.seq;
            send(event, event.seq);
          } else {
            send(event);
          }
        },
        deps
      );
      return;
    }

    // Another request is executing this run. Follow it from the database.
    const deadline = Date.now() + MAX_TAIL_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      (await getMessagesAfter(id, lastSeq, true)).forEach(forward);
      const status = await getRunStatus(id);
      const final = terminalEvent(status);
      if (final) {
        (await getMessagesAfter(id, lastSeq, true)).forEach(forward);
        send(final);
        return;
      }
    }
  });
});
