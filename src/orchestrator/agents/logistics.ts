import { z } from "zod";
import { LOGISTICS, LOGISTICS_REVISE } from "../prompts";
import type { FlightOption, TripStateType, TripStateUpdate } from "../state";
import { formatMoney } from "../tools/calculator";
import { logisticsTools, searchFlights, travelMinutes, type ToolContext } from "../tools";
import { decide, type AgentContext } from "./runner";
import { mergeById, requestOf, selectedFlight } from "./select";

const pickSchema = z.object({ selectedId: z.string(), reasoning: z.string().max(600) });

/** Convenience ranking used when the model's choice is unusable. Price is not a factor. */
function mostConvenient(flights: FlightOption[]): FlightOption {
  return [...flights].sort(
    (a, b) => a.redFlags.length - b.redFlags.length || a.durationMinutes - b.durationMinutes || a.stops - b.stops
  )[0];
}

const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

function describe(flight: FlightOption) {
  return [
    hours(flight.durationMinutes),
    flight.stops === 0 ? "direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`,
    `arrives ${flight.arriveAt.slice(11, 16)}`,
    ...flight.redFlags,
  ];
}

function toolContext(state: TripStateType, ctx: AgentContext): ToolContext {
  return {
    request: requestOf(state),
    providers: ctx.deps.providers,
    telemetry: ctx.deps.telemetry,
    cache: ctx.deps.cache,
    meta: ctx.meta,
    meter: ctx.meter,
  };
}

async function transferMinutes(state: TripStateType, ctx: AgentContext, flight: FlightOption) {
  if (!flight.arrivalAirport) return null;
  const tc = toolContext(state, ctx);
  return travelMinutes(tc, flight.arrivalAirport, tc.request.destination);
}

/** Round 0: propose the most convenient flight, ignoring cost. */
export async function logisticsPropose(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const request = requestOf(state);
  const tc = toolContext(state, ctx);
  const { tools, collected } = logisticsTools(tc);

  const decision = await decide(ctx, {
    role: "worker",
    system: LOGISTICS,
    user: JSON.stringify({
      origin: request.origin.name,
      destination: request.destination.name,
      departDate: request.startDate,
      returnDate: request.endDate,
      travellers: request.travellers,
    }),
    schema: pickSchema,
    tools,
  });

  // The model must search before it can pick. If it never did, search for it.
  let fallback = decision.fallback;
  if (collected.flights.length === 0) {
    collected.flights = await searchFlights(tc);
    fallback ??= "the model did not call search_flights";
  }
  if (collected.flights.length === 0) {
    ctx.emit({ agent: "logistics", kind: "error", round: 0, text: "No flights were found for these dates." });
    return { flights: { candidates: [], selectedId: null, notes: "No flights found.", transferMinutes: null } };
  }

  // Only ids that came back from the tool may be selected.
  let chosen = collected.flights.find((f) => f.id === decision.value?.selectedId);
  if (!chosen) {
    if (decision.value) fallback = `the model picked an unknown flight id "${decision.value.selectedId}"`;
    chosen = mostConvenient(collected.flights);
  }

  const transfer = collected.transferMinutes ?? (await transferMinutes(state, ctx, chosen));
  const reasoning =
    (!fallback && decision.value?.reasoning) ||
    `Proposing the most convenient option: ${describe(chosen).slice(0, 3).join(", ")}.`;
  const notes = transfer !== null ? `${reasoning} Airport to centre is about ${transfer} minutes.` : reasoning;

  ctx.emit({
    agent: "logistics",
    kind: "proposal",
    round: 0,
    text: notes,
    data: {
      option: {
        type: "flight",
        title: `${chosen.airline} ${chosen.flightNumber}`,
        price: chosen.price,
        currency: chosen.currency,
        facts: describe(chosen),
      },
      ...(fallback ? { fallback } : {}),
      ...(decision.served ? { model: decision.served } : {}),
    },
  });

  return {
    flights: { candidates: collected.flights, selectedId: chosen.id, notes, transferMinutes: transfer },
    usage: { ...ctx.meter },
  };
}

