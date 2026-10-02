import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { ItineraryBoard } from "@/components/trip/itinerary";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSharedTrip } from "@/server/share";

export const metadata: Metadata = { title: "Shared trip", robots: { index: false } };

/** Public, read-only view of a shared itinerary. No account needed; the token is the key. */
export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedTrip(token);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Roamly home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/signup" className={buttonClass("primary", undefined, "sm")}>
              Plan your own
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        {shared ? (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted">Shared itinerary</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{shared.title}</h1>
            </div>
            <ItineraryBoard itinerary={shared.itinerary} days={shared.days} items={shared.items} />
          </>
        ) : (
          <Card className="mx-auto max-w-md space-y-2 text-center">
            <p className="font-display text-xl font-extrabold">This link is no longer active</p>
            <p className="text-sm text-muted">The owner may have stopped sharing this trip.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
