import { cn } from "@/lib/utils";

/** Placeholder block shown while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--border)_50%,var(--surface-2)_75%)] bg-[length:200%_100%]",
        className
      )}
    />
  );
}
