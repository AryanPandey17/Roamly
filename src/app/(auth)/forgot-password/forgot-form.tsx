"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { FormMessage, SubmitButton } from "@/components/form-status";
import { Field, Input } from "@/components/ui/field";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
