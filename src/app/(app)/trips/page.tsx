import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TripList } from "@/components/trip/trip-list";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listTrips } from "@/server/account";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage() {
  const user = await requireUser();
  const trips = await listTrips(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your trips</h1>
          <p className="text-sm text-muted">
            {trips.length === 0 ? "Nothing planned yet." : `${trips.length} trip${trips.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/trips/new" className={buttonClass()}>
          <Plus className="size-4" aria-hidden /> Plan a trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <Card className="mx-auto max-w-xl space-y-4 py-12 text-center">
          <p className="font-display text-2xl font-semibold">Where to first?</p>
          <p className="mx-auto max-w-sm text-sm text-muted">
            Give a destination, a length and a total budget. Three agents will argue it out and hand you a plan that
            fits.
          </p>
          <Link href="/trips/new" className={buttonClass()}>
            Plan your first trip
          </Link>
        </Card>
      ) : (
        <TripList trips={trips} />
      )}
    </div>
  );
}
