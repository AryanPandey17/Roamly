// Shared machinery for the agents: one LLM call, and the tool-calling loop.

import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { z } from "zod";
import { LIMITS, type ModelRole } from "../config";
import { isResumable } from "../errors";
import type { AgentEventInput } from "../events";
import { parseReply, textOf } from "../llm/json";
import type { Deps, LlmCallMeta, LlmResult } from "../ports";

export type AgentContext = {
  deps: Deps;
  meta: LlmCallMeta;
  /** Requests this node has spent. Returned to state as `usage`. */
  meter: { llmCalls: number; toolCalls: number };
  /** LLM requests the run may still spend when this node started. */
  llmBudget: number;
  emit(event: AgentEventInput): void;
};

export type Decision<T> =
  | { value: T; served: LlmResult["served"]; fallback: null }
  | { value: null; served: null; fallback: string };

const budgetSpent = (ctx: AgentContext) => ctx.meter.llmCalls >= ctx.llmBudget;

async function ask(ctx: AgentContext, role: ModelRole, messages: BaseMessage[], tools?: StructuredToolInterface[]) {
  ctx.meter.llmCalls += 1;
  return ctx.deps.llm.invoke(role, messages, { tools, meta: ctx.meta });
}

/**
 * Lets the model call tools, then expects a JSON reply matching `schema`.
 *
 * Returns `value: null` with a reason when the model could not produce a
 * valid answer (malformed tool calls, invalid JSON twice, or the run's request
 * budget is spent). The caller then uses its deterministic fallback and says so
 * in the event stream. Provider outages are not swallowed: they propagate so
 * the run pauses and can be resumed.
 */
export async function decide<S extends z.ZodType>(
  ctx: AgentContext,
  options: {
    role: ModelRole;
    system: string;
    user: string;
    schema: S;
    tools?: StructuredToolInterface[];
  }
): Promise<Decision<z.infer<S>>> {
  const { role, schema, tools = [] } = options;
  const byName = new Map(tools.map((t) => [t.name, t]));
  const messages: BaseMessage[] = [new SystemMessage(options.system), new HumanMessage(options.user)];
  let repaired = false;

  for (let turn = 0; turn <= LIMITS.maxToolTurns; turn++) {
    if (budgetSpent(ctx)) return { value: null, served: null, fallback: "the run's request budget is spent" };

    // On the last turn, withhold tools so the model has to answer.
    const offerTools = tools.length > 0 && turn < LIMITS.maxToolTurns;
    const result = await ask(ctx, role, messages, offerTools ? tools : undefined);
    const reply = result.message;
    const calls = reply.tool_calls ?? [];

    if (calls.length > 0 && offerTools) {
      messages.push(reply);
      for (const call of calls) {
        const id = call.id ?? `call_${turn}_${call.name}`;
        const target = byName.get(call.name);
        if (!target) {
          messages.push(
            new ToolMessage({
              tool_call_id: id,
              content: JSON.stringify({ ok: false, error: `Unknown tool "${call.name}".` }),
            })
          );
          continue;
        }
        try {
          const output = await target.invoke({ ...call, id, type: "tool_call" });
          messages.push(
            output instanceof ToolMessage
              ? output
              : new ToolMessage({ tool_call_id: id, content: typeof output === "string" ? output : JSON.stringify(output) })
          );
        } catch (error) {
          if (isResumable(error)) throw error;
          // Malformed arguments: tell the model once, typed, and let it retry.
          messages.push(
            new ToolMessage({
              tool_call_id: id,
              content: JSON.stringify({
                ok: false,
                error: `Invalid arguments for ${call.name}: ${error instanceof Error ? error.message : String(error)}`,
              }),
            })
          );
        }
      }
      continue;
    }

    const parsed = parseReply(textOf(reply), schema);
    if (parsed.ok) return { value: parsed.value, served: result.served, fallback: null };

    if (repaired) return { value: null, served: null, fallback: `the model's reply was not valid (${parsed.error})` };
    repaired = true;
    messages.push(new AIMessage(textOf(reply) || "(empty reply)"));
    messages.push(
      new HumanMessage(`That reply was not valid: ${parsed.error}. Reply again with one JSON object only, no other text.`)
    );
  }

  return { value: null, served: null, fallback: "the model did not finish within the tool-turn limit" };
}

/** A short piece of prose from the fast model, or null if unavailable. Never throws. */
export async function narrate(ctx: AgentContext, system: string, user: string): Promise<string | null> {
  if (budgetSpent(ctx)) return null;
  try {
    const result = await ask(ctx, "fast", [new SystemMessage(system), new HumanMessage(user)]);
    const text = textOf(result.message).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    return text ? text.slice(0, 600) : null;
  } catch {
    return null;
  }
}
