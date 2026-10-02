// Geocoding and weather from Open-Meteo. Free, no key, 10,000 calls a day.

import { z } from "zod";
import type { TravelProviders } from "../ports";
import { fetchJson } from "./http";

const NAME = "open-meteo";

const geocodeSchema = z.object({
  results: z
    .array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number(), country: z.string().optional() }))
    .optional(),
});

const forecastSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()).optional(),
  }),
});

/** Turns "Tokyo" into coordinates so nothing downstream guesses a location. */
export const openMeteoGeocoding: TravelProviders["geocoding"] = {
  name: NAME,
  async geocode(query) {
    // "Tokyo, Japan" → search "Tokyo"; the API matches on place name.
    const name = query.split(",")[0].replace(/\(.*?\)/g, "").trim();
    if (!name) return null;

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const hit = geocodeSchema.parse(await fetchJson("geocode_place", "Open-Meteo", url)).results?.[0];
    if (!hit) return null;
    return { name: hit.name, country: hit.country ?? null, lat: hit.latitude, lng: hit.longitude };
  },
};

/** Daily forecast for the trip dates. Returns nothing when the dates are beyond the forecast range. */
export const openMeteoWeather: TravelProviders["weather"] = {
  name: NAME,
  async daily(place, startDate, endDate) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(place.lat));
    url.searchParams.set("longitude", String(place.lng));
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    url.searchParams.set("timezone", "auto");

    let raw: unknown;
    try {
      raw = await fetchJson("get_weather", "Open-Meteo", url);
    } catch (error) {
      // Dates past the forecast horizon come back as a 400. That is "no forecast", not a failure.
      if (error instanceof Error && /returned 400/.test(error.message)) return [];
      throw error;
    }

    const { daily } = forecastSchema.parse(raw);
    return daily.time.flatMap((date, i) => {
      const tempMax = daily.temperature_2m_max[i];
      const tempMin = daily.temperature_2m_min[i];
      if (tempMax === null || tempMin === null) return [];
      return [{ date, tempMax, tempMin, rainChance: daily.precipitation_probability_max?.[i] ?? null }];
    });
  },
};
