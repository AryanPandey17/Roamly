import type { TravelProviders } from "../ports";
import { frankfurterFx } from "./frankfurter";
import { geoapifyPlaces, geoapifyRouting } from "./geoapify";
import { openMeteoGeocoding, openMeteoWeather } from "./open-meteo";
import { serpApiFlights, serpApiHotels } from "./serpapi";
import { tavilySearch } from "./tavily";

/**
 * The real travel-data stack. Every provider is on a free plan.
 * A provider whose key is missing fails on first use with a message that
 * names the variable; nothing falls back to made-up data.
 */
export function createProviders(env: Record<string, string | undefined> = process.env): TravelProviders {
  return {
    geocoding: openMeteoGeocoding,
    flights: serpApiFlights(env),
    hotels: serpApiHotels(env),
    places: geoapifyPlaces(env),
    routing: geoapifyRouting(env),
    weather: openMeteoWeather,
    fx: frankfurterFx,
    search: tavilySearch(env),
  };
}
