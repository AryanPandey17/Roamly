"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BudgetSnapshot } from "@/orchestrator";

export type FeedEvent = {
  seq: number;
  agent: string;
  kind: string;
  round?: number | null;
  text: string;
  data?: Record<string, unknown> | null;
};

type Phase = "live" | "done" | "paused" | "failed";

const AGENTS = [
  { id: "supervisor", name: "Supervisor", role: "Executive", tone: "bg-agent-supervisor" },
  { id: "logistics", name: "Logistics", role: "Realist", tone: "bg-agent-logistics" },
  { id: "recommendations", name: "Recommendations", role: "Dreamer", tone: "bg-agent-recommendations" },
  { id: "budget", name: "Budget", role: "Skeptic", tone: "bg-agent-budget" },
] as const;

const KIND_LABEL: Record<string, string> = {
  proposal: "Proposal",
  rejection: "Rejected",
  revision: "Revision",
  approval: "Approved",
  mediation: "Mediation",
  compromise: "Compromise",
  final: "Final",
  error: "Error",
};

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
};

function BudgetMeter({ budget }: { budget: BudgetSnapshot | null }) {
  if (!budget) {
    return <p className="text-sm text-muted">Waiting for the first budget audit.</p>;
  }
  const over = budget.total > budget.limit;
  const percent = Math.min(100, Math.round((budget.total / budget.limit) * 100));
  const rows = [
    ["Flights", budget.breakdown.flights],
    ["Stay", budget.breakdown.stay],
    ["Activities", budget.breakdown.activities],
    ["Food (estimate)", budget.breakdown.food],
    ["Local transport (estimate)", budget.breakdown.localTransport],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-lg font-semibold">
          {money(budget.total, budget.currency)}{" "}
          <span className="text-sm font-normal text-muted">of {money(budget.limit, budget.currency)}</span>
        </p>
        <span className={cn("text-sm font-medium", over ? "text-danger" : "text-success")}>
          {over ? `Over by ${money(budget.overBy, budget.currency)}` : "Within budget"}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={budget.limit}
        aria-valuenow={Math.round(budget.total)}
        className="h-2 overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", over ? "bg-danger" : "bg-success")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, amount]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right tabular-nums">{money(amount, budget.currency)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The live negotiation view. Starts from the events already stored, then
 * follows the run over Server-Sent Events. Reconnects resume from the last
 * sequence number, so nothing is shown twice.
 */
