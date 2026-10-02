import type { Metadata } from "next";
import Link from "next/link";
import { savePreferences } from "../account-actions";
import { PreferencesForm } from "@/components/preferences-form";
import { ThemeToggle } from "@/components/theme";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPreferences, getProfile } from "@/server/account";
import { requireUser } from "@/server/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, preferences] = await Promise.all([getProfile(user.id), getPreferences(user.id)]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Profile</h2>
        <Card>
          <ProfileForm fullName={profile?.full_name ?? ""} email={profile?.email ?? user.email ?? ""} />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Travel preferences</h2>
        <Card>
          <PreferencesForm preferences={preferences} action={savePreferences} submitLabel="Save preferences" />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Appearance</h2>
        <Card className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Light, dark, or follow your device. Saved in this browser.</p>
          <ThemeToggle />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Security</h2>
        <Card className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Set a new password for this account.</p>
          <Link href="/auth/update-password" className={buttonClass("secondary")}>
            Change password
          </Link>
        </Card>
      </section>
    </div>
  );
}
