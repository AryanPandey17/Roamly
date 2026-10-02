import { LIMITS } from "../config";
import { ToolUnavailableError } from "../errors";
import type { TravelProviders } from "../ports";

type GeocodeResponse = {
  results?: { name: string; latitude: number; longitude: number; country?: string }[];
};

/**
 * Real geocoding from Open-Meteo's free geocoding API (no key needed).
 * Turns "Tokyo" into coordinates so nothing downstream guesses a location.
 */
export const openMeteoGeocoding: TravelProviders["geocoding"] = {
  name: "open-meteo",
  async geocode(query) {
    // "Tokyo, Japan" → search "Tokyo"; the API matches on place name.
    const name = query.split(",")[0].replace(/\(.*?\)/g, "").trim();
    if (!name) return null;

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(LIMITS.toolTimeoutMs) });
    } catch (error) {
      throw new ToolUnavailableError("geocode_place", `Geocoding is unreachable: ${String(error)}`);
    }
    if (!response.ok) {
      throw new ToolUnavailableError("geocode_place", `Geocoding failed with status ${response.status}.`);
    }

    const hit = ((await response.json()) as GeocodeResponse).results?.[0];
    if (!hit) return null;
    return { name: hit.name, country: hit.country ?? null, lat: hit.latitude, lng: hit.longitude };
  },
};
