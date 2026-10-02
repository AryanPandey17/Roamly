import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TripActions } from "@/components/trip/actions";
import { ItineraryView } from "@/components/trip/itinerary";
import { Negotiation, type FeedEvent } from "@/components/trip/negotiation";
import { LIMITS } from "@/orchestrator/config";
import { requireUser } from "@/server/auth";
import { getActiveShare } from "@/server/share";
import { getTripDetail } from "@/server/trips";

export const metadata: Metadata = { title: "Trip" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const detail = await getTripDetail(id);
  if (!detail) notFound();
  const { trip, run, request, itinerary, days, items, messages } = detail;
  const share = itinerary ? await getActiveShare(trip.id) : null;

  const phase =
    !run || run.status === "queued" || run.status === "running"
      ? "live"
      : run.status === "paused"
        ? "paused"
        : run.status === "failed"
          ? "failed"
          : "done";

  const events: FeedEvent[] = messages.map((m) => ({
    seq: m.seq,
    agent: m.agent,
    kind: m.kind,
    round: m.round,
    text: m.content,
    data: m.data as FeedEvent["data"],
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{trip.title}</h1>
        {request ? (
          <p className="text-sm text-muted">“{request.raw_prompt}”</p>
        ) : null}
      </header>

      {run ? (
        <div className="print:hidden">
          <Negotiation
            key={run.id}
            runId={run.id}
            initialEvents={events}
            initialPhase={phase}
            initialNotice={run.error_message}
            maxRejections={LIMITS.maxRejections}
          />
        </div>
      ) : null}

      {itinerary ? (
        <>
          <TripActions tripId={trip.id} initialToken={share?.token ?? null} />
          <ItineraryView itinerary={itinerary} days={days} items={items} />
        </>
      ) : null}

      {run ? (
        <p className="text-xs text-muted print:hidden">
          <Link href={`/debug/runs/${run.id}`} className="underline">
            Model and tool calls for this run
          </Link>
        </p>
      ) : null}
    </div>
  );
}
