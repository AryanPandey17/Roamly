import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getPreferences } from "@/server/account";
import { requireUser } from "@/server/auth";
import { NewTripForm } from "./new-trip-form";

export const metadata: Metadata = { title: "New trip" };

export default async function NewTripPage() {
  const user = await requireUser();
  const preferences = await getPreferences(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Where to, and how much?</h1>
        <p className="text-muted">One sentence is enough. Include a total budget so the agents have a limit to argue over.</p>
      </div>
      <Card>
        <NewTripForm defaultCurrency={preferences?.currency ?? "INR"} homeCity={preferences?.home_city ?? null} />
      </Card>
    </div>
  );
}
