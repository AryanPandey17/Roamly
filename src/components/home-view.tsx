import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { ItineraryArt, PlacesArt, PreferencesArt, SavedArt } from "@/components/illustrations";
import { TripComposer } from "@/components/trip-composer";
import { money, shortDate, STATUS } from "@/components/trip/format";
import type { TripCard } from "@/components/trip/trip-list";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The signed-in home screen: a greeting, four big doors, recent trips, and the composer. */
export function HomeView({
  firstName,
  onboarded,
  trips,
  savedCount,
}: {
  firstName: string;
  onboarded: boolean;
  trips: TripCard[];
  savedCount: number;
}) {
  const cards = [
    {
      href: "/trips/new",
      title: "Plan a trip",
      photo: "photo-ember",
      art: <ItineraryArt />,
    },
    {
      href: "/trips",
      title: trips.length ? `Your trips (${trips.length})` : "Your trips",
      photo: "photo-navy",
      art: <PlacesArt />,
    },
    {
      href: "/saved",
      title: savedCount ? `Saved (${savedCount})` : "Saved flights, stays and places",
      photo: "photo-azure",
      art: <SavedArt />,
    },
    {
      href: onboarded ? "/settings" : "/onboarding",
      title: onboarded ? "Travel preferences" : "Finish setting up your preferences",
      photo: "photo-moss",
      art: <PreferencesArt />,
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col gap-10">
      <header className="space-y-5">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-foreground text-background">
          <Sparkles className="size-6" />
        </span>
        <h1 className="max-w-3xl font-display text-[clamp(1.7rem,3.2vw,2.3rem)] font-bold leading-tight">
          Hey {firstName}, where to next? Tell me the place and the budget, and four agents will work out the rest.
        </h1>
        {onboarded ? null : (
          <Link href="/onboarding" className={buttonClass("primary", "px-8", "lg")}>
            Set up preferences
          </Link>
        )}
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <li key={card.href + card.title}>
            <Link
              href={card.href}
              className={cn(
                "photo group flex h-64 flex-col justify-between rounded-[18px] p-5 text-white transition-transform hover:-translate-y-1",
                card.photo
              )}
            >
              <div className="grid flex-1 place-items-center transition-transform group-hover:scale-105">{card.art}</div>
              <span className="font-display text-[1.25rem] font-bold leading-snug">{card.title}</span>
            </Link>
          </li>
        ))}
      </ul>

      {trips.length > 0 ? (
        <section className="rounded-[20px] border border-border p-6 sm:p-8" aria-labelledby="recent-heading">
          <div className="grid gap-6 md:grid-cols-[1fr_1.6fr] md:items-center">
            <h2 id="recent-heading" className="font-display text-[1.7rem] font-bold leading-tight">
              Pick up where
              <br />
              you left off
            </h2>
            <ul className="divide-y divide-border">
              {trips.slice(0, 3).map((trip) => (
                <li key={trip.id}>
                  <Link href={`/trips/${trip.id}`} className="group flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{trip.title}</span>
                      <span className="block truncate text-sm text-muted">
                        {[
                          trip.start_date ? shortDate(trip.start_date) : null,
                          trip.total_cost !== null && trip.currency ? money(trip.total_cost, trip.currency) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "In progress"}
                      </span>
                    </span>
                    <Badge tone={STATUS[trip.status].tone}>{STATUS[trip.status].label}</Badge>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* The composer stays in reach; the fade keeps content from showing through it. */}
      <div className="sticky bottom-16 z-10 -mx-4 mt-auto bg-gradient-to-t from-background from-70% to-transparent px-4 pb-3 pt-12 lg:bottom-0">
        <div className="mx-auto max-w-3xl">
          <TripComposer />
        </div>
      </div>
    </div>
  );
}
