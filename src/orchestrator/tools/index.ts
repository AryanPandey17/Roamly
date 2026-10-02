// Tool definitions the agents' models can call. Each tool validates its input
// with Zod, calls a provider through the ports, records what came back in a
// collector the node reads afterwards, and returns a compact summary to the
// model. Invalid arguments come back to the model as a typed error.

import { createHash } from "node:crypto";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { CACHE_TTL, LIMITS } from "../config";
import { isRequestError, isResumable, ToolUnavailableError } from "../errors";
import type { CachePort, LlmCallMeta, SearchResult, TelemetryPort, TravelProviders } from "../ports";
import type { DailyWeather, FlightOption, HotelOption, ParsedRequest, PlaceOption } from "../state";

export type ToolContext = {
  request: ParsedRequest;
  providers: TravelProviders;
  telemetry: TelemetryPort;
  cache: CachePort;
  meta: LlmCallMeta;
  /** Incremented on every provider call, for the per-run usage counter. */
  meter: { toolCalls: number };
};

export type CallContext = Pick<ToolContext, "telemetry" | "cache" | "meta" | "meter">;

/** Stable cache key for a tool call: the tool name plus a hash of its normalized input. */
export const cacheKey = (toolName: string, input: unknown) =>
  `${toolName}:${createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32)}`;

/**
 * Runs a provider call with caching, a timeout, one retry, logging and usage
 * counting. Quota and configuration errors are not retried: they will not get
 * better in a second, and a retry would only burn more free quota.
 */
