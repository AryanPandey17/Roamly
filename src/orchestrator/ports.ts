// Interfaces the orchestrator depends on. Implementations are passed in, so
// this package never imports Next.js, Supabase or a specific travel API.

import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { ModelRole } from "./config";
import type { AgentEventInput, AgentName } from "./events";
import type {
  BudgetAudit,
  DailyWeather,
  FlightOption,
  HotelOption,
  Itinerary,
  ParsedRequest,
  Place,
  PlaceOption,
  Usage,
} from "./state";

// ----- LLM -----------------------------------------------------------------

export type LlmCallMeta = { runId: string; userId: string; agent: AgentName };

export type LlmResult = {
  message: AIMessage;
  served: { model: string; provider: string; depth: number };
};

export interface LlmPort {
  /** One chat completion with the role's fallback chain. Throws ProviderExhaustedError when every tier fails. */
  invoke(
    role: ModelRole,
    messages: BaseMessage[],
    options: { tools?: StructuredToolInterface[]; meta: LlmCallMeta }
  ): Promise<LlmResult>;
}

// ----- Telemetry -----------------------------------------------------------

export type LlmCallLog = LlmCallMeta & {
  role: ModelRole;
  provider: string;
  requestedModel: string;
  servedModel: string | null;
  fallbackDepth: number;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  status: "success" | "error" | "timeout" | "rate_limited";
  errorCode: string | null;
  errorMessage: string | null;
};

export type ToolCallLog = LlmCallMeta & {
  tool: string;
  provider: string | null;
  latencyMs: number;
  cacheHit: boolean;
  status: "success" | "error" | "timeout";
  errorMessage: string | null;
};

export interface TelemetryPort {
  logLlmCall(log: LlmCallLog): Promise<void>;
  logToolCall(log: ToolCallLog): Promise<void>;
  /** Requests made to this provider today (UTC). */
  quotaUsedToday(provider: string): Promise<number>;
  recordProviderRequest(provider: string, failed: boolean): Promise<void>;
}

// ----- Persistence ---------------------------------------------------------

export type RunStatus = "running" | "paused" | "completed" | "completed_over_budget" | "failed";

export type RunRef = { runId: string; tripId: string; userId: string };

export interface RunStore {
  /** Highest seq stored for the run, or -1. */
  lastSeq(runId: string): Promise<number>;
  appendMessage(run: RunRef, seq: number, event: AgentEventInput): Promise<void>;
  saveParsedRequest(run: RunRef, request: ParsedRequest, assumptions: string[]): Promise<void>;
  saveAudit(run: RunRef, audit: BudgetAudit): Promise<void>;
  saveItinerary(run: RunRef, itinerary: Itinerary): Promise<void>;
  updateRun(
    run: RunRef,
    patch: {
      status?: RunStatus;
      round?: number;
      rejections?: number;
      usage?: Usage;
      error?: { code: string; message: string } | null;
    }
  ): Promise<void>;
}

// ----- Travel data ---------------------------------------------------------

export type FlightSearch = {
  origin: Place;
  destination: Place;
  departDate: string;
  returnDate: string;
  travellers: number;
  currency: string;
  maxPrice?: number;
};

export type HotelSearch = {
  destination: Place;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  currency: string;
  maxPricePerNight?: number;
};

export type PlaceSearch = {
  near: Place;
  interests: string[];
  currency: string;
  limit: number;
};

export type SearchResult = { title: string; snippet: string; url: string };

export interface TravelProviders {
  geocoding: { name: string; geocode(query: string): Promise<Place | null> };
  flights: { name: string; search(query: FlightSearch): Promise<FlightOption[]> };
  hotels: { name: string; search(query: HotelSearch): Promise<HotelOption[]> };
  /** Places come back without prices for paid attractions; those are estimated separately. */
  places: { name: string; search(query: PlaceSearch): Promise<PlaceOption[]> };
  routing: {
    name: string;
    travelMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<number>;
  };
  weather: {
    name: string;
    /** Empty when the dates are outside the forecast range. */
    daily(place: { lat: number; lng: number }, startDate: string, endDate: string): Promise<DailyWeather[]>;
  };
  fx: { name: string; rate(from: string, to: string): Promise<{ rate: number; asOf: string }> };
  search: { name: string; search(query: string): Promise<SearchResult[]> };
}

/** Key-value cache for tool results, to protect free quotas. */
export interface CachePort {
  get(key: string): Promise<unknown | null>;
  set(key: string, tool: string, value: unknown, ttlSeconds: number): Promise<void>;
}

// ----- Everything a run needs ----------------------------------------------

export interface Deps {
  llm: LlmPort;
  store: RunStore;
  telemetry: TelemetryPort;
  providers: TravelProviders;
  cache: CachePort;
  checkpointer: BaseCheckpointSaver;
  /** Injected so "today" is testable and consistent within a run. */
  now(): Date;
}
