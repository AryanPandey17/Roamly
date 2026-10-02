"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-status";
import { preferencesSchema, profilePatchSchema } from "@/lib/preferences";
import { updatePreferences, updateProfile } from "@/server/account";
import { requireUser } from "@/server/auth";

const formPreferences = preferencesSchema.omit({ theme: true });

function readPreferences(formData: FormData) {
  const list = (name: string) =>
    formData
      .getAll(name)
      .flatMap((v) => String(v).split(","))
      .map((v) => v.trim())
      .filter(Boolean);

  return formPreferences.safeParse({
    home_city: String(formData.get("home_city") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    budget_style: formData.get("budget_style"),
    pace: formData.get("pace"),
    interests: list("interests"),
    dietary: list("dietary"),
  });
}

export async function savePreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = readPreferences(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  try {
    await updatePreferences(user.id, parsed.data);
  } catch {
    return { error: "Could not save your preferences. Try again." };
  }
  revalidatePath("/settings");
  return { message: "Preferences saved." };
}

/** Onboarding: save preferences, mark the profile onboarded, go plan a trip. */
export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = readPreferences(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  try {
    await updatePreferences(user.id, parsed.data);
    await updateProfile(user.id, { onboarded_at: new Date().toISOString() });
  } catch {
    return { error: "Could not save your preferences. Try again." };
  }
  redirect("/trips/new");
}

export async function skipOnboarding() {
  const user = await requireUser();
  await updateProfile(user.id, { onboarded_at: new Date().toISOString() });
  redirect("/trips/new");
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profilePatchSchema.safeParse({ full_name: String(formData.get("full_name") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  try {
    await updateProfile(user.id, parsed.data);
  } catch {
    return { error: "Could not save your profile. Try again." };
  }
  revalidatePath("/", "layout");
  return { message: "Profile saved." };
}
