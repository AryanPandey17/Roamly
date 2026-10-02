// The negotiation as a LangGraph state machine. Edges are fixed and routing
// is a pure function of state: no model decides who speaks next.

import { END, START, StateGraph, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { budgetAudit, compromise } from "./agents/budget";
import { logisticsPropose, logisticsRevise } from "./agents/logistics";
import { recommendationsPropose, recommendationsRevise } from "./agents/recommendations";
import type { AgentContext } from "./agents/runner";
import { finalize, mediate, parseRequest } from "./agents/supervisor";
import { LIMITS } from "./config";
import { RequestError } from "./errors";
import type { AgentEventInput, AgentName } from "./events";
import type { Deps } from "./ports";
import { TripState, type TripStateType, type TripStateUpdate } from "./state";

type NodeFn = (state: TripStateType, ctx: AgentContext) => Promise<TripStateUpdate> | TripStateUpdate;

/** Where the graph goes after an audit. Exported so the rule is easy to read and check. */
export function routeAfterAudit(state: TripStateType): "finalize" | "mediate" | "compromise" {
  if (state.budget.status === "approved") return "finalize";
  // Stop negotiating when the cap is hit, nothing is left to ask for, or the request budget is spent.
  if (state.negotiation.rejections >= LIMITS.maxRejections) return "compromise";
  if (!state.negotiation.instruction) return "compromise";
  if (state.usage.llmCalls >= LIMITS.maxLlmCallsPerRun) return "compromise";
  return "mediate";
}

export function routeAfterMediate(state: TripStateType): "logistics_revise" | "recs_revise" {
  return state.negotiation.instruction?.target === "logistics" ? "logistics_revise" : "recs_revise";
}

export function buildGraph(deps: Deps) {
  /** Wraps an agent function as a node: builds its context and wires event emission. */
  const node = (agent: AgentName, fn: NodeFn) => async (state: TripStateType, config: LangGraphRunnableConfig) => {
    const ctx: AgentContext = {
      deps,
      meta: { runId: state.runId, userId: state.userId, agent },
      meter: { llmCalls: 0, toolCalls: 0 },
      llmBudget: Math.max(0, LIMITS.maxLlmCallsPerRun - state.usage.llmCalls),
      emit: (event: AgentEventInput) => config.writer?.(event),
    };
    return fn(state, ctx);
  };

  /** Both proposals must have produced something before Budget can price the plan. */
  const audit: NodeFn = (state, ctx) => {
    if (state.flights.candidates.length === 0) {
      throw new RequestError("no_flights", "No flights were found for this route and these dates. Try other dates.");
    }
    if (state.stay.candidates.length === 0) {
      throw new RequestError("no_stays", "No places to stay were found for these dates. Try other dates.");
    }
    return budgetAudit(state, ctx);
  };

  return new StateGraph(TripState)
    .addNode("parse_request", node("supervisor", parseRequest))
    .addNode("logistics_propose", node("logistics", logisticsPropose))
    .addNode("recs_propose", node("recommendations", recommendationsPropose))
    .addNode("budget_audit", node("budget", audit))
    .addNode("mediate", node("supervisor", mediate))
    .addNode("logistics_revise", node("logistics", logisticsRevise))
    .addNode("recs_revise", node("recommendations", recommendationsRevise))
    .addNode("compromise", node("supervisor", compromise))
    .addNode("finalize", node("supervisor", finalize))
    .addEdge(START, "parse_request")
    // Two outgoing edges: Logistics and Recommendations run in the same step.
    .addEdge("parse_request", "logistics_propose")
    .addEdge("parse_request", "recs_propose")
    // Both finish in that same step, so Budget runs once, in the next step, with both results.
    .addEdge("logistics_propose", "budget_audit")
    .addEdge("recs_propose", "budget_audit")
    .addConditionalEdges("budget_audit", routeAfterAudit, ["finalize", "mediate", "compromise"])
    .addConditionalEdges("mediate", routeAfterMediate, ["logistics_revise", "recs_revise"])
    .addEdge("logistics_revise", "budget_audit")
    .addEdge("recs_revise", "budget_audit")
    .addEdge("compromise", "finalize")
    .addEdge("finalize", END)
    .compile({ checkpointer: deps.checkpointer });
}
