import type { Metadata } from "next";
import { completeOnboarding, skipOnboarding } from "../account-actions";
import { SubmitButton } from "@/components/form-status";
import { PreferencesForm } from "@/components/preferences-form";
import { Card } from "@/components/ui/card";
import { getPreferences } from "@/server/account";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const preferences = await getPreferences(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">A few defaults</h1>
        <p className="text-sm text-muted">
          These fill the gaps when a trip request leaves something out. Everything is optional and can be changed
          in Settings.
        </p>
      </div>
      <Card>
        <PreferencesForm preferences={preferences} action={completeOnboarding} submitLabel="Save and continue" />
      </Card>
      <form action={skipOnboarding}>
        <SubmitButton variant="ghost" pendingLabel="Skipping…" className="px-0">
          Skip for now
        </SubmitButton>
      </form>
    </div>
  );
}
