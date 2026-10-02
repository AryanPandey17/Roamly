import { z } from "zod";
import { Constants } from "@/types/database";

// Option lists shown in onboarding and settings. Interests are free-form
// strings in the database; this is only the suggested set.
export const INTEREST_OPTIONS = [
  "Culture", "Food", "Nature", "Adventure", "History", "Art",
  "Nightlife", "Shopping", "Beaches", "Photography", "Wellness", "Technology",
] as const;

export const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "JPY", "AED", "SGD", "AUD", "CAD"] as const;

export const BUDGET_STYLES = Constants.public.Enums.budget_style;
export const PACES = Constants.public.Enums.travel_pace;
export const THEMES = Constants.public.Enums.theme_pref;

const trimmed = (max: number) => z.string().trim().max(max);

export const preferencesSchema = z.object({
  home_city: trimmed(120).transform((v) => v || null).nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code."),
  budget_style: z.enum(BUDGET_STYLES),
  pace: z.enum(PACES),
  interests: z.array(trimmed(40).min(1)).max(20),
  dietary: z.array(trimmed(40).min(1)).max(20),
  theme: z.enum(THEMES),
});

export const preferencesPatchSchema = preferencesSchema.partial();

export const profilePatchSchema = z.object({
  full_name: trimmed(120).min(1, "Name cannot be empty."),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
