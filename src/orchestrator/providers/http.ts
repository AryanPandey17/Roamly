import { LIMITS } from "../config";
import { RequestError, ToolUnavailableError } from "../errors";

/** Status codes that mean "you are out of quota", across the providers we use. */
const QUOTA_STATUSES = new Set([402, 429, 432, 433]);

/**
 * GET or POST JSON with a timeout and uniform error mapping.
 * - missing/invalid key  → RequestError (the user has to fix .env)
 * - quota exhausted      → ToolUnavailableError marked `quota` (no retry; run pauses)
 * - anything else        → plain Error (the caller may retry)
 */
export async function fetchJson(tool: string, provider: string, url: string | URL, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(LIMITS.toolTimeoutMs) });
  } catch (error) {
    throw new Error(`${provider} is unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (response.ok) return response.json();

  const body = (await response.text().catch(() => "")).slice(0, 300);
  if (response.status === 401 || response.status === 403) {
    throw new RequestError("invalid_api_key", `${provider} rejected the API key. Check it in .env.`);
  }
  if (QUOTA_STATUSES.has(response.status)) {
    throw new ToolUnavailableError(tool, `${provider}'s free quota is used up for now. Your progress is saved. Resume later.`);
  }
  throw new Error(`${provider} returned ${response.status}: ${body}`);
}

/** A provider whose API key is missing. Fails with a message that names the variable. */
export function requireKey(env: Record<string, string | undefined>, name: string, provider: string): string {
  const key = env[name];
  if (!key) {
    throw new RequestError("missing_api_key", `${name} is not set in .env, so ${provider} cannot be used. Add the key and try again.`);
  }
  return key;
}
