"use client";

import { useActionState } from "react";
import { saveProfile } from "../account-actions";
import { FormMessage, SubmitButton } from "@/components/form-status";
import { Field, Input } from "@/components/ui/field";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState(saveProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="full_name">
          <Input id="full_name" name="full_name" defaultValue={fullName} required />
        </Field>
        <Field label="Email" htmlFor="email" hint="Email cannot be changed here.">
          <Input id="email" value={email} readOnly disabled />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
