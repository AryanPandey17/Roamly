import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "New trip" };

// The prompt form and the live negotiation view are built in Phase 4, once
// the orchestrator exists. This page keeps the route and navigation real.
export default function NewTripPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plan a trip</h1>
      <Card className="space-y-2">
        <p className="font-medium">Planning is not wired up yet</p>
        <p className="text-sm text-muted">
          Accounts, preferences and the database are ready. The agent orchestrator that turns a prompt into an
          itinerary is the next phase of the build.
        </p>
      </Card>
    </div>
  );
}
