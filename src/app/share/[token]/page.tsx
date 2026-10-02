import type { Metadata } from "next";
import Link from "next/link";
import { ItineraryView } from "@/components/trip/itinerary";
import { Card } from "@/components/ui/card";
import { getSharedTrip } from "@/server/share";

export const metadata: Metadata = { title: "Shared trip", robots: { index: false } };

/** Public, read-only view of a shared itinerary. No account needed; the token is the key. */
export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedTrip(token);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/" className="font-semibold">
          Roamly
        </Link>
      </p>
      {shared ? (
        <>
          <h1 className="text-2xl font-semibold">{shared.title}</h1>
          <ItineraryView itinerary={shared.itinerary} days={shared.days} items={shared.items} />
        </>
      ) : (
        <Card className="space-y-2">
          <p className="font-medium">This link is no longer active</p>
          <p className="text-sm text-muted">The owner may have stopped sharing this trip.</p>
        </Card>
      )}
    </main>
  );
}