export function Negotiation({
  runId,
  initialEvents,
  initialPhase,
  initialNotice,
  maxRejections,
}: {
  runId: string;
  initialEvents: FeedEvent[];
  initialPhase: Phase;
  initialNotice: string | null;
  maxRejections: number;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [attempt, setAttempt] = useState(0);
  const [resuming, setResuming] = useState(false);
  const lastSeq = useRef(initialEvents.at(-1)?.seq ?? -1);
  const feedEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "live") return;
    const source = new EventSource(`/api/runs/${runId}/stream?after=${lastSeq.current}`);

    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (event.type === "agent") {
        if (event.seq <= lastSeq.current) return;
        lastSeq.current = event.seq;
        setEvents((current) => [...current, event]);
        return;
      }
      // Terminal events: stop the browser from reconnecting.
      source.close();
      if (event.type === "done") {
        setPhase("done");
        router.refresh(); // load the saved itinerary
      } else if (event.type === "paused") {
        setPhase("paused");
        setNotice(event.message);
      } else {
        setPhase("failed");
        setNotice(event.message);
      }
    };
    // On a dropped connection the browser reconnects by itself and sends Last-Event-ID.
    return () => source.close();
  }, [phase, runId, router, attempt]);

  useEffect(() => {
    if (phase === "live") feedEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [events.length, phase]);

  const budget = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const snapshot = events[i].data?.budget as BudgetSnapshot | undefined;
      if (snapshot) return snapshot;
    }
    return null;
  }, [events]);

  const rejections = events.filter((e) => e.kind === "rejection").length;
  const assumptions = (events.find((e) => Array.isArray(e.data?.assumptions))?.data?.assumptions ?? []) as string[];
  const lastByAgent = new Map(events.map((e) => [e.agent, e]));
  const lastModel = [...events].reverse().find((e) => e.data?.model)?.data?.model as
    | { model: string; provider: string; depth: number }
    | undefined;

  async function resume() {
    setResuming(true);
    const response = await fetch(`/api/runs/${runId}/resume`, { method: "POST" });
    setResuming(false);
    if (!response.ok) {
      setNotice("Could not resume. Try again in a moment.");
      return;
    }
    setNotice(null);
    setPhase("live");
    setAttempt((n) => n + 1);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-sm font-medium">Budget</h2>
          <BudgetMeter budget={budget} />
          <p className="text-xs text-muted">
            Rejections: {Math.min(rejections, maxRejections)} of {maxRejections}
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-medium">Agents</h2>
          <ul className="space-y-2">
            {AGENTS.map((agent) => {
              const last = lastByAgent.get(agent.id);
              return (
                <li key={agent.id} className="flex items-center gap-3 text-sm">
                  <span aria-hidden className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold text-white", agent.tone)}>
                    {agent.name[0]}
                  </span>
                  <span className="flex-1">
                    {agent.name} <span className="text-muted">· {agent.role}</span>
                  </span>
                  <span className="text-xs text-muted">{last ? (KIND_LABEL[last.kind] ?? "Active") : "Waiting"}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        {assumptions.length > 0 ? (
          <Card className="space-y-2">
            <h2 className="text-sm font-medium">Assumptions</h2>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
              {assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Negotiation</h2>
          {phase === "live" ? (
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="size-2 animate-pulse rounded-full bg-success motion-reduce:animate-none" /> Live
            </span>
          ) : null}
        </div>

        {(phase === "paused" || phase === "failed") && notice ? (
          <div role="alert" className="space-y-3 rounded-md border border-border p-3 text-sm">
            <p className={phase === "failed" ? "text-danger" : undefined}>{notice}</p>
            {phase === "paused" ? (
              <Button onClick={resume} disabled={resuming}>
                {resuming ? "Resuming…" : "Resume"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {events.length === 0 ? (
          <p className="text-sm text-muted">Waiting for the Supervisor to read the request.</p>
        ) : (
          <ol aria-live="polite" className="space-y-3">
            {events.map((event) => {
              const agent = AGENTS.find((a) => a.id === event.agent);
              const option = event.data?.option as
                | { title: string; price: number; currency: string; facts: string[] }
                | undefined;
              const fallback = event.data?.fallback as string | undefined;
              return (
                <li key={event.seq} className="flex gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-white",
                      agent?.tone ?? "bg-muted"
                    )}
                  >
                    {(agent?.name ?? "S")[0]}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="font-medium text-foreground">{agent?.name ?? "System"}</span>
                      {KIND_LABEL[event.kind] ? (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5",
                            event.kind === "rejection" || event.kind === "error"
                              ? "border-danger text-danger"
                              : event.kind === "approval"
                                ? "border-success text-success"
                                : "border-border"
                          )}
                        >
                          {KIND_LABEL[event.kind]}
                        </span>
                      ) : null}
                      {event.round ? <span>Round {event.round}</span> : null}
                    </p>
                    <p className="text-sm">{event.text}</p>
                    {option ? (
                      <div className="rounded-md border border-border p-2 text-sm">
                        <p className="font-medium">
                          {option.title} · {money(option.price, option.currency)}
                        </p>
                        <p className="text-xs text-muted">{option.facts.join(" · ")}</p>
                      </div>
                    ) : null}
                    {fallback ? (
                      <p className="text-xs text-muted">Chosen by rule, not by the model: {fallback}.</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={feedEnd} />

        {lastModel ? (
          <p className="border-t border-border pt-2 text-xs text-muted">
            Last answer from {lastModel.model} via {lastModel.provider}
            {lastModel.depth > 0 ? ` (fallback ${lastModel.depth})` : ""}.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
