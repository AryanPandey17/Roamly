import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listTrips } from "@/server/account";
import { requireUser } from "@/server/auth";
import type { Enums } from "@/types/database";

export const metadata: Metadata = { title: "Trips" };

const STATUS_LABEL: Record<Enums<"trip_status">, string> = {
  draft: "Draft",
  planning: "Planning",
  ready: "Ready",
  over_budget: "Over budget",
  paused: "Paused",
  failed: "Failed",
};

const money = (amount: number | null, currency: string | null) =>
  amount == null || !currency
    ? null
    : new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

export default async function TripsPage() {
  const user = await requireUser();
  const trips = await listTrips(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <Link href="/trips/new" className={buttonClass()}>
          Plan a trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <Card className="space-y-3 text-center">
          <p className="font-medium">No trips yet</p>
          <p className="text-sm text-muted">Describe a trip and a budget, and the agents will work it out.</p>
          <Link href="/trips/new" className={buttonClass("secondary")}>
            Plan your first trip
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Card className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{trip.title}</h2>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {STATUS_LABEL[trip.status]}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {[
                    trip.destination,
                    trip.start_date && trip.end_date ? `${trip.start_date} to ${trip.end_date}` : null,
                    money(trip.budget_amount, trip.currency),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Details pending"}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
