"use client";

import { useActionState } from "react";
import { signup } from "../actions";
import { FormMessage, SubmitButton } from "@/components/form-status";
import { Field, Input } from "@/components/ui/field";

export function SignupForm() {
  const [state, action] = useActionState(signup, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
