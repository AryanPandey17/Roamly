"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CURRENCY_OPTIONS } from "@/lib/preferences";

const EXAMPLES = ["4 days in Tokyo, $2000 budget", "A week in Lisbon for two in March, €2500", "3 nights in Goa from Mumbai, ₹40,000"];

export function NewTripForm({ defaultCurrency, homeCity }: { defaultCurrency: string; homeCity: string | null }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const number = (name: string) => (text(name) ? Number(text(name)) : undefined);

    // Only send the optional fields that were filled in.
    const hints = Object.fromEntries(
      Object.entries({
        origin: text("origin") || undefined,
        destination: text("destination") || undefined,
        startDate: text("startDate") || undefined,
        endDate: text("endDate") || undefined,
        travellers: number("travellers"),
        budget: number("budget"),
        currency: number("budget") ? text("currency") : undefined,
      }).filter(([, value]) => value !== undefined)
    );

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, hints }),
      });
      const body = await response.json();
      if (!response.ok) {
        const details = body?.error?.details as Record<string, string[]> | undefined;
        throw new Error(details ? Object.values(details).flat()[0] : (body?.error?.message ?? "Could not start planning."));
      }
      router.push(`/trips/${body.tripId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start planning.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="prompt" className="block text-sm font-medium">
          Describe your trip
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          required
          minLength={3}
          maxLength={4000}
          rows={3}
          placeholder={EXAMPLES[0]}
          className="w-full resize-none rounded-md border border-border bg-surface p-4 text-base placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <details className="group rounded-md border border-border p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          Add details (optional)
          <ChevronDown className="size-4 text-muted transition group-open:rotate-180" aria-hidden />
        </summary>
        <p className="mt-2 text-xs text-muted">Anything you fill in here overrides what is read from the description.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="From" htmlFor="origin" hint={homeCity ? `Defaults to ${homeCity}.` : undefined}>
            <Input id="origin" name="origin" maxLength={120} placeholder={homeCity ?? "Mumbai"} />
          </Field>
          <Field label="To" htmlFor="destination">
            <Input id="destination" name="destination" maxLength={120} placeholder="Tokyo" />
          </Field>
          <Field label="Departure date" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" />
          </Field>
          <Field label="Return date" htmlFor="endDate">
            <Input id="endDate" name="endDate" type="date" />
          </Field>
          <Field label="Travellers" htmlFor="travellers">
            <Input id="travellers" name="travellers" type="number" min={1} max={20} step={1} />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <Field label="Total budget" htmlFor="budget">
              <Input id="budget" name="budget" type="number" min={1} step="any" />
            </Field>
            <Field label="Currency" htmlFor="currency">
              <Select id="currency" name="currency" defaultValue={defaultCurrency}>
                {Array.from(new Set([defaultCurrency, ...CURRENCY_OPTIONS])).map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </details>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Starting…" : "Start the negotiation"}
        {pending ? null : <ArrowRight className="size-5" aria-hidden />}
      </Button>
    </form>
  );
}
