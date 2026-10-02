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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Plan a trip</h1>
        <p className="text-sm text-muted">Say where, for how long and how much. Include a total budget.</p>
      </div>
      <Card>
        <NewTripForm defaultCurrency={preferences?.currency ?? "INR"} homeCity={preferences?.home_city ?? null} />
      </Card>
    </div>
  );
}