export async function callProvider<T>(
  ctx: CallContext,
  toolName: string,
  provider: string,
  fn: () => Promise<T>,
  cache?: { input: unknown; ttlSeconds: number }
): Promise<T> {
  const started = Date.now();
  const log = (status: "success" | "error" | "timeout", cacheHit: boolean, errorMessage: string | null) =>
    ctx.telemetry
      .logToolCall({ ...ctx.meta, tool: toolName, provider, latencyMs: Date.now() - started, cacheHit, status, errorMessage })
      .catch(() => undefined);

  const key = cache ? cacheKey(toolName, cache.input) : null;
  if (key) {
    const hit = await ctx.cache.get(key).catch(() => null);
    if (hit !== null) {
      await log("success", true, null);
      return hit as T;
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${toolName} timed out`)), LIMITS.toolTimeoutMs + 2000)
        ),
      ]);
      ctx.meter.toolCalls += 1;
      await log("success", false, null);
      if (key && cache) await ctx.cache.set(key, toolName, result, cache.ttlSeconds).catch(() => undefined);
      return result;
    } catch (error) {
      lastError = error;
      if (isRequestError(error) || isResumable(error)) break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await log(/timed out/.test(message) ? "timeout" : "error", false, message.slice(0, 500));
  if (isRequestError(lastError) || isResumable(lastError)) throw lastError;
  throw new ToolUnavailableError(toolName, `${toolName} is unavailable right now: ${message}`);
}

/**
 * Keeps the first few results as returned (the provider's best matches) and
 * adds the cheapest ones, so Budget always has cheaper alternatives to ask for.
 */
function bestAndCheapest<T extends { id: string }>(items: T[], price: (item: T) => number): T[] {
  const half = Math.ceil(LIMITS.maxCandidates / 2);
  const best = items.slice(0, half);
  const cheapest = [...items].sort((a, b) => price(a) - price(b)).slice(0, LIMITS.maxCandidates);
  return [...new Map([...best, ...cheapest].map((item) => [item.id, item])).values()].slice(0, LIMITS.maxCandidates);
}

const hourOf = (isoLocal: string) => Number(isoLocal.slice(11, 13));

/** Feasibility warnings are computed in code so they are never missed or invented. */
export function flagFlight(flight: FlightOption): FlightOption {
  const redFlags: string[] = [];
  if (flight.stops > 0 && flight.layoverMinutes !== null && flight.layoverMinutes < 60) {
    redFlags.push(`Layover of ${flight.layoverMinutes} minutes is under 60.`);
  }
  const arrivalHour = hourOf(flight.arriveAt);
  if (arrivalHour >= 0 && arrivalHour < 6) redFlags.push("Arrives between midnight and 06:00.");
  return { ...flight, redFlags };
}

// ----- Direct (non-LLM) searches, also used by the tools below --------------

export async function searchFlights(ctx: ToolContext, maxPrice?: number): Promise<FlightOption[]> {
  const { request, providers } = ctx;
  const query = {
    origin: request.origin,
    destination: request.destination,
    departDate: request.startDate,
    returnDate: request.endDate,
    travellers: request.travellers,
    currency: request.budget.currency,
    maxPrice,
  };
  const found = await callProvider(ctx, "search_flights", providers.flights.name, () => providers.flights.search(query), {
    input: query,
    ttlSeconds: CACHE_TTL.flights,
  });
  return bestAndCheapest(found, (f) => f.price).map(flagFlight);
}

export async function searchHotels(ctx: ToolContext, maxPricePerNight?: number): Promise<HotelOption[]> {
  const { request, providers } = ctx;
  const query = {
    destination: request.destination,
    checkIn: request.startDate,
    checkOut: request.endDate,
    nights: request.nights,
    guests: request.travellers,
    currency: request.budget.currency,
    maxPricePerNight,
  };
  const found = await callProvider(ctx, "search_hotels", providers.hotels.name, () => providers.hotels.search(query), {
    input: query,
    ttlSeconds: CACHE_TTL.hotels,
  });
  return bestAndCheapest(found, (h) => h.totalPrice);
}

export async function searchPlaces(ctx: ToolContext, interests: string[]): Promise<PlaceOption[]> {
  const { request, providers } = ctx;
  const query = { near: request.destination, interests, currency: request.budget.currency, limit: 12 };
  return callProvider(ctx, "search_places", providers.places.name, () => providers.places.search(query), {
    input: query,
    ttlSeconds: CACHE_TTL.places,
  });
}

export async function getWeather(ctx: ToolContext): Promise<DailyWeather[]> {
  const { request, providers } = ctx;
  const input = { lat: request.destination.lat, lng: request.destination.lng, start: request.startDate, end: request.endDate };
  return callProvider(
    ctx,
    "get_weather",
    providers.weather.name,
    () => providers.weather.daily(request.destination, request.startDate, request.endDate),
    { input, ttlSeconds: CACHE_TTL.weather }
  );
}

export async function webSearch(ctx: CallContext & { providers: TravelProviders }, query: string): Promise<SearchResult[]> {
  return callProvider(ctx, "web_search", ctx.providers.search.name, () => ctx.providers.search.search(query), {
    input: { query: query.toLowerCase().trim() },
    ttlSeconds: CACHE_TTL.webSearch,
  });
}

export async function travelMinutes(
  ctx: CallContext & { providers: TravelProviders },
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number> {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const input = { from: [round(from.lat), round(from.lng)], to: [round(to.lat), round(to.lng)] };
  return callProvider(ctx, "estimate_travel_time", ctx.providers.routing.name, () => ctx.providers.routing.travelMinutes(from, to), {
    input,
    ttlSeconds: CACHE_TTL.routing,
  });
}

/** Converts an amount between currencies with a cached daily rate. */
export async function convert(
  ctx: CallContext & { providers: TravelProviders },
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from.toUpperCase() === to.toUpperCase()) return amount;
  const input = { from: from.toUpperCase(), to: to.toUpperCase() };
  const { rate } = await callProvider(ctx, "convert_currency", ctx.providers.fx.name, () => ctx.providers.fx.rate(from, to), {
    input,
    ttlSeconds: CACHE_TTL.fx,
  });
  return amount * rate;
}

// ----- Tools bound to the Logistics model -----------------------------------

export function logisticsTools(ctx: ToolContext) {
  const collected: { flights: FlightOption[]; transferMinutes: number | null } = {
    flights: [],
    transferMinutes: null,
  };

  const search = tool(
    async ({ maxPrice }) => {
      collected.flights = await searchFlights(ctx, maxPrice ?? undefined);
      return JSON.stringify(
        collected.flights.map((f) => ({
          id: f.id,
          airline: f.airline,
          departAt: f.departAt,
          arriveAt: f.arriveAt,
          durationMinutes: f.durationMinutes,
          stops: f.stops,
          layoverMinutes: f.layoverMinutes,
          price: f.price,
          currency: f.currency,
          redFlags: f.redFlags,
        }))
      );
    },
    {
      name: "search_flights",
      description:
        "Search round-trip flights for this trip's origin, destination, dates and travellers. " +
        "Returns options with ids. Only ids returned here may be selected.",
      schema: z.object({
        maxPrice: z.number().positive().nullish().describe("Optional price ceiling for the whole party, round trip."),
      }),
    }
  );

  const transfer = tool(
    async ({ flightId }) => {
      const flight = collected.flights.find((f) => f.id === flightId);
      if (!flight?.arrivalAirport) {
        return JSON.stringify({ ok: false, error: `Unknown flightId "${flightId}". Call search_flights first.` });
      }
      const minutes = await travelMinutes(ctx, flight.arrivalAirport, ctx.request.destination);
      collected.transferMinutes = minutes;
      return JSON.stringify({ ok: true, flightId, airportToCentreMinutes: minutes });
    },
    {
      name: "estimate_travel_time",
      description: "Minutes from a flight's arrival airport to the destination centre.",
      schema: z.object({ flightId: z.string().describe("An id returned by search_flights.") }),
    }
  );

  return { tools: [search, transfer] as StructuredToolInterface[], collected };
}

// ----- Tools bound to the Recommendations model ------------------------------

export function recommendationsTools(ctx: ToolContext) {
  const collected: { hotels: HotelOption[]; places: PlaceOption[]; weather: DailyWeather[] | null } = {
    hotels: [],
    places: [],
    weather: null,
  };

  const hotels = tool(
    async ({ maxPricePerNight }) => {
      collected.hotels = await searchHotels(ctx, maxPricePerNight ?? undefined);
      return JSON.stringify(
        collected.hotels.map((h) => ({
          id: h.id,
          name: h.name,
          rating: h.rating,
          neighbourhood: h.neighbourhood,
          pricePerNight: h.pricePerNight,
          totalPrice: h.totalPrice,
          currency: h.currency,
          amenities: h.amenities,
        }))
      );
    },
    {
      name: "search_hotels",
      description:
        "Search places to stay for this trip's destination, dates and travellers. " +
        "Returns options with ids. Only ids returned here may be selected.",
      schema: z.object({
        maxPricePerNight: z.number().positive().nullish().describe("Optional nightly price ceiling."),
      }),
    }
  );

  const places = tool(
    async ({ interests }) => {
      collected.places = await searchPlaces(ctx, interests);
      return JSON.stringify(
        collected.places.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          rating: p.rating,
          free: p.priceKnown && p.price === 0,
          durationMinutes: p.durationMinutes,
        }))
      );
    },
    {
      name: "search_places",
      description:
        "Search activities and places to eat near the destination, ranked by the given interests. " +
        "Returns options with ids. Only ids returned here may be selected.",
      schema: z.object({
        interests: z.array(z.string()).max(10).describe("Interest keywords, for example Food, Culture, Nature."),
      }),
    }
  );

  const weather = tool(
    async () => {
      collected.weather = await getWeather(ctx);
      return JSON.stringify(
        collected.weather.length
          ? collected.weather
          : { note: "No forecast is available for these dates yet. Do not assume the weather." }
      );
    },
    {
      name: "get_weather",
      description: "Daily forecast for the destination on the trip dates. Use it to prefer indoor activities on wet days.",
      schema: z.object({}),
    }
  );

  const search = tool(
    async ({ query }) => JSON.stringify(await webSearch(ctx, query)),
    {
      name: "web_search",
      description:
        "Search the web for background on the destination, for example which areas suit the traveller's interests. " +
        "Use at most once. Never use it for prices of specific hotels or flights.",
      schema: z.object({ query: z.string().min(3).max(200) }),
    }
  );

  return { tools: [hotels, places, weather, search] as StructuredToolInterface[], collected };
}
