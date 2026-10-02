// Deterministic cost maths. The Budget agent's verdict comes from here and
// nowhere else: no LLM ever adds numbers.

import type {
  Category,
  CostBreakdown,
  Estimates,
  FlightOption,
  HotelOption,
  Instruction,
  PlaceOption,
} from "../state";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type CostInput = {
  flight: FlightOption | null;
  hotel: HotelOption | null;
  activities: PlaceOption[];
  days: number;
  travellers: number;
  estimates: Estimates;
  currency: string;
};

/**
 * Total cost of exactly the selected items.
 * - flight.price is the round trip for the whole party
 * - hotel.totalPrice is the whole stay
 * - activity prices and daily estimates are per person
 */
export function calculateTripCost(input: CostInput): CostBreakdown {
  const { travellers, days } = input;
  const flights = round2(input.flight?.price ?? 0);
  const stay = round2(input.hotel?.totalPrice ?? 0);
  const activities = round2(input.activities.reduce((sum, a) => sum + a.price, 0) * travellers);
  const food = round2(input.estimates.foodPerDay * days * travellers);
  const localTransport = round2(input.estimates.localTransportPerDay * days * travellers);
  const total = round2(flights + stay + activities + food + localTransport);
  const pct = (part: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

  return {
    currency: input.currency,
    flights,
    stay,
    activities,
    food,
    localTransport,
    total,
    percent: {
      flights: pct(flights),
      stay: pct(stay),
      activities: pct(activities),
      food: pct(food),
      localTransport: pct(localTransport),
    },
  };
}

/** Cheapest way to keep the same number of activities, from known candidates. */
export function cheapestActivities(candidates: PlaceOption[], count: number): PlaceOption[] {
  // Places whose price is unknown count as 0 in totals, so they must not look "cheapest".
  const cost = (p: PlaceOption) => (p.priceKnown ? p.price : Number.MAX_SAFE_INTEGER);
  return [...candidates].sort((a, b) => cost(a) - cost(b)).slice(0, count);
}

export type Alternatives = {
  flights: FlightOption[];
  hotels: HotelOption[];
  places: PlaceOption[];
  selectedActivityCount: number;
  travellers: number;
};

/**
 * How much each negotiable category could drop using options the agents have
 * already found. Budget targets the category with the most to give.
 */
export function savingsPotential(breakdown: CostBreakdown, alt: Alternatives): Record<Category, number> {
  const cheapestFlight = alt.flights.length ? Math.min(...alt.flights.map((f) => f.price)) : breakdown.flights;
  const cheapestStay = alt.hotels.length ? Math.min(...alt.hotels.map((h) => h.totalPrice)) : breakdown.stay;
  const cheapestActs =
    cheapestActivities(alt.places, alt.selectedActivityCount).reduce((sum, p) => sum + p.price, 0) * alt.travellers;

  return {
    flights: Math.max(0, round2(breakdown.flights - cheapestFlight)),
    stay: Math.max(0, round2(breakdown.stay - cheapestStay)),
    activities: Math.max(0, round2(breakdown.activities - cheapestActs)),
  };
}

const AGENT_FOR: Record<Category, Instruction["target"]> = {
  flights: "logistics",
  stay: "recommendations",
  activities: "recommendations",
};

/**
 * The single constraint Budget issues on a rejection: which category, and the
 * most it may cost. Categories already shown to have nothing cheaper are skipped.
 * Returns null when no category is left to negotiate.
 */
export function chooseInstruction(input: {
  breakdown: CostBreakdown;
  overBy: number;
  nights: number;
  alternatives: Alternatives;
  exhausted: Category[];
}): Instruction | null {
  const { breakdown, overBy, nights, exhausted } = input;
  const potential = savingsPotential(breakdown, input.alternatives);
  const open = (["stay", "flights", "activities"] as Category[]).filter(
    (c) => !exhausted.includes(c) && breakdown[c] > 0
  );
  if (open.length === 0) return null;

  // Most savings potential first; ties go to the larger cost.
  const category = [...open].sort((a, b) => potential[b] - potential[a] || breakdown[b] - breakdown[a])[0];
  // Ask for enough to clear the whole overage. If this category cannot give
  // that much, ask for its cheapest known option instead of an impossible number;
  // the next audit then moves on to another category.
  const needed = Math.floor(breakdown[category] - overBy);
  const cheapestKnown = Math.ceil(breakdown[category] - potential[category]);
  const ceiling = Math.max(0, potential[category] > 0 ? Math.max(needed, cheapestKnown) : needed);

  return {
    target: AGENT_FOR[category],
    category,
    ceiling,
    ceilingPerNight: category === "stay" ? Math.floor(ceiling / Math.max(1, nights)) : null,
    currency: breakdown.currency,
  };
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}
