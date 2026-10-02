"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/components/form-status";
import { Field, Input, Select } from "@/components/ui/field";
import { BUDGET_STYLES, CURRENCY_OPTIONS, INTEREST_OPTIONS, PACES } from "@/lib/preferences";
import type { Tables } from "@/types/database";

const BUDGET_LABEL = { saver: "Saver", balanced: "Balanced", comfort: "Comfort" } as const;
const PACE_LABEL = { relaxed: "Relaxed", balanced: "Balanced", packed: "Packed" } as const;

function Choice({
  name,
  value,
  label,
  type,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  type: "radio" | "checkbox";
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      {label}
    </label>
  );
}

export function PreferencesForm({
  preferences,
  action,
  submitLabel,
}: {
  preferences: Tables<"user_preferences"> | null;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const currencies = Array.from(new Set([...(preferences ? [preferences.currency] : []), ...CURRENCY_OPTIONS]));
  const interests = new Set(preferences?.interests ?? []);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Home city" htmlFor="home_city" hint="Used as the default departure point.">
          <Input id="home_city" name="home_city" defaultValue={preferences?.home_city ?? ""} placeholder="Mumbai" />
        </Field>
        <Field label="Currency" htmlFor="currency" hint="Budgets and totals are shown in this currency.">
          <Select id="currency" name="currency" defaultValue={preferences?.currency ?? "INR"}>
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Budget style</legend>
        <div className="flex flex-wrap gap-2">
          {BUDGET_STYLES.map((value) => (
            <Choice
              key={value}
              type="radio"
              name="budget_style"
              value={value}
              label={BUDGET_LABEL[value]}
              defaultChecked={(preferences?.budget_style ?? "balanced") === value}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Travel pace</legend>
        <div className="flex flex-wrap gap-2">
          {PACES.map((value) => (
            <Choice
              key={value}
              type="radio"
              name="pace"
              value={value}
              label={PACE_LABEL[value]}
              defaultChecked={(preferences?.pace ?? "balanced") === value}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((value) => (
            <Choice
              key={value}
              type="checkbox"
              name="interests"
              value={value}
              label={value}
              defaultChecked={interests.has(value)}
            />
          ))}
        </div>
      </fieldset>

      <Field label="Dietary notes" htmlFor="dietary" hint="Optional. Separate with commas, for example: vegetarian, no pork.">
        <Input id="dietary" name="dietary" defaultValue={(preferences?.dietary ?? []).join(", ")} />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
