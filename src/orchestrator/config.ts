import { z } from "zod";
import rawModels from "../../config/models.json";

// ---------------------------------------------------------------------------
// Negotiation and safety limits. One place, no magic numbers in the graph.
// ---------------------------------------------------------------------------
export const LIMITS = {
  /** Budget rejections before the graph routes to the Compromise node. */
  maxRejections: 3,
  /** LangGraph super-step cap. Backstop only; the counters above stop the loop first. */
  recursionLimit: 30,
  /** LLM requests one run may spend before it is forced to conclude. */
  maxLlmCallsPerRun: 20,
  /** Tool-calling turns an agent may take inside one node. */
  maxToolTurns: 3,
  /** Candidates kept in state per category. */
  maxCandidates: 8,
  llmTimeoutMs: 60_000,
  toolTimeoutMs: 15_000,
} as const;

/** How long each kind of tool result may be reused, in seconds. */
export const CACHE_TTL = {
  flights: 6 * 3600,
  hotels: 6 * 3600,
  places: 7 * 86_400,
  activityPrices: 30 * 86_400,
  dailyCosts: 30 * 86_400,
  geocode: 90 * 86_400,
  routing: 30 * 86_400,
  weather: 3 * 3600,
  fx: 12 * 3600,
  webSearch: 7 * 86_400,
} as const;

/** Assumptions used when the request leaves something out. */
export const DEFAULTS = {
  /** Days from today to the start date when no dates are given. */
  leadTimeDays: 35,
  /** Trip length in nights when no duration is given. */
  nights: 3,
  /** Activities per full day, by pace. */
  activitiesPerDay: { relaxed: 1, balanced: 1.5, packed: 2.5 },
} as const;

// ---------------------------------------------------------------------------
// Model registry (config/models.json). Free model ids rotate, so they live in
// config and are validated here instead of being scattered through code.
// ---------------------------------------------------------------------------
const providerSchema = z.object({
  baseURL: z.url(),
  apiKeyEnv: z.string().min(1),
  requestsPerMinute: z.number().int().positive(),
  dailyLimit: z.number().int().positive().nullable(),
});

const tierSchema = z.object({
  provider: z.string().min(1),
  models: z.array(z.string().min(1)).min(1),
  /** NVIDIA reasoning mode. Ignored by providers that do not support it. */
  thinking: z.boolean().optional(),
});

const registrySchema = z
  .object({
    providers: z.record(z.string(), providerSchema),
    roles: z.object({
      reasoning: z.array(tierSchema).min(1),
      worker: z.array(tierSchema).min(1),
      fast: z.array(tierSchema).min(1),
    }),
  })
  .refine(
    (r) => Object.values(r.roles).every((tiers) => tiers.every((t) => t.provider in r.providers)),
    "Every tier in config/models.json must reference a provider defined under `providers`."
  );

export type ModelRegistry = z.infer<typeof registrySchema>;
export type ModelRole = keyof ModelRegistry["roles"];
export type ModelTier = z.infer<typeof tierSchema>;
export type ProviderConfig = z.infer<typeof providerSchema>;

export function loadRegistry(): ModelRegistry {
  const parsed = registrySchema.safeParse(rawModels);
  if (!parsed.success) {
    throw new Error(`config/models.json is invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  return parsed.data;
}
