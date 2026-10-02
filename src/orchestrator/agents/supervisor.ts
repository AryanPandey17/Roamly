import { z } from "zod";
import { DEFAULTS } from "../config";
import { RequestError } from "../errors";
import { SUPERVISOR_FINALIZE, SUPERVISOR_PARSE } from "../prompts";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryItem,
  ParsedRequest,
  Place,
  PlaceOption,
  TripStateType,
  TripStateUpdate,
} from "../state";
import { CACHE_TTL } from "../config";
import { calculateTripCost, formatMoney } from "../tools/calculator";
import { callProvider } from "../tools";
import { decide, type AgentContext } from "./runner";
import { requestOf, selectedActivities, selectedFlight, selectedHotel } from "./select";

// ---------------------------------------------------------------------------
// Dates (plain ISO strings, no time zones involved)
// ---------------------------------------------------------------------------
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
};
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toDate(value).getTime());

// ---------------------------------------------------------------------------
// Task A: parse the request
// ---------------------------------------------------------------------------
const parseSchema = z.object({
  destination: z.string().nullish(),
  origin: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  nights: z.number().nullish(),
  travellers: z.number().nullish(),
  budgetAmount: z.number().nullish(),
  currency: z.string().nullish(),
  interests: z.array(z.string()).nullish(),
  assumptions: z.array(z.string()).nullish(),
});

