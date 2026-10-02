// Pings every model in config/models.json with a tiny tool-calling request
// and reports which ones answer with a valid tool call.
//
//   npm run models:check
//
// Each ping is one real request. OpenRouter's free tier allows 50 a day
// without credits, so run this when a model seems dead, not on every start.
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { loadRegistry } from "../src/orchestrator/config";

const registry = loadRegistry();
const ping = tool(async ({ city }) => `ok ${city}`, {
  name: "lookup_city",
  description: "Look up a city by name.",
  schema: z.object({ city: z.string() }),
});

// Unique provider + model pairs across all roles.
const targets = new Map<string, { provider: string; model: string; roles: string[]; thinking?: boolean }>();
for (const [role, tiers] of Object.entries(registry.roles)) {
  for (const tier of tiers) {
    for (const model of tier.models) {
      const key = `${tier.provider}:${model}`;
      const entry = targets.get(key) ?? { provider: tier.provider, model, roles: [], thinking: tier.thinking };
      entry.roles.push(role);
      targets.set(key, entry);
    }
  }
}

let failures = 0;
for (const target of targets.values()) {
  const provider = registry.providers[target.provider];
  const apiKey = process.env[provider.apiKeyEnv];
  const label = `${target.provider.padEnd(11)} ${target.model.padEnd(46)} [${target.roles.join(", ")}]`;
  if (!apiKey) {
    console.log(`SKIP  ${label}  ${provider.apiKeyEnv} is not set`);
    continue;
  }

  const model = new ChatOpenAI({
    model: target.model,
    apiKey,
    configuration: { baseURL: provider.baseURL },
    modelKwargs:
      target.provider === "openrouter"
        ? { provider: { require_parameters: true } }
        : { chat_template_kwargs: { enable_thinking: false } },
    temperature: 0,
    maxRetries: 0,
    timeout: 45_000,
    useResponsesApi: false,
  }).bindTools([ping]);

  const started = Date.now();
  try {
    const reply = await model.invoke([new HumanMessage("Use the lookup_city tool to look up Tokyo.")]);
    const call = reply.tool_calls?.[0];
    const ms = Date.now() - started;
    if (call?.name === "lookup_city" && typeof call.args?.city === "string") {
      console.log(`OK    ${label}  ${ms} ms`);
    } else {
      failures += 1;
      console.log(`WARN  ${label}  answered without a valid tool call (${ms} ms)`);
    }
  } catch (error) {
    failures += 1;
    const e = error as { status?: number; message?: string };
    console.log(`FAIL  ${label}  ${e.status ?? ""} ${String(e.message ?? error).slice(0, 140)}`);
  }
}

console.log(
  failures
    ? `\n${failures} model(s) need attention. Remove or replace them in config/models.json.`
    : "\nAll configured models answered with a tool call."
);
