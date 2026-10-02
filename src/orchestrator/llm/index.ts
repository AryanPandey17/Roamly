// The only place that knows about LLM providers. Agents ask for a role
// ("reasoning", "worker", "fast") and get an answer; which model served it is
// decided here from config/models.json.

import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import { RunnableLambda, type Runnable } from "@langchain/core/runnables";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { LIMITS, loadRegistry, type ModelRegistry, type ModelRole, type ModelTier } from "../config";
import { ProviderExhaustedError } from "../errors";
import type { LlmCallMeta, LlmPort, LlmResult, TelemetryPort } from "../ports";
import { RateLimiter } from "./limiter";

type Env = Record<string, string | undefined>;
type TierInput = { messages: BaseMessage[]; meta: LlmCallMeta };
type TierOutput = LlmResult;

/** Thrown inside a tier to move on to the next one without calling the provider. */
class TierSkipped extends Error {}

const statusOf = (error: unknown): number | undefined => {
  const e = error as { status?: number; response?: { status?: number } } | null;
  return e?.status ?? e?.response?.status;
};

const classify = (error: unknown): "timeout" | "rate_limited" | "error" => {
  const status = statusOf(error);
  const message = error instanceof Error ? error.message : String(error);
  if (status === 429) return "rate_limited";
  if (/timeout|timed out|aborted/i.test(message)) return "timeout";
  return "error";
};

export function createLlm(options: { telemetry: TelemetryPort; env?: Env; registry?: ModelRegistry }): LlmPort {
  const env = options.env ?? process.env;
  const registry = options.registry ?? loadRegistry();
  const { telemetry } = options;

  // One limiter per provider, shared by all roles, agents and branches.
  const limiters = new Map<string, RateLimiter>();
  const limiterFor = (provider: string) => {
    let limiter = limiters.get(provider);
    if (!limiter) {
      limiter = new RateLimiter(registry.providers[provider].requestsPerMinute);
      limiters.set(provider, limiter);
    }
    return limiter;
  };

  // Models that answered "no such model" during this process. Free model
  // lists rotate; a dead id is skipped until the server restarts.
  const dead = new Set<string>();

  function buildModel(tier: ModelTier, models: string[]) {
    const provider = registry.providers[tier.provider];
    const modelKwargs: Record<string, unknown> = {};

    if (tier.provider === "openrouter") {
      // OpenRouter tries these in order within one request when a model is
      // rate-limited, down, over context, or moderated.
      if (models.length > 1) modelKwargs.models = models;
      // Only route to upstream providers that support everything we send (tools included).
      modelKwargs.provider = { require_parameters: true };
    }
    if (tier.provider === "nvidia" && tier.thinking !== undefined) {
      modelKwargs.chat_template_kwargs = { enable_thinking: tier.thinking };
    }

    return new ChatOpenAI({
      model: models[0],
      apiKey: env[provider.apiKeyEnv],
      configuration: {
        baseURL: provider.baseURL,
        defaultHeaders:
          tier.provider === "openrouter"
            ? { "HTTP-Referer": env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", "X-Title": "Roamly" }
            : undefined,
      },
      modelKwargs,
      temperature: 0.2,
      maxRetries: 1, // one backoff retry on 429 and 5xx; more would burn the daily quota
      timeout: LIMITS.llmTimeoutMs,
      useResponsesApi: false,
    });
  }

  /** One provider tier as a runnable: limiter, quota check, call, logging. */
  function tierRunnable(
    role: ModelRole,
    tier: ModelTier,
    depthOffset: number,
    tools: StructuredToolInterface[] | undefined
  ): Runnable<TierInput, TierOutput> {
    const provider = registry.providers[tier.provider];

    return RunnableLambda.from(async ({ messages, meta }: TierInput): Promise<TierOutput> => {
      const models = tier.models.filter((m) => !dead.has(`${tier.provider}:${m}`));
      if (!env[provider.apiKeyEnv]) throw new TierSkipped(`${provider.apiKeyEnv} is not set`);
      if (models.length === 0) throw new TierSkipped(`no live models for ${tier.provider}`);

      if (provider.dailyLimit !== null) {
        const used = await telemetry.quotaUsedToday(tier.provider).catch(() => 0);
        if (used >= provider.dailyLimit) throw new TierSkipped(`${tier.provider} daily quota reached`);
      }

      // Bind tools to the model first; the fallback wrapper cannot do it later.
      const base = buildModel(tier, models);
      const model = tools?.length ? base.bindTools(tools) : base;

      await limiterFor(tier.provider).acquire();
      const started = Date.now();
      try {
        const message = (await model.invoke(messages)) as AIMessage;
        const servedModel =
          (message.response_metadata?.model_name as string | undefined) ??
          (message.response_metadata?.model as string | undefined) ??
          models[0];
        const indexInTier = Math.max(0, models.indexOf(servedModel));
        const depth = depthOffset + indexInTier;

        await Promise.allSettled([
          telemetry.recordProviderRequest(tier.provider, false),
          telemetry.logLlmCall({
            ...meta,
            role,
            provider: tier.provider,
            requestedModel: models[0],
            servedModel,
            fallbackDepth: depth,
            promptTokens: message.usage_metadata?.input_tokens ?? null,
            completionTokens: message.usage_metadata?.output_tokens ?? null,
            latencyMs: Date.now() - started,
            status: "success",
            errorCode: null,
            errorMessage: null,
          }),
        ]);
        return { message, served: { model: servedModel, provider: tier.provider, depth } };
      } catch (error) {
        const status = statusOf(error);
        const text = error instanceof Error ? error.message : String(error);
        // "Model not found": stop offering this id for the rest of the process.
        if (status === 404 || (status === 400 && /model/i.test(text) && /not|invalid|unknown/i.test(text))) {
          dead.add(`${tier.provider}:${models[0]}`);
        }
        await Promise.allSettled([
          // Failed attempts may count toward the provider's cap, so count them too.
          telemetry.recordProviderRequest(tier.provider, true),
          telemetry.logLlmCall({
            ...meta,
            role,
            provider: tier.provider,
            requestedModel: models[0],
            servedModel: null,
            fallbackDepth: depthOffset,
            promptTokens: null,
            completionTokens: null,
            latencyMs: Date.now() - started,
            status: classify(error),
            errorCode: status ? String(status) : null,
            errorMessage: text.slice(0, 500),
          }),
        ]);
        throw error;
      }
    });
  }

  return {
    async invoke(role, messages, { tools, meta }) {
      const tiers = registry.roles[role];
      let offset = 0;
      const runnables = tiers.map((tier) => {
        const runnable = tierRunnable(role, tier, offset, tools);
        offset += tier.models.length;
        return runnable;
      });

      // LangChain's fallback mechanism: try each tier in order until one answers.
      const [first, ...rest] = runnables;
      const chain = rest.length ? first.withFallbacks({ fallbacks: rest }) : first;

      try {
        return await chain.invoke({ messages, meta });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ level: "error", where: "llm", runId: meta.runId, role, reason }));
        throw new ProviderExhaustedError();
      }
    },
  };
}
