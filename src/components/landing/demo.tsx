"use client";

import { useEffect, useState } from "react";
import { AgentAvatar, agentOf } from "@/components/trip/agents";
import { BudgetMeter } from "@/components/trip/budget-meter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// An illustration of one negotiation, replayed on a loop. The figures are
// the worked example from the docs, not live data, and the card says so.

type Step = {
  agent: string;
  label?: string;
  tone?: "primary" | "danger" | "success";
  text: string;
  stay?: number;
};

const STEPS: Step[] = [
  { agent: "supervisor", text: "Parsed: Tokyo, 4 days, 1 traveller, $2,000. Asking for proposals." },
  { agent: "logistics", label: "Proposal", tone: "primary", text: "Direct flight, 8h 30m, arriving 18:00. $780 return." },
  { agent: "recommendations", label: "Proposal", tone: "primary", text: "A hotel in the centre at $320 a night, plus four activities.", stay: 960 },
  { agent: "budget", label: "Rejected", tone: "danger", text: "Total is $2,460, over by $460. Stay must be at or under $165 a night." },
  { agent: "recommendations", label: "Revision", tone: "primary", text: "Switched to a boutique hotel nearby at $150 a night.", stay: 450 },
  { agent: "budget", label: "Approved", tone: "success", text: "Total is $1,950 against $2,000. $50 to spare." },
];

const BASE = { flights: 780, activities: 420, food: 240, localTransport: 60 };

export function NegotiationDemo() {
  const [shown, setShown] = useState(STEPS.length); // full conversation until the animation starts

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // stay on the finished state
    let step = 1;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setShown(step);
      const finished = step >= STEPS.length;
      step = finished ? 1 : step + 1;
      timer = setTimeout(tick, finished ? 4200 : 1700);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  const visible = STEPS.slice(0, shown);
  const stay = [...visible].reverse().find((s) => s.stay !== undefined)?.stay ?? 0;
  const flights = shown >= 2 ? BASE.flights : 0;
  const rest = shown >= 3;
  const breakdown = {
    flights,
    stay,
    activities: rest ? BASE.activities : 0,
    food: rest ? BASE.food : 0,
    localTransport: rest ? BASE.localTransport : 0,
    total: flights + stay + (rest ? BASE.activities + BASE.food + BASE.localTransport : 0),
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">“4 days in Tokyo, $2000 budget”</p>
        <Badge>Example run</Badge>
      </div>
      <BudgetMeter breakdown={breakdown} limit={2000} currency="USD" compact />
      <ol className="mt-5 min-h-[19rem] space-y-3.5" aria-label="Example negotiation">
        {visible.map((step, i) => (
          <li key={i} className="flex animate-rise gap-3">
            <AgentAvatar agent={step.agent} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs">
                <span className={cn("font-medium", agentOf(step.agent).text)}>{agentOf(step.agent).name}</span>
                {step.label ? <Badge tone={step.tone}>{step.label}</Badge> : null}
              </p>
              <p className="text-sm leading-snug">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
