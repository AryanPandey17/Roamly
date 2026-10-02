// Flights and hotels from SerpApi's Google Flights and Google Hotels engines.
// Free plan: 250 searches a month shared by both, so results are cached by
// the tool layer and the return leg is not fetched separately.

import { z } from "zod";
import { RequestError } from "../errors";
import type { TravelProviders } from "../ports";
import type { FlightOption, HotelOption } from "../state";
import { airportByCode, airportsNear } from "./airports";
import { fetchJson, requireKey } from "./http";

type Env = Record<string, string | undefined>;
const ENDPOINT = "https://serpapi.com/search.json";
const NAME = "serpapi";

const airportSchema = z.object({ name: z.string().optional(), id: z.string(), time: z.string() });
const flightItemSchema = z.object({
  flights: z
    .array(
      z.object({
        departure_airport: airportSchema,
        arrival_airport: airportSchema,
        airline: z.string().optional(),
        flight_number: z.string().optional(),
      })
    )
    .min(1),
  layovers: z.array(z.object({ duration: z.number().optional() })).optional(),
  total_duration: z.number().optional(),
  price: z.number().optional(),
});
const flightsResponseSchema = z.object({
  search_metadata: z.object({ google_flights_url: z.string().optional() }).optional(),
  best_flights: z.array(z.unknown()).optional(),
  other_flights: z.array(z.unknown()).optional(),
  error: z.string().optional(),
});

const rateSchema = z.object({ extracted_lowest: z.number().optional() }).optional();
const propertySchema = z.object({
  type: z.string().optional(),
  name: z.string(),
  link: z.string().optional(),
  property_token: z.string().optional(),
  gps_coordinates: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  rate_per_night: rateSchema,
  total_rate: rateSchema,
  overall_rating: z.number().optional(),
  amenities: z.array(z.string()).optional(),
});
const hotelsResponseSchema = z.object({
  properties: z.array(z.unknown()).optional(),
  error: z.string().optional(),
});

/** "2026-11-07 08:30" → "2026-11-07T08:30" */
const isoLocal = (time: string) => time.trim().replace(" ", "T").slice(0, 16);
const noResults = (message: string | undefined) => Boolean(message && /no results|hasn't returned any results/i.test(message));

async function search(env: Env, tool: string, params: Record<string, string | number | undefined>) {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("api_key", requireKey(env, "SERPAPI_API_KEY", "SerpApi"));
  url.searchParams.set("hl", "en");
  return fetchJson(tool, "SerpApi", url);
}

export function serpApiFlights(env: Env): TravelProviders["flights"] {
  return {
    name: NAME,
    async search(query) {
      const from = airportsNear(query.origin);
      const to = airportsNear(query.destination);
      if (!from.length) {
        throw new RequestError("no_origin_airport", `No airport with scheduled flights was found near ${query.origin.name}.`);
      }
      if (!to.length) {
        throw new RequestError("no_destination_airport", `No airport with scheduled flights was found near ${query.destination.name}.`);
      }

      const raw = flightsResponseSchema.parse(
        await search(env, "search_flights", {
          engine: "google_flights",
          type: 1, // round trip; prices are for the whole round trip and all passengers
          departure_id: from.map((a) => a.code).join(","),
          arrival_id: to.map((a) => a.code).join(","),
          outbound_date: query.departDate,
          return_date: query.returnDate,
          adults: query.travellers,
          currency: query.currency,
          max_price: query.maxPrice ? Math.floor(query.maxPrice) : undefined,
        })
      );
      if (raw.error && !noResults(raw.error)) throw new Error(`SerpApi: ${raw.error}`);
      const link = raw.search_metadata?.google_flights_url ?? null;

      const options: FlightOption[] = [];
      for (const item of [...(raw.best_flights ?? []), ...(raw.other_flights ?? [])]) {
        const parsed = flightItemSchema.safeParse(item);
        if (!parsed.success || parsed.data.price === undefined) continue; // unpriced or unexpected shape
        const { flights, layovers = [], total_duration, price } = parsed.data;
        const first = flights[0];
        const last = flights[flights.length - 1];
        const arrival = airportByCode(last.arrival_airport.id);
        const layoverMinutes = layovers.map((l) => l.duration).filter((d): d is number => typeof d === "number");
        const numbers = flights.map((f) => f.flight_number ?? "").filter(Boolean);

        options.push({
          id: `gf-${numbers.join("-").replace(/\s+/g, "") || options.length}-${isoLocal(first.departure_airport.time)}`,
          provider: NAME,
          airline: [...new Set(flights.map((f) => f.airline).filter(Boolean))].join(" + ") || "Airline",
          flightNumber: numbers.join(", "),
          origin: first.departure_airport.id,
          destination: last.arrival_airport.id,
          departAt: isoLocal(first.departure_airport.time),
          arriveAt: isoLocal(last.arrival_airport.time),
          // The return leg needs a second paid search per option; it is shown on the booking page instead.
          returnDepartAt: null,
          durationMinutes: total_duration ?? 0,
          stops: flights.length - 1,
          layoverMinutes: layoverMinutes.length ? Math.min(...layoverMinutes) : null,
          price,
          currency: query.currency,
          arrivalAirport: arrival ? { code: arrival.code, lat: arrival.lat, lng: arrival.lng } : null,
          deepLink: link,
          redFlags: [],
        });
      }
      // Same itinerary can appear in both lists.
      return [...new Map(options.map((o) => [o.id, o])).values()];
    },
  };
}

export function serpApiHotels(env: Env): TravelProviders["hotels"] {
  return {
    name: NAME,
    async search(query) {
      const where = [query.destination.name, query.destination.country].filter(Boolean).join(", ");
      const raw = hotelsResponseSchema.parse(
        await search(env, "search_hotels", {
          engine: "google_hotels",
          q: `hotels in ${where}`,
          check_in_date: query.checkIn,
          check_out_date: query.checkOut,
          adults: query.guests,
          currency: query.currency,
          max_price: query.maxPricePerNight ? Math.floor(query.maxPricePerNight) : undefined,
        })
      );
      if (raw.error && !noResults(raw.error)) throw new Error(`SerpApi: ${raw.error}`);

      const options: HotelOption[] = [];
      for (const item of raw.properties ?? []) {
        const parsed = propertySchema.safeParse(item);
        if (!parsed.success) continue;
        const p = parsed.data;
        const perNight = p.rate_per_night?.extracted_lowest;
        if (perNight === undefined) continue; // no price, cannot be budgeted
        options.push({
          id: `gh-${p.property_token ?? p.name}`,
          provider: NAME,
          name: p.name,
          rating: p.overall_rating ?? null,
          neighbourhood: null,
          lat: p.gps_coordinates?.latitude ?? null,
          lng: p.gps_coordinates?.longitude ?? null,
          pricePerNight: perNight,
          totalPrice: p.total_rate?.extracted_lowest ?? perNight * query.nights,
          currency: query.currency,
          amenities: (p.amenities ?? []).slice(0, 6),
          deepLink: p.link ?? `https://www.google.com/travel/search?q=${encodeURIComponent(`${p.name} ${where}`)}`,
        });
      }
      return options;
    },
  };
}
