import { z } from "zod";
import { DEFAULTS } from "../config";
import { RECOMMENDATIONS, RECOMMENDATIONS_REVISE } from "../prompts";
import type { HotelOption, PlaceOption, TripStateType, TripStateUpdate } from "../state";
import { formatMoney } from "../tools/calculator";
import { recommendationsTools, searchHotels, searchPlaces, type ToolContext } from "../tools";
import { decide, type AgentContext } from "./runner";
import { mergeById, requestOf, selectedActivities, selectedHotel } from "./select";

const proposeSchema = z.object({
  hotelId: z.string(),
  activityIds: z.array(z.string()).min(1).max(12),
  reasoning: z.string().max(600),
});
const hotelPickSchema = z.object({ hotelId: z.string(), reasoning: z.string().max(600) });
const activityPickSchema = z.object({ activityIds: z.array(z.string()).min(1).max(12), reasoning: z.string().max(600) });

/** How many activities suit this trip: full days × pace, within sensible bounds. */
export function activityTarget(state: TripStateType) {
  const { days } = requestOf(state);
  const perDay = DEFAULTS.activitiesPerDay[state.preferences.pace];
  return Math.min(10, Math.max(2, Math.round(Math.max(1, days - 1) * perDay)));
}

const bestRated = <T extends { rating: number | null }>(items: T[]) =>
  [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

function toolContext(state: TripStateType, ctx: AgentContext): ToolContext {
  return {
    request: requestOf(state),
    providers: ctx.deps.providers,
    telemetry: ctx.deps.telemetry,
    meta: ctx.meta,
    meter: ctx.meter,
  };
}

const hotelFacts = (h: HotelOption) =>
  [h.rating ? `rated ${h.rating}` : null, h.neighbourhood, `${formatMoney(h.pricePerNight, h.currency)} per night`].filter(
    (x): x is string => Boolean(x)
  );

/** Round 0: the best version of the trip, ignoring cost. */
export async function recommendationsPropose(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const request = requestOf(state);
  const tc = toolContext(state, ctx);
  const { tools, collected } = recommendationsTools(tc);
  const target = activityTarget(state);

  const decision = await decide(ctx, {
    role: "worker",
    system: RECOMMENDATIONS,
    user: JSON.stringify({
      destination: request.destination.name,
      checkIn: request.startDate,
      checkOut: request.endDate,
      nights: request.nights,
      travellers: request.travellers,
      interests: request.interests,
      pace: state.preferences.pace,
      dietary: state.preferences.dietary,
      activitiesToPick: target,
    }),
    schema: proposeSchema,
    tools,
  });

  let fallback = decision.fallback;
  if (collected.hotels.length === 0) {
    collected.hotels = await searchHotels(tc);
    fallback ??= "the model did not call search_hotels";
  }
  if (collected.places.length === 0) {
    collected.places = await searchPlaces(tc, request.interests);
    fallback ??= "the model did not call search_places";
  }
  if (collected.hotels.length === 0) {
    ctx.emit({ agent: "recommendations", kind: "error", round: 0, text: "No places to stay were found for these dates." });
    return { stay: { candidates: [], selectedId: null, notes: "No stays found." } };
  }

  let hotel = collected.hotels.find((h) => h.id === decision.value?.hotelId);
  if (!hotel) {
    if (decision.value) fallback = `the model picked an unknown hotel id "${decision.value.hotelId}"`;
    hotel = bestRated(collected.hotels)[0];
  }

  // Keep only real ids, drop duplicates, then top up from the ranked list.
  const known = new Set(collected.places.map((p) => p.id));
  let activityIds = [...new Set(decision.value?.activityIds ?? [])].filter((id) => known.has(id)).slice(0, target);
  if (decision.value && activityIds.length < decision.value.activityIds.length) {
    fallback ??= "the model picked activity ids that were not in the search results";
  }
  if (activityIds.length < Math.min(target, collected.places.length)) {
    const extra = collected.places.map((p) => p.id).filter((id) => !activityIds.includes(id));
    activityIds = [...activityIds, ...extra].slice(0, target);
  }
  const activities = activityIds.map((id) => collected.places.find((p) => p.id === id)!);

  const reasoning =
    (!fallback && decision.value?.reasoning) ||
    `Picked the best-rated stay and ${activities.length} activities matching ${request.interests.join(", ") || "general interests"}.`;

  ctx.emit({
    agent: "recommendations",
    kind: "proposal",
    round: 0,
    text: reasoning,
    data: {
      option: { type: "stay", title: hotel.name, price: hotel.totalPrice, currency: hotel.currency, facts: hotelFacts(hotel) },
      activities: activities.map((a) => ({ name: a.name, price: a.price })),
      ...(fallback ? { fallback } : {}),
      ...(decision.served ? { model: decision.served } : {}),
    },
  });

  return {
    stay: { candidates: collected.hotels, selectedId: hotel.id, notes: reasoning },
    activities: { candidates: collected.places, selectedIds: activityIds, notes: reasoning },
    usage: { ...ctx.meter },
  };
}

/** After a rejection aimed at the stay or the activities. */
export async function recommendationsRevise(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const instruction = state.negotiation.instruction;
  if (!instruction || instruction.target !== "recommendations") return {};
  return instruction.category === "stay" ? reviseStay(state, ctx) : reviseActivities(state, ctx);
}

async function reviseStay(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const instruction = state.negotiation.instruction!;
  const current = selectedHotel(state);
  if (!current) return {};
  const round = state.negotiation.round;
  const request = requestOf(state);
  const money = (n: number) => formatMoney(n, instruction.currency);
  const perNight = instruction.ceilingPerNight ?? Math.floor(instruction.ceiling / request.nights);
  const exhaust = () => ({ ...state.negotiation, exhausted: [...state.negotiation.exhausted, "stay" as const] });

  // The ceiling is a hard filter applied before any ranking.
  let candidates = state.stay.candidates;
  let fitting = candidates.filter((h) => h.totalPrice <= instruction.ceiling && h.id !== current.id);
  if (fitting.length === 0) {
    const more = await searchHotels(toolContext(state, ctx), perNight);
    candidates = mergeById(candidates, more);
    fitting = candidates.filter((h) => h.totalPrice <= instruction.ceiling && h.id !== current.id);
  }

  if (fitting.length === 0) {
    const cheapest = [...candidates].sort((a, b) => a.totalPrice - b.totalPrice)[0];
    if (!cheapest || cheapest.totalPrice >= current.totalPrice) {
      ctx.emit({
        agent: "recommendations",
        kind: "revision",
        round,
        text: `Nothing is available at or under ${money(perNight)} per night. ${current.name} at ${money(current.pricePerNight)} is the cheapest stay I can find.`,
      });
      return { stay: { ...state.stay, candidates }, negotiation: exhaust(), usage: { ...ctx.meter } };
    }
    const notes = `Nothing meets ${money(perNight)} per night. Switched to the cheapest stay, ${cheapest.name}, at ${money(cheapest.pricePerNight)} per night.`;
    ctx.emit({
      agent: "recommendations",
      kind: "revision",
      round,
      text: notes,
      data: {
        option: { type: "stay", title: cheapest.name, price: cheapest.totalPrice, currency: cheapest.currency, facts: hotelFacts(cheapest) },
      },
    });
    return { stay: { candidates, selectedId: cheapest.id, notes }, negotiation: exhaust(), usage: { ...ctx.meter } };
  }

  let chosen = bestRated(fitting)[0];
  let reasoning = "";
  let fallback: string | null = null;
  let served = null;
  if (fitting.length > 1) {
    const decision = await decide(ctx, {
      role: "worker",
      system: RECOMMENDATIONS_REVISE,
      user: JSON.stringify({
        task: "stay",
        ceilingPerNight: perNight,
        currency: instruction.currency,
        interests: request.interests,
        previous: { name: current.name, neighbourhood: current.neighbourhood },
        options: fitting.map((h) => ({
          id: h.id,
          name: h.name,
          rating: h.rating,
          neighbourhood: h.neighbourhood,
          pricePerNight: h.pricePerNight,
          amenities: h.amenities,
        })),
      }),
      schema: hotelPickSchema,
    });
    const picked = fitting.find((h) => h.id === decision.value?.hotelId);
    if (picked) {
      chosen = picked;
      reasoning = decision.value!.reasoning;
      served = decision.served;
    } else {
      fallback = decision.fallback ?? "the model picked a stay that is not under the ceiling";
    }
  }

  const notes =
    reasoning ||
    `Switched to ${chosen.name} at ${money(chosen.pricePerNight)} per night, under the ${money(perNight)} ceiling.`;
  ctx.emit({
    agent: "recommendations",
    kind: "revision",
    round,
    text: notes,
    data: {
      option: { type: "stay", title: chosen.name, price: chosen.totalPrice, currency: chosen.currency, facts: hotelFacts(chosen) },
      ...(fallback ? { fallback } : {}),
      ...(served ? { model: served } : {}),
    },
  });
  return { stay: { candidates, selectedId: chosen.id, notes }, usage: { ...ctx.meter } };
}

/** Best-rated set of `count` activities whose total stays under the ceiling. */
function affordableSet(candidates: PlaceOption[], count: number, perPersonCeiling: number): PlaceOption[] {
  const chosen: PlaceOption[] = [];
  let spent = 0;
  // Greedy by rating, skipping anything that would break the ceiling.
  for (const place of bestRated(candidates)) {
    if (chosen.length >= count) break;
    if (spent + place.price <= perPersonCeiling) {
      chosen.push(place);
      spent += place.price;
    }
  }
  return chosen;
}

async function reviseActivities(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const instruction = state.negotiation.instruction!;
  const round = state.negotiation.round;
  const request = requestOf(state);
  const money = (n: number) => formatMoney(n, instruction.currency);
  const current = selectedActivities(state);
  const currentCost = current.reduce((sum, a) => sum + a.price, 0) * request.travellers;
  const perPersonCeiling = instruction.ceiling / request.travellers;
  const exhausted = { ...state.negotiation, exhausted: [...state.negotiation.exhausted, "activities" as const] };

  let set = affordableSet(state.activities.candidates, current.length, perPersonCeiling);
  let negotiation = state.negotiation;
  if (set.length < current.length) {
    // Not enough cheap options for the same count: keep what fits and stop asking.
    negotiation = exhausted;
  }
  const cost = set.reduce((sum, a) => sum + a.price, 0) * request.travellers;
  if (cost >= currentCost) {
    ctx.emit({
      agent: "recommendations",
      kind: "revision",
      round,
      text: `I cannot get activities under ${money(instruction.ceiling)} without removing them. The current set costs ${money(currentCost)}.`,
    });
    return { negotiation: exhausted, usage: { ...ctx.meter } };
  }

  // Let the model swap within the affordable pool if there is real choice.
  const pool = state.activities.candidates.filter((p) => p.price <= perPersonCeiling);
  let reasoning = "";
  let fallback: string | null = null;
  let served = null;
  if (pool.length > set.length) {
    const decision = await decide(ctx, {
      role: "worker",
      system: RECOMMENDATIONS_REVISE,
      user: JSON.stringify({
        task: "activities",
        pick: set.length,
        ceilingPerPersonForAllPicked: Math.floor(perPersonCeiling),
        currency: instruction.currency,
        interests: request.interests,
        options: pool.map((p) => ({ id: p.id, name: p.name, category: p.category, rating: p.rating, pricePerPerson: p.price })),
      }),
      schema: activityPickSchema,
    });
    const ids = [...new Set(decision.value?.activityIds ?? [])];
    const picked = ids.map((id) => pool.find((p) => p.id === id)).filter((p): p is PlaceOption => Boolean(p));
    const pickedCost = picked.reduce((sum, a) => sum + a.price, 0);
    if (picked.length === set.length && pickedCost <= perPersonCeiling) {
      set = picked;
      reasoning = decision.value!.reasoning;
      served = decision.served;
    } else {
      fallback = decision.fallback ?? "the model's activity set was not under the ceiling";
    }
  }

  const finalCost = set.reduce((sum, a) => sum + a.price, 0) * request.travellers;
  const notes =
    reasoning ||
    `Swapped to ${set.length} activities costing ${money(finalCost)} in total, under the ${money(instruction.ceiling)} ceiling.`;
  ctx.emit({
    agent: "recommendations",
    kind: "revision",
    round,
    text: notes,
    data: {
      option: {
        type: "activities",
        title: `${set.length} activities`,
        price: finalCost,
        currency: instruction.currency,
        facts: set.map((a) => a.name),
      },
      ...(fallback ? { fallback } : {}),
      ...(served ? { model: served } : {}),
    },
  });
  return {
    activities: { ...state.activities, selectedIds: set.map((a) => a.id), notes },
    negotiation,
    usage: { ...ctx.meter },
  };
}
