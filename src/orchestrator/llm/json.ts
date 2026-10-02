import type { AIMessage } from "@langchain/core/messages";
import type { z } from "zod";

/** Plain text of a model reply, whatever shape the provider used for content. */
export function textOf(message: AIMessage): string {
  const { content } = message;
  if (typeof content === "string") return content;
  return content
    .map((part) => (typeof part === "string" ? part : "text" in part && typeof part.text === "string" ? part.text : ""))
    .join("");
}

/**
 * Pulls the first JSON object out of a model reply. Free models wrap JSON in
 * prose, code fences or <think> blocks, so be forgiving about the wrapper and
 * strict about the content (the caller validates with Zod).
 */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : cleaned;

  const start = body.indexOf("{");
  if (start === -1) throw new Error("No JSON object in the reply.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(body.slice(start, i + 1));
    }
  }
  throw new Error("Unterminated JSON object in the reply.");
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseReply<S extends z.ZodType>(text: string, schema: S): Parsed<z.infer<S>> {
  try {
    const result = schema.safeParse(extractJson(text));
    if (result.success) return { ok: true, value: result.data };
    return { ok: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
