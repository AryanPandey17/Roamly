"use client";

import { ArrowRight, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";
import { money, shortDate, STATUS } from "./format";

export type TripCard = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_amount: number | null;
  currency: string | null;
  total_cost: number | null;
  status: Enums<"trip_status">;
};

export function TripList({ trips }: { trips: TripCard[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const visible = q ? trips.filter((t) => `${t.title} ${t.destination ?? ""}`.toLowerCase().includes(q)) : trips;

  async function remove(trip: TripCard) {
    if (!window.confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    setError(null);
    const response = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("That trip could not be deleted. Try again.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {trips.length > 3 ? (
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="trip-search" className="sr-only">
            Search trips
          </label>
          <Input id="trip-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search trips" className="pl-9" />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No trips match “{query}”.</p>
      ) : (
        <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", pending && "opacity-70")}>
          {visible.map((trip) => {
            const status = STATUS[trip.status];
            return (
              <li key={trip.id}>
                <Card className="group relative flex h-full flex-col gap-3 transition hover:-translate-y-0.5 hover:border-foreground/30">
                  <div className="flex items-start justify-between gap-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <button
                      type="button"
                      onClick={() => void remove(trip)}
                      aria-label={`Delete ${trip.title}`}
                      className="relative z-10 grid size-7 place-items-center rounded-full text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <h2 className="font-display text-xl font-extrabold leading-snug">
                    <Link href={`/trips/${trip.id}`} className="after:absolute after:inset-0">
                      {trip.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted">
                    {[
                      trip.destination,
                      trip.start_date && trip.end_date ? `${shortDate(trip.start_date)} to ${shortDate(trip.end_date)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Details arrive once the request is read."}
                  </p>
                  <div className="mt-auto flex items-end justify-between pt-2 text-sm">
                    <span className="text-muted">
                      {trip.total_cost !== null && trip.currency ? (
                        <>
                          <span className="font-medium text-foreground">{money(trip.total_cost, trip.currency)}</span>
                          {trip.budget_amount ? ` of ${money(trip.budget_amount, trip.currency)}` : ""}
                        </>
                      ) : trip.budget_amount && trip.currency ? (
                        `${money(trip.budget_amount, trip.currency)} budget`
                      ) : null}
                    </span>
                    <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
