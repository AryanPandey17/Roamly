import type { Metadata } from "next";
import { SavedList } from "@/components/saved-list";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/auth";
import { listSaved } from "@/server/saved";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const user = await requireUser();
  const saved = await listSaved(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Saved</h1>
        <p className="text-sm text-muted">Flights, stays and places you bookmarked from your itineraries.</p>
      </div>
      {saved.length === 0 ? (
        <Card className="mx-auto max-w-xl space-y-2 py-10 text-center">
          <p className="font-display text-xl font-semibold">Nothing saved yet</p>
          <p className="text-sm text-muted">Use the bookmark on any flight, stay or activity in an itinerary to keep it here.</p>
        </Card>
      ) : (
        <SavedList saved={saved} />
      )}
    </div>
  );
}