export async function parseRequest(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const hints = state.structuredHints;
  const prefs = state.preferences;
  const today = toIso(ctx.deps.now());
  const assumptions: string[] = [];

  ctx.emit({ agent: "supervisor", kind: "info", round: 0, text: "Reading the request." });

  const decision = await decide(ctx, {
    role: "reasoning",
    system: SUPERVISOR_PARSE,
    user: JSON.stringify({ today, request: state.rawRequest }),
    schema: parseSchema,
  });
  const parsed = decision.value ?? {};
  if (decision.value?.assumptions) assumptions.push(...decision.value.assumptions.slice(0, 6));

  // Precedence: form fields, then what the model read, then profile defaults.
  const destinationName = hints.destination ?? parsed.destination ?? null;
  if (!destinationName) {
    throw decision.fallback
      ? new RequestError("parse_failed", "The model could not read that request. Open \"Add details\" and fill in the destination and budget, then try again.")
      : new RequestError("destination_required", "I could not tell where you want to go. Add a destination and try again.");
  }

  const budgetAmount = hints.budget ?? parsed.budgetAmount ?? null;
  if (!budgetAmount || budgetAmount <= 0) {
    throw new RequestError("budget_required", "Add a total budget (for example \"$2000\") so the agents have a limit to work to.");
  }

  let currency = hints.currency ?? (/^[A-Z]{3}$/.test(parsed.currency ?? "") ? parsed.currency! : null);
  if (!currency) {
    currency = prefs.currency;
    assumptions.push(`No currency was given, so the budget is read as ${currency}.`);
  }

  let originName = hints.origin ?? parsed.origin ?? null;
  if (!originName) {
    if (!prefs.homeCity) {
      throw new RequestError("origin_required", "Say where you are travelling from, or set a home city in Settings.");
    }
    originName = prefs.homeCity;
    assumptions.push(`No departure city was given, so the trip starts from ${originName}.`);
  }

  let travellers = hints.travellers ?? parsed.travellers ?? null;
  if (!travellers || travellers < 1) {
    travellers = 1;
    assumptions.push("No group size was given, so this is planned for 1 traveller.");
  }
  travellers = Math.round(travellers);

  // Dates: use what is given, fill the rest, and say what was filled.
  let start = hints.startDate ?? (isIsoDate(parsed.startDate) ? parsed.startDate : null);
  let end = hints.endDate ?? (isIsoDate(parsed.endDate) ? parsed.endDate : null);
  let nights = parsed.nights && parsed.nights >= 1 ? Math.round(parsed.nights) : null;

  if (start && end) {
    nights = daysBetween(start, end);
  } else {
    if (!nights) {
      nights = DEFAULTS.nights;
      assumptions.push(`No trip length was given, so this is planned for ${nights} nights.`);
    }
    if (!start && end) start = addDays(end, -nights);
    if (!start) {
      start = addDays(today, DEFAULTS.leadTimeDays);
      assumptions.push(`No dates were given, so the trip starts on ${start}, about ${DEFAULTS.leadTimeDays / 7} weeks from today.`);
    }
    end = addDays(start, nights);
  }

  if (nights < 1) throw new RequestError("invalid_dates", "The return date must be after the departure date.");
  if (nights > 30) throw new RequestError("trip_too_long", "Trips longer than 30 nights are not supported yet.");
  if (start < today) throw new RequestError("dates_in_past", "The departure date is in the past. Pick a future date.");

  const interests =
    hints.interests?.length ? hints.interests : parsed.interests?.length ? parsed.interests.slice(0, 8) : prefs.interests;

  // Real coordinates for both ends, so nothing downstream guesses a location.
  const callCtx = { telemetry: ctx.deps.telemetry, cache: ctx.deps.cache, meta: ctx.meta, meter: ctx.meter };
  const geocode = (query: string): Promise<Place | null> =>
    callProvider(
      callCtx,
      "geocode_place",
      ctx.deps.providers.geocoding.name,
      () => ctx.deps.providers.geocoding.geocode(query),
      { input: { query: query.toLowerCase().trim() }, ttlSeconds: CACHE_TTL.geocode }
    );

  const [destination, origin] = await Promise.all([geocode(destinationName), geocode(originName)]);
  if (!destination) {
    throw new RequestError("destination_not_found", `I could not find "${destinationName}" on the map. Check the spelling.`);
  }
  if (!origin) {
    throw new RequestError("origin_not_found", `I could not find "${originName}" on the map. Check the spelling.`);
  }

  const request: ParsedRequest = {
    destination,
    origin,
    startDate: start,
    endDate: end!,
    nights,
    days: nights + 1,
    travellers,
    budget: { amount: budgetAmount, currency },
    interests,
  };

  ctx.emit({
    agent: "supervisor",
    kind: "info",
    round: 0,
    text:
      `Parsed: ${destination.name}${destination.country ? `, ${destination.country}` : ""}, ` +
      `${request.days} days / ${nights} nights from ${start}, ${travellers} traveller${travellers > 1 ? "s" : ""}, ` +
      `budget ${formatMoney(budgetAmount, currency)}, departing ${origin.name}. ` +
      "Asking Logistics and Recommendations for their proposals.",
    data: {
      assumptions,
      ...(decision.fallback ? { fallback: decision.fallback } : {}),
      ...(decision.served ? { model: decision.served } : {}),
    },
  });

  return { request, assumptions, usage: { ...ctx.meter } };
}

// ---------------------------------------------------------------------------
// Mediation: turn Budget's rejection into an instruction for one agent
// ---------------------------------------------------------------------------
export function mediate(state: TripStateType, ctx: AgentContext): TripStateUpdate {
  const instruction = state.negotiation.instruction;
  if (!instruction) return {};
  const round = state.negotiation.round + 1;
  const money = (n: number) => formatMoney(n, instruction.currency);
  const who = instruction.target === "logistics" ? "Logistics" : "Recommendations";
  const ask =
    instruction.category === "stay"
      ? `find a stay at or under ${money(instruction.ceilingPerNight ?? 0)} per night`
      : instruction.category === "flights"
        ? `find flights at or under ${money(instruction.ceiling)} in total`
        : `bring activities to ${money(instruction.ceiling)} or less in total`;

  ctx.emit({
    agent: "supervisor",
    kind: "mediation",
    round,
    text: `Budget rejected the plan. ${who}, ${ask}. Keep everything else as it is.`,
    data: { instruction },
  });
  return { negotiation: { ...state.negotiation, round } };
}

// ---------------------------------------------------------------------------
// Task B: finalize the itinerary
// ---------------------------------------------------------------------------
const scheduleSchema = z.object({
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1),
        title: z.string().max(80),
        items: z.array(z.object({ placeId: z.string(), startTime: z.string().regex(/^\d{2}:\d{2}$/) })),
      })
    )
    .min(1),
  summary: z.string().max(600),
});

