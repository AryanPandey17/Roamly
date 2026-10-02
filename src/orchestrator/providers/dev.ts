// DEV FIXTURES — NOT REAL DATA.
//
// Phase 4 builds the orchestrator before the real travel APIs are chosen
// (Phase 5). These providers let the graph run end to end in the meantime.
// Every option they return has provider "dev-fixture" and a name ending in
// "(sample)", and the UI shows a banner while they are in use. This file is
// deleted when the real providers are wired in.

import type { TravelProviders } from "../ports";
import type { FlightOption, HotelOption, PlaceOption } from "../state";

export const DEV_FIXTURE = "dev-fixture";

// Rough USD conversion so fixture prices look sane in the trip currency.
const USD_TO: Record<string, number> = {
  USD: 1, INR: 83, EUR: 0.92, GBP: 0.79, JPY: 150, AED: 3.67, SGD: 1.35, AUD: 1.52, CAD: 1.36,
};
const fromUsd = (usd: number, currency: string) => Math.round(usd * (USD_TO[currency] ?? 1));

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(Math.round(minutes % 60))}`;

const FLIGHT_SHAPES = [
  { key: "direct", label: "Sample Air direct", stops: 0, extraMin: 0, layover: null, price: 1.15, depart: 8 * 60 + 30 },
  { key: "one-stop", label: "Sample Air 1 stop", stops: 1, extraMin: 180, layover: 150, price: 0.85, depart: 10 * 60 },
  { key: "tight", label: "Sample Air tight connection", stops: 1, extraMin: 110, layover: 45, price: 0.8, depart: 6 * 60 },
  { key: "red-eye", label: "Sample Air overnight", stops: 0, extraMin: 0, layover: null, price: 1.0, depart: 21 * 60 },
  { key: "two-stop", label: "Sample Air 2 stops", stops: 2, extraMin: 480, layover: 200, price: 0.7, depart: 5 * 60 },
] as const;

const HOTEL_SHAPES = [
  { key: "grand", name: "Grand Sample Hotel", rating: 4.8, usd: 320, area: "City centre", amenities: ["Spa", "Breakfast", "City view"] },
  { key: "boutique", name: "Sample Boutique Hotel", rating: 4.5, usd: 190, area: "Old town", amenities: ["Breakfast", "WiFi"] },
  { key: "central", name: "Sample Central Stay", rating: 4.3, usd: 150, area: "City centre", amenities: ["WiFi", "Gym"] },
  { key: "station", name: "Sample Station Inn", rating: 4.1, usd: 110, area: "Transit hub", amenities: ["WiFi", "Luggage storage"] },
  { key: "guest", name: "Sample Guesthouse", rating: 4.0, usd: 75, area: "Residential district", amenities: ["WiFi"] },
  { key: "hostel", name: "Sample Hostel", rating: 3.9, usd: 45, area: "Backpacker district", amenities: ["Shared lounge"] },
] as const;

const PLACE_SHAPES = [
  { key: "old-quarter", name: "Historic quarter walk", category: "Culture", rating: 4.7, usd: 0, minutes: 120 },
  { key: "museum", name: "City museum", category: "History", rating: 4.6, usd: 15, minutes: 120 },
  { key: "food-tour", name: "Street food tour", category: "Food", rating: 4.8, usd: 60, minutes: 180 },
  { key: "market", name: "Central market", category: "Food", rating: 4.4, usd: 0, minutes: 90 },
  { key: "park", name: "Botanical garden", category: "Nature", rating: 4.5, usd: 0, minutes: 90 },
  { key: "hike", name: "Day hike outside the city", category: "Adventure", rating: 4.6, usd: 40, minutes: 300 },
  { key: "gallery", name: "Contemporary art gallery", category: "Art", rating: 4.3, usd: 25, minutes: 90 },
  { key: "viewpoint", name: "Skyline viewpoint", category: "Photography", rating: 4.5, usd: 30, minutes: 60 },
  { key: "night", name: "Evening district tour", category: "Nightlife", rating: 4.2, usd: 45, minutes: 150 },
  { key: "tech", name: "Science and technology centre", category: "Technology", rating: 4.4, usd: 20, minutes: 120 },
  { key: "cooking", name: "Local cooking class", category: "Food", rating: 4.9, usd: 85, minutes: 180 },
  { key: "shopping", name: "Shopping street", category: "Shopping", rating: 4.1, usd: 0, minutes: 120 },
] as const;

const DAILY_USD = {
  saver: { food: 25, transport: 8 },
  balanced: { food: 45, transport: 12 },
  comfort: { food: 80, transport: 20 },
} as const;

export const devProviders: Omit<TravelProviders, "geocoding"> = {
  flights: {
    name: DEV_FIXTURE,
    async search(query) {
      const km = distanceKm(query.origin, query.destination);
      const baseMinutes = Math.round((km / 800) * 60 + 45);
      const perPersonUsd = 120 + km * 0.085;

      const options: FlightOption[] = FLIGHT_SHAPES.map((shape) => {
        const duration = baseMinutes + shape.extraMin;
        const arrive = shape.depart + duration;
        const arriveDate = new Date(`${query.departDate}T00:00:00Z`);
        arriveDate.setUTCDate(arriveDate.getUTCDate() + Math.floor(arrive / 1440));
        return {
          id: `dev-flight-${shape.key}`,
          provider: DEV_FIXTURE,
          airline: "Sample Air (sample)",
          flightNumber: `SA${100 + FLIGHT_SHAPES.indexOf(shape)}`,
          origin: query.origin.name,
          destination: query.destination.name,
          departAt: `${query.departDate}T${clock(shape.depart)}`,
          arriveAt: `${arriveDate.toISOString().slice(0, 10)}T${clock(arrive)}`,
          returnDepartAt: `${query.returnDate}T${clock(shape.depart)}`,
          durationMinutes: duration,
          stops: shape.stops,
          layoverMinutes: shape.layover,
          price: fromUsd(perPersonUsd * shape.price, query.currency) * query.travellers,
          currency: query.currency,
          arrivalAirport: { code: "SMP", lat: query.destination.lat + 0.25, lng: query.destination.lng + 0.2 },
          deepLink: null,
          redFlags: [],
        };
      });
      return options.filter((o) => query.maxPrice === undefined || o.price <= query.maxPrice);
    },
  },

  hotels: {
    name: DEV_FIXTURE,
    async search(query) {
      const rooms = Math.ceil(query.guests / 2);
      const options: HotelOption[] = HOTEL_SHAPES.map((shape, i) => {
        const perNight = fromUsd(shape.usd, query.currency) * rooms;
        return {
          id: `dev-hotel-${shape.key}`,
          provider: DEV_FIXTURE,
          name: `${shape.name} (sample)`,
          rating: shape.rating,
          neighbourhood: shape.area,
          lat: query.destination.lat + 0.004 * (i - 2),
          lng: query.destination.lng + 0.005 * (i % 3),
          pricePerNight: perNight,
          totalPrice: perNight * query.nights,
          currency: query.currency,
          amenities: [...shape.amenities],
          deepLink: null,
        };
      });
      return options.filter((o) => query.maxPricePerNight === undefined || o.pricePerNight <= query.maxPricePerNight);
    },
  },

  places: {
    name: DEV_FIXTURE,
    async search(query) {
      const wanted = query.interests.map((i) => i.toLowerCase());
      const options: PlaceOption[] = PLACE_SHAPES.map((shape, i) => ({
        id: `dev-place-${shape.key}`,
        provider: DEV_FIXTURE,
        name: `${shape.name} (sample)`,
        category: shape.category,
        rating: shape.rating,
        lat: query.near.lat + 0.006 * ((i % 5) - 2),
        lng: query.near.lng + 0.007 * ((i % 4) - 1.5),
        price: fromUsd(shape.usd, query.currency),
        currency: query.currency,
        durationMinutes: shape.minutes,
        description: `Sample ${shape.category.toLowerCase()} activity in ${query.near.name}.`,
        deepLink: null,
      }));
      const matches = (p: PlaceOption) => wanted.includes(p.category.toLowerCase());
      return options
        .sort((a, b) => Number(matches(b)) - Number(matches(a)) || (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, query.limit);
    },
  },

  routing: {
    name: DEV_FIXTURE,
    async travelMinutes(from, to) {
      // Straight-line distance at 35 km/h plus 20 minutes of overhead.
      return Math.round((distanceKm(from, to) / 35) * 60 + 20);
    },
  },

  costOfLiving: {
    name: DEV_FIXTURE,
    async dailyEstimates({ currency, style }) {
      return {
        foodPerDay: fromUsd(DAILY_USD[style].food, currency),
        localTransportPerDay: fromUsd(DAILY_USD[style].transport, currency),
        currency,
        source: DEV_FIXTURE,
      };
    },
  },
};
