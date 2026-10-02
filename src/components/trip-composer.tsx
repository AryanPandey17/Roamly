"use client";

import { ArrowUp, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The quick way to start a trip: one sentence, then straight to the live negotiation. */
export function TripComposer() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (prompt.trim().length < 3 || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, hints: {} }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Could not start planning.");
      router.push(`/trips/${body.tripId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start planning.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="rounded-[26px] border border-border bg-surface p-3 shadow-card focus-within:border-foreground/40">
        <label htmlFor="composer" className="sr-only">
          Describe your trip
        </label>
        <textarea
          id="composer"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Describe a trip: where, how long, and your total budget"
          className="block w-full resize-none bg-transparent px-3 pt-2 text-[1.05rem] placeholder:text-muted focus:outline-none"
        />
        <div className="flex items-center justify-between px-1 pt-1">
          <Link
            href="/trips/new"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-surface-2 px-3 text-xs font-medium text-muted hover:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden /> Add details
          </Link>
          <button
            type="submit"
            disabled={pending || prompt.trim().length < 3}
            aria-label="Start planning"
            className="grid size-10 place-items-center rounded-full bg-foreground text-background transition-colors hover:bg-accent-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="px-3 text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="px-3 text-center text-xs text-muted">
          Roamly can make mistakes. Prices are live search results; estimates are labelled.
        </p>
      )}
    </form>
  );
}
