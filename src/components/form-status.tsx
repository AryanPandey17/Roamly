"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export type FormState = { error?: string; message?: string } | null;

/** Submit button that disables itself while its form's action is running. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Error or success line under a form. Announced to screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={state.error ? "text-sm text-danger" : "text-sm text-success"}>
      {state.error ?? state.message}
    </p>
  );
}
