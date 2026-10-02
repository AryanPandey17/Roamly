// Tool definitions the agents' models can call. Each tool validates its input
// with Zod, calls a provider through the ports, records what came back in a
// collector the node reads afterwards, and returns a compact summary to the
// model. Invalid arguments come back to the model as a typed error.

import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { LIMITS } from "../config";
import { ToolUnavailableError } from "../errors";
import type { LlmCallMeta, TelemetryPort, TravelProviders } from "../ports";
import type { FlightOption, HotelOption, ParsedRequest, PlaceOption } from "../state";

export type ToolContext = {
  request: ParsedRequest;
  providers: TravelProviders;
  telemetry: TelemetryPort;
  meta: LlmCallMeta;
  /** Incremented on every provider call, for the per-run usage counter. */
  meter: { toolCalls: number };
};

/** Runs a provider call with timeout, one retry, logging and usage counting. */
export async function callProvider<T>(
  ctx: Pick<ToolContext, "telemetry" | "meta" | "meter">,
  toolName: string,
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${toolName} timed out`)), LIMITS.toolTimeoutMs)
        ),
      ]);
      ctx.meter.toolCalls += 1;
      await ctx.telemetry
        .logToolCall({
          ...ctx.meta,
          tool: toolName,
          provider,
          latencyMs: Date.now() - started,
          cacheHit: false,
          status: "success",
          errorMessage: null,
        })
        .catch(() => undefined);
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await ctx.telemetry
    .logToolCall({
      ...ctx.meta,
      tool: toolName,
      provider,
      latencyMs: Date.now() - started,
      cacheHit: false,
      status: /timed out/.test(message) ? "timeout" : "error",
      errorMessage: message.slice(0, 500),
    })
    .catch(() => undefined);
  throw new ToolUnavailableError(toolName, `${toolName} is unavailable right now: ${message}`);
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
  const found = await callProvider(ctx, "search_flights", providers.flights.name, () =>
    providers.flights.search({
      origin: request.origin,
      destination: request.destination,
      departDate: request.startDate,
      returnDate: request.endDate,
      travellers: request.travellers,
      currency: request.budget.currency,
      maxPrice,
    })
  );
  return found.slice(0, LIMITS.maxCandidates).map(flagFlight);
}

export async function searchHotels(ctx: ToolContext, maxPricePerNight?: number): Promise<HotelOption[]> {
  const { request, providers } = ctx;
  const found = await callProvider(ctx, "search_hotels", providers.hotels.name, () =>
    providers.hotels.search({
      destination: request.destination,
      checkIn: request.startDate,
      checkOut: request.endDate,
      nights: request.nights,
      guests: request.travellers,
      currency: request.budget.currency,
      maxPricePerNight,
    })
  );
  return found.slice(0, LIMITS.maxCandidates);
}

export async function searchPlaces(ctx: ToolContext, interests: string[]): Promise<PlaceOption[]> {
  const { request, providers } = ctx;
  return callProvider(ctx, "search_places", providers.places.name, () =>
    providers.places.search({
      near: request.destination,
      interests,
      currency: request.budget.currency,
      limit: 12,
    })
  );
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
      const minutes = await callProvider(ctx, "estimate_travel_time", ctx.providers.routing.name, () =>
        ctx.providers.routing.travelMinutes(flight.arrivalAirport!, ctx.request.destination)
      );
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
  const collected: { hotels: HotelOption[]; places: PlaceOption[] } = { hotels: [], places: [] };

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
          pricePerPerson: p.price,
          currency: p.currency,
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

  return { tools: [hotels, places] as StructuredToolInterface[], collected };
}
