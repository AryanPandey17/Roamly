"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";

/** Share, export and print. Every action here runs only when the user clicks it. */
export function TripActions({ tripId, initialToken }: { tripId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : null;

  async function call(method: "POST" | "DELETE") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/trips/${tripId}/share`, { method });
      if (!response.ok) throw new Error();
      setToken(method === "POST" ? (await response.json()).share.token : null);
      setCopied(false);
    } catch {
      setError("That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        {token ? (
          <Button variant="secondary" onClick={() => call("DELETE")} disabled={busy}>
            Stop sharing
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => call("POST")} disabled={busy}>
            {busy ? "Creating link…" : "Share"}
          </Button>
        )}
        <a className={buttonClass("secondary")} href={`/api/trips/${tripId}/export?format=ics`}>
          Add to calendar
        </a>
        <a className={buttonClass("secondary")} href={`/api/trips/${tripId}/export?format=md`}>
          Download markdown
        </a>
        <Button variant="secondary" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>

      {link ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Anyone with this link can view the itinerary:</span>
          <code className="break-all rounded-md border border-border px-2 py-1 font-mono text-xs">{link}</code>
          <Button variant="ghost" onClick={copy} className="h-8 px-2">
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
