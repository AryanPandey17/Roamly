import { cn } from "@/lib/utils";

/** Wordmark with a small route mark: two stops joined by a path. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" className="size-6 text-primary" fill="none" aria-hidden>
        <path d="M5 18c0-7 14-5 14-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" />
        <circle cx="5" cy="18" r="3" fill="currentColor" />
        <circle cx="19" cy="6" r="3" className="text-accent" fill="currentColor" />
      </svg>
      Roamly
    </span>
  );
}
