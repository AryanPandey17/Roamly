"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Once an itinerary exists, the trip page has two views of the same trip:
 * the plan, and how the agents got there. Both stay mounted so the live
 * stream is never interrupted by switching tabs.
 */
export function TripWorkspace({
  itinerary,
  negotiation,
  hasItinerary,
}: {
  itinerary: React.ReactNode;
  negotiation: React.ReactNode;
  hasItinerary: boolean;
}) {
  const [tab, setTab] = useState<"itinerary" | "negotiation">(hasItinerary ? "itinerary" : "negotiation");
  // When the run finishes and the itinerary arrives, bring it forward once.
  const [seenItinerary, setSeenItinerary] = useState(hasItinerary);
  if (hasItinerary && !seenItinerary) {
    setSeenItinerary(true);
    setTab("itinerary");
  }

  if (!hasItinerary) return <>{negotiation}</>;

  const tabs = [
    { id: "itinerary" as const, label: "Itinerary" },
    { id: "negotiation" as const, label: "How the agents got here" },
  ];

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Trip views" className="flex gap-1 border-b border-border print:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-itinerary" aria-labelledby="tab-itinerary" hidden={tab !== "itinerary"} className="print:!block">
        {itinerary}
      </div>
      <div role="tabpanel" id="panel-negotiation" aria-labelledby="tab-negotiation" hidden={tab !== "negotiation"} className="print:hidden">
        {negotiation}
      </div>
    </div>
  );
}