type Schedule = { titles: Map<number, string>; slots: Map<number, { place: PlaceOption; startTime: string }[]> };

const SLOT_TIMES = ["09:30", "13:30", "17:00", "19:30"];
const clock = (isoLocal: string) => isoLocal.slice(11, 16);
const plusMinutes = (hhmm: string, minutes: number) => {
  const total = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Even spread over the allowed days, longest activities first. Used when the model's schedule is unusable. */
function distribute(activities: PlaceOption[], allowedDays: number[]): Schedule {
  const slots = new Map<number, { place: PlaceOption; startTime: string }[]>();
  for (const day of allowedDays) slots.set(day, []);
  const ordered = [...activities].sort((a, b) => b.durationMinutes - a.durationMinutes);
  for (const place of ordered) {
    const day = [...slots.entries()].sort((a, b) => a[1].length - b[1].length || a[0] - b[0])[0]?.[0];
    if (day === undefined) break;
    const list = slots.get(day)!;
    list.push({ place, startTime: SLOT_TIMES[Math.min(list.length, SLOT_TIMES.length - 1)] });
  }
  return { titles: new Map(), slots };
}

const weatherLine = (w: { tempMax: number; tempMin: number; rainChance: number | null } | undefined) =>
  w
    ? `${Math.round(w.tempMax)}° / ${Math.round(w.tempMin)}°${w.rainChance !== null ? `, ${Math.round(w.rainChance)}% chance of rain` : ""}`
    : null;

export async function finalize(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const request = requestOf(state);
  const flight = selectedFlight(state);
  const hotel = selectedHotel(state);
  const activities = selectedActivities(state);
  const estimates = state.estimates;
  if (!flight || !hotel || !estimates) {
    throw new RequestError("incomplete_plan", "The agents could not put together a flight and a stay for this trip.");
  }
  const currency = request.budget.currency;
  const money = (n: number) => formatMoney(n, currency);

  // Totals always come from the calculator, for exactly the selected items.
  const breakdown = calculateTripCost({
    flight,
    hotel,
    activities,
    days: request.days,
    travellers: request.travellers,
    estimates,
    currency,
  });
  const overBy = Math.max(0, Math.round((breakdown.total - request.budget.amount) * 100) / 100);
  const fitsBudget = overBy === 0;

  // Day 1 has room for activities only if the flight lands on day 1 before mid-afternoon.
  // The last day only if the return flight leaves in the afternoon or later.
  const lastDay = request.days;
  const arrivesDayOne = flight.arriveAt.slice(0, 10) === request.startDate && Number(clock(flight.arriveAt).slice(0, 2)) < 15;
  const lateDeparture = flight.returnDepartAt ? Number(clock(flight.returnDepartAt).slice(0, 2)) >= 15 : false;
  let allowedDays = Array.from({ length: request.days }, (_, i) => i + 1).filter(
    (day) => (day !== 1 || arrivesDayOne) && (day !== lastDay || lateDeparture)
  );
  if (allowedDays.length === 0) allowedDays = [Math.min(2, lastDay)];

  let schedule = distribute(activities, allowedDays);
  let summary = "";
  let fallback: string | null = null;
  let served = null;

  if (activities.length > 0) {
    const decision = await decide(ctx, {
      role: "reasoning",
      system: SUPERVISOR_FINALIZE,
      user: JSON.stringify({
        destination: request.destination.name,
        days: request.days,
        allowedDays,
        pace: state.preferences.pace,
        flightArrives: flight.arriveAt,
        returnFlightDeparts: flight.returnDepartAt,
        activities: activities.map((a) => ({ id: a.id, name: a.name, category: a.category, durationMinutes: a.durationMinutes })),
      }),
      schema: scheduleSchema,
    });

    if (decision.value) {
      // Accept the model's schedule only if it uses every chosen activity exactly once, on allowed days.
      const byId = new Map(activities.map((a) => [a.id, a]));
      const seen = new Set<string>();
      const slots = new Map<number, { place: PlaceOption; startTime: string }[]>();
      const titles = new Map<number, string>();
      let valid = true;
      for (const day of decision.value.days) {
        titles.set(day.dayNumber, day.title);
        for (const item of day.items) {
          const place = byId.get(item.placeId);
          if (!place || seen.has(item.placeId) || !allowedDays.includes(day.dayNumber)) valid = false;
          else {
            seen.add(item.placeId);
            slots.set(day.dayNumber, [...(slots.get(day.dayNumber) ?? []), { place, startTime: item.startTime }]);
          }
        }
      }
      if (valid && seen.size === activities.length) {
        schedule = { titles, slots };
        summary = decision.value.summary;
        served = decision.served;
      } else {
        fallback = "the model's schedule did not use each chosen activity exactly once on an allowed day";
      }
    } else {
      fallback = decision.fallback;
    }
  }

  const dailyEstimate = (estimates.foodPerDay + estimates.localTransportPerDay) * request.travellers;
  const days: ItineraryDay[] = [];
  for (let dayNumber = 1; dayNumber <= request.days; dayNumber++) {
    const items: ItineraryItem[] = [];

    if (dayNumber === 1) {
      items.push({
        type: "flight",
        title: `${flight.airline} ${flight.flightNumber}: ${flight.origin} to ${flight.destination}`,
        description:
          `Round trip for ${request.travellers}. ` +
          (flight.stops === 0 ? "Direct." : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}.`) +
          (flight.arriveAt.slice(0, 10) !== request.startDate ? ` Lands on ${flight.arriveAt.slice(0, 10)}.` : "") +
          (flight.redFlags.length ? ` Note: ${flight.redFlags.join(" ")}` : ""),
        startTime: clock(flight.departAt),
        endTime: clock(flight.arriveAt),
        cost: flight.price,
        isEstimate: false,
        sourceUrl: null,
        lat: flight.arrivalAirport?.lat ?? null,
        lng: flight.arrivalAirport?.lng ?? null,
        provider: flight.provider,
        externalId: flight.id,
        deepLink: flight.deepLink,
      });
      if (state.flights.transferMinutes !== null) {
        items.push({
          type: "transfer",
          title: "Airport to city centre",
          description: `About ${state.flights.transferMinutes} minutes.`,
          startTime: clock(flight.arriveAt),
          endTime: plusMinutes(clock(flight.arriveAt), state.flights.transferMinutes),
          cost: 0,
          isEstimate: false,
          sourceUrl: null,
          lat: null,
          lng: null,
          provider: null,
          externalId: null,
          deepLink: null,
        });
      }
      items.push({
        type: "stay",
        title: `Check in: ${hotel.name}`,
        description: `${request.nights} night${request.nights > 1 ? "s" : ""}${hotel.neighbourhood ? `, ${hotel.neighbourhood}` : ""}.`,
        startTime: null,
        endTime: null,
        cost: hotel.totalPrice,
        isEstimate: false,
        sourceUrl: null,
        lat: hotel.lat,
        lng: hotel.lng,
        provider: hotel.provider,
        externalId: hotel.id,
        deepLink: hotel.deepLink,
      });
    }

    const slots = [...(schedule.slots.get(dayNumber) ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const { place, startTime } of slots) {
      items.push({
        type: "activity",
        title: place.name,
        description: place.priceKnown ? place.description : `${place.description} Entry price not found; not included in the total.`,
        startTime,
        endTime: plusMinutes(startTime, place.durationMinutes),
        cost: Math.round(place.price * request.travellers * 100) / 100,
        isEstimate: place.priceIsEstimate,
        sourceUrl: place.sourceUrl,
        lat: place.lat,
        lng: place.lng,
        provider: place.provider,
        externalId: place.id,
        deepLink: place.deepLink,
      });
    }

    if (estimates.available) {
      items.push({
        type: "meal",
        title: "Food and local transport",
        description: `Daily estimate for ${request.travellers} traveller${request.travellers > 1 ? "s" : ""}.`,
        startTime: null,
        endTime: null,
        cost: Math.round(dailyEstimate * 100) / 100,
        isEstimate: true,
        sourceUrl: estimates.sourceUrl,
        lat: null,
        lng: null,
        provider: estimates.source,
        externalId: null,
        deepLink: estimates.sourceUrl,
      });
    }

    if (dayNumber === lastDay) {
      items.push({
        type: "flight",
        title: `Return flight to ${flight.origin}`,
        description: flight.returnDepartAt
          ? "Included in the round-trip price."
          : "Included in the round-trip price. Choose the return time on the booking page.",
        startTime: flight.returnDepartAt ? clock(flight.returnDepartAt) : null,
        endTime: null,
        cost: 0,
        isEstimate: false,
        sourceUrl: null,
        lat: flight.arrivalAirport?.lat ?? null,
        lng: flight.arrivalAirport?.lng ?? null,
        provider: flight.provider,
        externalId: flight.id,
        deepLink: flight.deepLink,
      });
    }

    const defaultTitle =
      dayNumber === 1 ? "Arrival" : dayNumber === lastDay ? "Departure" : slots[0]?.place.category ?? "Free day";
    days.push({
      dayNumber,
      date: addDays(request.startDate, dayNumber - 1),
      title: schedule.titles.get(dayNumber) ?? defaultTitle,
      weather: weatherLine(state.weather.find((w) => w.date === addDays(request.startDate, dayNumber - 1))),
      items,
    });
  }

  if (!summary) {
    summary = `${request.days} days in ${request.destination.name} with ${activities.length} planned activit${activities.length === 1 ? "y" : "ies"}, staying at ${hotel.name}.`;
  }

  const verdict = fitsBudget
    ? `Within budget: ${money(breakdown.total)} of ${money(request.budget.amount)}.`
    : `Over budget by ${money(overBy)}: ${money(breakdown.total)} against ${money(request.budget.amount)}.`;

  const markdown = [
    `# ${request.destination.name}: ${request.startDate} to ${request.endDate}`,
    "",
    summary,
    "",
    `**${verdict}**`,
    "",
    "| Category | Cost |",
    "|---|---|",
    `| Flights | ${money(breakdown.flights)} |`,
    `| Stay | ${money(breakdown.stay)} |`,
    `| Activities | ${money(breakdown.activities)} |`,
    `| Food (estimate) | ${money(breakdown.food)} |`,
    `| Local transport (estimate) | ${money(breakdown.localTransport)} |`,
    `| **Total** | **${money(breakdown.total)}** |`,
    "",
    ...days.flatMap((day) => [
      `## Day ${day.dayNumber} · ${day.date} · ${day.title}`,
      "",
      ...(day.weather ? [`_Forecast: ${day.weather}_`, ""] : []),
      ...day.items.map((item) => {
        const time = item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ""} ` : "";
        const cost = item.cost > 0 ? ` (${item.isEstimate ? "est. " : ""}${money(item.cost)})` : "";
        const title = item.deepLink ? `[${item.title}](${item.deepLink})` : item.title;
        return `- ${time}${title}${cost}`;
      }),
      "",
    ]),
  ].join("\n");

  const assumptions = [
    ...state.assumptions,
    ...(estimates.available
      ? ["Food and local transport are estimates from a web source, not quoted prices."]
      : ["Daily food and local transport costs could not be estimated and are not included in the total."]),
  ];

  const itinerary: Itinerary = {
    destination: request.destination.name,
    startDate: request.startDate,
    endDate: request.endDate,
    travellers: request.travellers,
    currency,
    budget: request.budget.amount,
    breakdown,
    fitsBudget,
    overBy,
    days,
    assumptions,
    summary,
    markdown: [markdown, "## Notes", "", ...assumptions.map((a) => `- ${a}`), ""].join("\n"),
  };

  ctx.emit({
    agent: "supervisor",
    kind: "final",
    round: state.negotiation.round,
    text: `Itinerary ready. ${verdict}`,
    data: { ...(fallback ? { fallback } : {}), ...(served ? { model: served } : {}) },
  });

  return { itinerary, usage: { ...ctx.meter } };
}
