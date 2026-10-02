import { signInWithGoogle } from "./actions";
import { SubmitButton } from "@/components/form-status";
import { GBadge } from "@/components/illustrations";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <SubmitButton variant="secondary" className="w-full" pendingLabel="Redirecting…">
        <GBadge /> Continue with Google
      </SubmitButton>
    </form>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
