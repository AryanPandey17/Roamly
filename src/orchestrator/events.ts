import type { CostBreakdown } from "./state";

export type AgentName = "supervisor" | "logistics" | "recommendations" | "budget" | "system";

export type MessageKind =
  | "info"
  | "proposal"
  | "rejection"
  | "revision"
  | "approval"
  | "mediation"
  | "compromise"
  | "final"
  | "error";

/** Snapshot the UI uses for the budget meter. Attached to audit events. */
export type BudgetSnapshot = {
  total: number;
  limit: number;
  currency: string;
  status: "approved" | "rejected" | "compromise";
  overBy: number;
  breakdown: CostBreakdown;
};

/** What an agent emits from inside a node. */
export type AgentEventInput = {
  agent: AgentName;
  kind: MessageKind;
  text: string;
  round?: number;
  data?: {
    budget?: BudgetSnapshot;
    /** The option being proposed, for the feed card. */
    option?: { type: "flight" | "stay" | "activities"; title: string; price: number; currency: string; facts: string[] };
    /** Set when a deterministic fallback replaced an LLM decision. */
    fallback?: string;
    /** Which model answered, and how far down the fallback list it was. */
    model?: { model: string; provider: string; depth: number };
    [key: string]: unknown;
  };
};

/** Everything the orchestrator reports to its caller. Transport-agnostic. */
export type TripEvent =
  | ({ type: "agent"; seq: number; at: string } & AgentEventInput)
  | { type: "done"; status: "completed" | "completed_over_budget"; tripId: string }
  | { type: "paused"; code: string; message: string }
  | { type: "error"; code: string; message: string };

export type OnEvent = (event: TripEvent) => void | Promise<void>;
