"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BudgetSnapshot } from "@/orchestrator";
import { AGENTS, AgentAvatar, agentOf, type AgentId } from "./agents";
import { BudgetMeter } from "./budget-meter";
import { money } from "./format";

export type FeedEvent = {
  seq: number;
  agent: string;
  kind: string;
  round?: number | null;
  text: string;
  data?: Record<string, unknown> | null;
};

export type Phase = "live" | "done" | "paused" | "failed";

const KIND: Record<string, { label: string; tone: "neutral" | "success" | "danger" | "warning" | "primary" }> = {
  proposal: { label: "Proposal", tone: "primary" },
  rejection: { label: "Rejected", tone: "danger" },
  revision: { label: "Revision", tone: "primary" },
  approval: { label: "Approved", tone: "success" },
  mediation: { label: "Mediation", tone: "neutral" },
  compromise: { label: "Compromise", tone: "warning" },
  final: { label: "Final", tone: "success" },
  error: { label: "Error", tone: "danger" },
};

const ROSTER: AgentId[] = ["supervisor", "logistics", "recommendations", "budget"];

/** Which agents are expected to speak next, read off the last event. Drives the "working" indicators. */
function workingNow(events: FeedEvent[], phase: Phase): Set<string> {
  if (phase !== "live") return new Set();
  const last = events.at(-1);
  if (!last) return new Set(["supervisor"]);
  const proposals = events.filter((e) => e.kind === "proposal").map((e) => e.agent);
  switch (last.kind) {
    case "info":
      return last.agent === "supervisor" && events.length > 1 ? new Set(["logistics", "recommendations"]) : new Set(["supervisor"]);
    case "proposal":
      return proposals.includes("logistics") && proposals.includes("recommendations")
        ? new Set(["budget"])
        : new Set(["logistics", "recommendations"].filter((a) => !proposals.includes(a)));
    case "rejection":
      return new Set(["supervisor"]);
    case "mediation":
      return new Set([(last.data?.instruction as { target?: string } | undefined)?.target ?? "recommendations"]);
    case "revision":
      return new Set(["budget"]);
    case "approval":
    case "compromise":
      return new Set(["supervisor"]);
    default:
      return new Set();
  }
}

/**
 * The live negotiation. Starts from the events already stored, then follows
 * the run over Server-Sent Events. Reconnects resume from the last sequence
 * number, so nothing is shown twice.
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
  const feed = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);

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

  // Follow new messages only while the reader is at the bottom of the feed.
  useEffect(() => {
    const el = feed.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  const budget = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const snapshot = events[i].data?.budget as BudgetSnapshot | undefined;
      if (snapshot) return snapshot;
    }
    return null;
  }, [events]);

  const working = workingNow(events, phase);
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
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Budget</h2>
            <span className="text-xs text-muted">
              Rejections {Math.min(rejections, maxRejections)} of {maxRejections}
            </span>
          </div>
          {budget ? (
            <BudgetMeter breakdown={budget.breakdown} limit={budget.limit} currency={budget.currency} />
          ) : (
            <p className="text-sm text-muted">The meter starts moving after the first audit.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-medium">Agents</h2>
          <ul className="space-y-3">
            {ROSTER.map((id) => {
              const agent = AGENTS[id];
              const last = lastByAgent.get(id);
              const busy = working.has(id);
              return (
                <li key={id} className="flex items-center gap-3 text-sm">
                  <AgentAvatar agent={id} pulse={busy} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">{agent.name}</span>
                    <span className="block text-xs text-muted">{agent.role}</span>
                  </span>
                  <span className={cn("text-xs", busy ? agent.text : "text-muted")}>
                    {busy ? "Working…" : last ? (KIND[last.kind]?.label ?? "Done") : "Waiting"}
                  </span>
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

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Negotiation</h2>
          {phase === "live" ? (
            <Badge tone="success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
            </Badge>
          ) : phase === "paused" ? (
            <Badge tone="warning">Paused</Badge>
          ) : phase === "failed" ? (
            <Badge tone="danger">Stopped</Badge>
          ) : (
            <Badge>Finished</Badge>
          )}
        </div>

        {(phase === "paused" || phase === "failed") && notice ? (
          <div role="alert" className="space-y-3 rounded-md border border-border bg-surface-2 p-3 text-sm">
            <p className={phase === "failed" ? "text-danger" : undefined}>{notice}</p>
            {phase === "paused" ? (
              <Button size="sm" onClick={resume} disabled={resuming}>
                {resuming ? "Resuming…" : "Resume"}
              </Button>
            ) : null}
          </div>
        ) : null}

        <ol
          ref={feed}
          aria-live="polite"
          aria-label="Agent messages"
          onScroll={(e) => {
            const el = e.currentTarget;
            pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className={cn("space-y-4 pr-1", phase === "live" && "max-h-[32rem] overflow-y-auto")}
        >
          {events.length === 0 ? (
            <li className="text-sm text-muted">Waiting for the Supervisor to read the request.</li>
          ) : null}
          {events.map((event) => {
            const agent = agentOf(event.agent);
            const kind = KIND[event.kind];
            const option = event.data?.option as
              | { title: string; price: number; currency: string; facts: string[] }
              | undefined;
            const fallback = event.data?.fallback as string | undefined;
            return (
              <li key={event.seq} className="flex animate-rise gap-3">
                <AgentAvatar agent={event.agent} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className={cn("font-medium", agent.text)}>{agent.name}</span>
                    {kind ? <Badge tone={kind.tone}>{kind.label}</Badge> : null}
                    {event.round ? <span>Round {event.round}</span> : null}
                  </p>
                  <p className="text-sm leading-relaxed">{event.text}</p>
                  {option ? (
                    <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                      <p className="flex flex-wrap justify-between gap-2 font-medium">
                        <span>{option.title}</span>
                        <span className="tabular-nums">{money(option.price, option.currency)}</span>
                      </p>
                      <p className="text-xs text-muted">{option.facts.join(" · ")}</p>
                    </div>
                  ) : null}
                  {fallback ? <p className="text-xs text-muted">Chosen by rule, not by the model: {fallback}.</p> : null}
                </div>
              </li>
            );
          })}
          {phase === "live" && working.size > 0 ? (
            <li className="flex items-center gap-2 pl-11 text-xs text-muted">
              <span className="flex gap-1" aria-hidden>
                <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted" />
              </span>
              {[...working].map((id) => agentOf(id).name).join(" and ")} {working.size > 1 ? "are" : "is"} working
            </li>
          ) : null}
        </ol>

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
