import { ArrowLeft, CalendarDays, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TripActions } from "@/components/trip/actions";
import { money, shortDate } from "@/components/trip/format";
import { ItineraryBoard } from "@/components/trip/itinerary";
import { Negotiation, type FeedEvent } from "@/components/trip/negotiation";
import { TripWorkspace } from "@/components/trip/workspace";
import { LIMITS } from "@/orchestrator/config";
import { requireUser } from "@/server/auth";
import { listSaved } from "@/server/saved";
import { getActiveShare } from "@/server/share";
import { getTripDetail } from "@/server/trips";

export const metadata: Metadata = { title: "Trip" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const detail = await getTripDetail(id);
  if (!detail) notFound();
  const { trip, run, request, itinerary, days, items, messages } = detail;
  const [share, saved] = itinerary ? await Promise.all([getActiveShare(trip.id), listSaved(user.id)]) : [null, []];

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

  const facts = [
    trip.start_date && trip.end_date
      ? { icon: CalendarDays, text: `${shortDate(trip.start_date)} to ${shortDate(trip.end_date)}` }
      : null,
    trip.destination ? { icon: Users, text: `${trip.travellers} traveller${trip.travellers > 1 ? "s" : ""}` } : null,
    trip.budget_amount && trip.currency ? { icon: Wallet, text: `${money(trip.budget_amount, trip.currency)} budget` } : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground print:hidden">
          <ArrowLeft className="size-4" aria-hidden /> All trips
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{trip.title}</h1>
        {facts.length > 0 ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <Icon className="size-4" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        ) : null}
        {request ? <p className="max-w-2xl text-sm italic text-muted">“{request.raw_prompt}”</p> : null}
      </header>

      <TripWorkspace
        hasItinerary={Boolean(itinerary)}
        itinerary={
          itinerary ? (
            <div className="space-y-5">
              <TripActions tripId={trip.id} initialToken={share?.token ?? null} />
              <ItineraryBoard
                tripId={trip.id}
                itinerary={itinerary}
                days={days}
                items={items}
                savedKeys={saved.map((s) => `${s.provider}:${s.external_id}`)}
                editable
              />
            </div>
          ) : null
        }
        negotiation={
          run ? (
            <div className="space-y-3">
              <Negotiation
                key={run.id}
                runId={run.id}
                initialEvents={events}
                initialPhase={phase}
                initialNotice={run.error_message}
                maxRejections={LIMITS.maxRejections}
              />
              <p className="text-xs text-muted">
                <Link href={`/debug/runs/${run.id}`} className="underline">
                  Model and tool calls for this run
                </Link>
              </p>
            </div>
          ) : null
        }
      />
    </div>
  );
}