/** After a rejection aimed at flights: stay under the ceiling, then maximise convenience. */
export async function logisticsRevise(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const instruction = state.negotiation.instruction;
  const current = selectedFlight(state);
  if (!instruction || instruction.category !== "flights" || !current) return {};
  const round = state.negotiation.round;
  const money = (n: number) => formatMoney(n, instruction.currency);

  // First look at what we already have; search again only if nothing fits.
  let candidates = state.flights.candidates;
  let fitting = candidates.filter((f) => f.price <= instruction.ceiling && f.id !== current.id);
  if (fitting.length === 0) {
    const more = await searchFlights(toolContext(state, ctx), instruction.ceiling);
    candidates = mergeById(candidates, more);
    fitting = candidates.filter((f) => f.price <= instruction.ceiling && f.id !== current.id);
  }

  if (fitting.length === 0) {
    // Nothing meets the ceiling. Take the cheapest if it at least saves money.
    const cheapest = [...candidates].sort((a, b) => a.price - b.price)[0];
    if (!cheapest || cheapest.price >= current.price) {
      ctx.emit({
        agent: "logistics",
        kind: "revision",
        round,
        text: `No flight is available at or under ${money(instruction.ceiling)}. ${money(current.price)} is already the cheapest route I can find.`,
      });
      return {
        flights: { ...state.flights, candidates },
        negotiation: { ...state.negotiation, exhausted: [...state.negotiation.exhausted, "flights"] },
        usage: { ...ctx.meter },
      };
    }
    const transfer = await transferMinutes(state, ctx, cheapest);
    const notes = `Nothing meets ${money(instruction.ceiling)}. Switched to the cheapest route at ${money(cheapest.price)}: ${describe(cheapest).join(", ")}.`;
    ctx.emit({
      agent: "logistics",
      kind: "revision",
      round,
      text: notes,
      data: {
        option: {
          type: "flight",
          title: `${cheapest.airline} ${cheapest.flightNumber}`,
          price: cheapest.price,
          currency: cheapest.currency,
          facts: describe(cheapest),
        },
      },
    });
    return {
      flights: { candidates, selectedId: cheapest.id, notes, transferMinutes: transfer },
      negotiation: { ...state.negotiation, exhausted: [...state.negotiation.exhausted, "flights"] },
      usage: { ...ctx.meter },
    };
  }

  // Several fit: let the model choose on convenience. One fits: no need to ask.
  let chosen = mostConvenient(fitting);
  let reasoning = "";
  let fallback: string | null = null;
  let served = null;
  if (fitting.length > 1) {
    const decision = await decide(ctx, {
      role: "worker",
      system: LOGISTICS_REVISE,
      user: JSON.stringify({
        ceiling: instruction.ceiling,
        currency: instruction.currency,
        options: fitting.map((f) => ({
          id: f.id,
          durationMinutes: f.durationMinutes,
          stops: f.stops,
          layoverMinutes: f.layoverMinutes,
          arriveAt: f.arriveAt,
          price: f.price,
          redFlags: f.redFlags,
        })),
      }),
      schema: pickSchema,
    });
    const picked = fitting.find((f) => f.id === decision.value?.selectedId);
    if (picked) {
      chosen = picked;
      reasoning = decision.value!.reasoning;
      served = decision.served;
    } else {
      fallback = decision.fallback ?? "the model picked a flight that is not under the ceiling";
    }
  }

  const transfer = await transferMinutes(state, ctx, chosen);
  const notes =
    reasoning ||
    `Switched to a flight at ${money(chosen.price)}, under the ${money(instruction.ceiling)} ceiling: ${describe(chosen).slice(0, 3).join(", ")}.`;

  ctx.emit({
    agent: "logistics",
    kind: "revision",
    round,
    text: notes,
    data: {
      option: {
        type: "flight",
        title: `${chosen.airline} ${chosen.flightNumber}`,
        price: chosen.price,
        currency: chosen.currency,
        facts: describe(chosen),
      },
      ...(fallback ? { fallback } : {}),
      ...(served ? { model: served } : {}),
    },
  });

  return {
    flights: { candidates, selectedId: chosen.id, notes, transferMinutes: transfer },
    usage: { ...ctx.meter },
  };
}
