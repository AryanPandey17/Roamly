import { LIMITS } from "../config";
import type { BudgetSnapshot } from "../events";
import { BUDGET_VOICE } from "../prompts";
import type { BudgetAudit, Category, Estimates, TripStateType, TripStateUpdate } from "../state";
import {
  calculateTripCost,
  cheapestActivities,
  chooseInstruction,
  formatMoney,
} from "../tools/calculator";
import { callProvider } from "../tools";
import { narrate, type AgentContext } from "./runner";
import { requestOf, selectedActivities, selectedFlight, selectedHotel } from "./select";

const LABEL: Record<Category, string> = { flights: "Flights", stay: "Stay", activities: "Activities" };

async function ensureEstimates(state: TripStateType, ctx: AgentContext): Promise<Estimates> {
  if (state.estimates) return state.estimates;
  const request = requestOf(state);
  return callProvider(
    { telemetry: ctx.deps.telemetry, meta: ctx.meta, meter: ctx.meter },
    "estimate_daily_costs", ctx.deps.providers.costOfLiving.name, () =>
    ctx.deps.providers.costOfLiving.dailyEstimates({
      destination: request.destination,
      currency: request.budget.currency,
      style: state.preferences.budgetStyle,
    })
  );
}

/**
 * The model's wording is used only if it repeats the calculator's numbers.
 * Anything else (invented figures, off-topic text) falls back to the template.
 */
function faithful(reply: string | null, amounts: number[]): string | null {
  if (!reply) return null;
  const digits = reply.replace(/[^0-9]/g, "");
  return amounts.every((amount) => digits.includes(String(Math.round(amount)))) ? reply : null;
}

const snapshot = (audit: BudgetAudit): BudgetSnapshot => ({
  total: audit.breakdown.total,
  limit: audit.budget,
  currency: audit.breakdown.currency,
  status: audit.status,
  overBy: audit.overBy,
  breakdown: audit.breakdown,
});

/**
 * The audit. The verdict, the target and the ceiling are all computed in code
 * from the calculator. The model is only asked to put the verdict into words,
 * and the templated sentence is used if it cannot.
 */
export async function budgetAudit(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const request = requestOf(state);
  const flight = selectedFlight(state);
  const hotel = selectedHotel(state);
  const activities = selectedActivities(state);
  const round = state.negotiation.round;
  const currency = request.budget.currency;
  const money = (n: number) => formatMoney(n, currency);

  const estimates = await ensureEstimates(state, ctx);
  const breakdown = calculateTripCost({
    flight,
    hotel,
    activities,
    days: request.days,
    travellers: request.travellers,
    estimates,
    currency,
  });

  const budget = request.budget.amount;
  const overBy = Math.max(0, Math.round((breakdown.total - budget) * 100) / 100);
  // A plan without a priced flight or stay can never be approved.
  const complete = Boolean(flight && hotel);
  const approved = complete && breakdown.total <= budget;

  if (approved) {
    const template = `Approved. Total is ${money(breakdown.total)} against ${money(budget)}, leaving ${money(budget - breakdown.total)}.`;
    const feedback =
      faithful(
        await narrate(
          ctx,
          BUDGET_VOICE,
          JSON.stringify({ verdict: "approved", total: money(breakdown.total), budget: money(budget), margin: money(budget - breakdown.total) })
        ),
        [breakdown.total]
      ) ?? template;
    const audit: BudgetAudit = { round, status: "approved", budget, breakdown, overBy: 0, instruction: null, feedback };
    ctx.emit({ agent: "budget", kind: "approval", round, text: feedback, data: { budget: snapshot(audit) } });
    return {
      estimates,
      budget: { status: "approved", breakdown, overBy: 0, feedback },
      negotiation: { ...state.negotiation, instruction: null },
      audits: [audit],
      usage: { ...ctx.meter },
    };
  }

  const instruction = complete
    ? chooseInstruction({
        breakdown,
        overBy,
        nights: request.nights,
        alternatives: {
          flights: state.flights.candidates,
          hotels: state.stay.candidates,
          places: state.activities.candidates,
          selectedActivityCount: activities.length,
          travellers: request.travellers,
        },
        exhausted: state.negotiation.exhausted,
      })
    : null;

  const demand = instruction
    ? instruction.category === "stay"
      ? `Need accommodation at or under ${money(instruction.ceilingPerNight ?? 0)} per night.`
      : `Need ${LABEL[instruction.category].toLowerCase()} at or under ${money(instruction.ceiling)}.`
    : "Nothing cheaper is left to negotiate.";
  // Name the category being targeted; with nothing left to target, the largest one.
  const largest =
    instruction?.category ?? (["stay", "flights", "activities"] as Category[]).sort((a, b) => breakdown[b] - breakdown[a])[0];
  const template = complete
    ? `Rejected. Total is ${money(breakdown.total)} against ${money(budget)}, over by ${money(overBy)}. ${LABEL[largest]} is ${breakdown.percent[largest]}% of cost. ${demand}`
    : "Rejected. The plan is missing a flight or a stay, so it cannot be priced.";

  const feedback =
    (complete &&
      instruction &&
      faithful(
        await narrate(
          ctx,
          BUDGET_VOICE,
          JSON.stringify({
            verdict: "rejected",
            total: money(breakdown.total),
            budget: money(budget),
            overBy: money(overBy),
            demand,
          })
        ),
        [overBy, instruction.ceilingPerNight ?? instruction.ceiling]
      )) ||
    template;

  const rejections = state.negotiation.rejections + 1;
  const audit: BudgetAudit = { round, status: "rejected", budget, breakdown, overBy, instruction, feedback };
  ctx.emit({
    agent: "budget",
    kind: "rejection",
    round,
    text: feedback,
    data: { budget: snapshot(audit), instruction, rejections, maxRejections: LIMITS.maxRejections },
  });

  return {
    estimates,
    budget: { status: "rejected", breakdown, overBy, feedback },
    negotiation: { ...state.negotiation, rejections, instruction },
    audits: [audit],
    usage: { ...ctx.meter },
  };
}

