// Airport lookup from a bundled copy of the OurAirports open dataset
// (large and medium airports with scheduled service and an IATA code).
// Row format: [iata, name, city, country, lat, lng, isLarge].
import rows from "../data/airports.json";

export type Airport = { code: string; name: string; city: string; country: string; lat: number; lng: number; large: boolean };

const AIRPORTS: Airport[] = (rows as [string, string, string, string, number, number, number][]).map(
  ([code, name, city, country, lat, lng, large]) => ({ code, name, city, country, lat, lng, large: large === 1 })
);
const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const airportByCode = (code: string) => BY_CODE.get(code) ?? null;

/**
 * Airports that serve a place: up to two large airports within 100 km,
 * otherwise the nearest airport of any size within 200 km.
 */
export function airportsNear(place: { lat: number; lng: number }): Airport[] {
  const ranked = AIRPORTS.map((airport) => ({ airport, km: distanceKm(place, airport) })).sort((a, b) => a.km - b.km);
  const large = ranked.filter((r) => r.airport.large && r.km <= 100).slice(0, 2);
  if (large.length) return large.map((r) => r.airport);
  const nearest = ranked.find((r) => r.km <= 200);
  return nearest ? [nearest.airport] : [];
}