/**
 * Reached after the rejection cap (or when nothing is left to negotiate).
 * Builds the cheapest feasible plan from every option seen and labels it
 * honestly: it is only "within budget" if the calculator says so.
 */
export async function compromise(state: TripStateType, ctx: AgentContext): Promise<TripStateUpdate> {
  const request = requestOf(state);
  const currency = request.budget.currency;
  const money = (n: number) => formatMoney(n, currency);
  const round = state.negotiation.round + 1;
  const estimates = await ensureEstimates(state, ctx);

  const flight = [...state.flights.candidates].sort((a, b) => a.price - b.price)[0] ?? null;
  const hotel = [...state.stay.candidates].sort((a, b) => a.totalPrice - b.totalPrice)[0] ?? null;
  // Keep the same number of activities, cheapest first (free ones win).
  const activities = cheapestActivities(state.activities.candidates, state.activities.selectedIds.length);

  const breakdown = calculateTripCost({
    flight,
    hotel,
    activities,
    days: request.days,
    travellers: request.travellers,
    estimates,
    currency,
  });
  const budget = request.budget.amount;
  const overBy = Math.max(0, Math.round((breakdown.total - budget) * 100) / 100);
  const fits = Boolean(flight && hotel) && overBy === 0;

  const feedback = fits
    ? `Compromise reached. Using the cheapest flight, stay and activities found, the total is ${money(breakdown.total)} against ${money(budget)}.`
    : `No plan fits this budget. The cheapest combination found is ${money(breakdown.total)}, over ${money(budget)} by ${money(overBy)}. To close the gap: raise the budget, shorten the trip, or move the dates.`;

  const audit: BudgetAudit = { round, status: "compromise", budget, breakdown, overBy, instruction: null, feedback };
  ctx.emit({
    agent: "supervisor",
    kind: "compromise",
    round,
    text: feedback,
    data: { budget: snapshot(audit) },
  });

  return {
    estimates,
    flights: { ...state.flights, selectedId: flight?.id ?? null },
    stay: { ...state.stay, selectedId: hotel?.id ?? null },
    activities: { ...state.activities, selectedIds: activities.map((a) => a.id) },
    budget: { status: "compromise", breakdown, overBy, feedback },
    negotiation: { ...state.negotiation, round, instruction: null },
    audits: [audit],
    usage: { ...ctx.meter },
  };
}
