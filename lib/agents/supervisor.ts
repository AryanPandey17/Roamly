import { runGeminiJson } from "@/lib/agents/gemini"
import { pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { buildUserRequest, calculateTotal, nightsBetween, pickConvenientFlight } from "@/lib/agents/math"
import { SUPERVISOR_FINALIZE_PROMPT, SUPERVISOR_PARSE_PROMPT } from "@/lib/agents/prompts"
import { defaultOrigin } from "@/lib/config"
import type { ActivityOffer, DayPlan, FinalItinerary, ParsedTripRequest, PlanTripInput, TripState } from "@/lib/types/trip"

function isoPlusDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function deterministicParse(input: PlanTripInput, _userRequest: string): ParsedTripRequest {
  const originDefault = defaultOrigin()
  const start = input.startDate || isoPlusDays(new Date().toISOString().slice(0, 10), 35)
  const end = input.endDate || isoPlusDays(start, 5)
  const assumptions: string[] = []
  if (!input.startDate) assumptions.push(`Start date was not specified; assumed ${start} (planning horizon ~5 weeks).`)
  if (!input.from) assumptions.push(`Origin was not specified; assumed ${originDefault.city}.`)
  const destination = input.destination || input.to || "Tokyo"
  if (!input.destination && !input.to) assumptions.push("Destination was ambiguous; assumed Tokyo.")
  const travelerCount = input.travelers || (input.tripType === "Couple" ? 2 : 1)
  if (!input.travelers) assumptions.push(`Traveler count defaulted to ${travelerCount}.`)
  return {
    destination,
    origin: input.from || `${originDefault.city} (${originDefault.iata})`,
    startDate: start,
    endDate: end,
    budgetTotal: input.budget || 200000,
    currency: input.currency || "INR",
    travelerCount,
    preferences: input.interests?.length ? input.interests : ["culture", "food"],
    assumptions,
  }
}

export async function parseRequest(input: PlanTripInput, useLlm: boolean): Promise<ParsedTripRequest> {
  const userRequest = input.userRequest || buildUserRequest(input)
  const fallback = deterministicParse(input, userRequest)
  if (!useLlm) {
    pipelineLog("supervisor.parse", "deterministic (no Gemini key)")
    return fallback
  }

  try {
    pipelineLog("supervisor.parse", "calling Gemini")
    const parsed = await runGeminiJson<ParsedTripRequest>({
      system: SUPERVISOR_PARSE_PROMPT,
      user: JSON.stringify({
        userRequest,
        structuredHints: input,
        today: new Date().toISOString().slice(0, 10),
        defaultOrigin: defaultOrigin(),
      }),
    })
    const merged: ParsedTripRequest = {
      destination: input.destination || input.to || parsed.destination || fallback.destination,
      origin: input.from || parsed.origin || fallback.origin,
      startDate: input.startDate || parsed.startDate || fallback.startDate,
      endDate: input.endDate || parsed.endDate || fallback.endDate,
      budgetTotal: input.budget || parsed.budgetTotal || fallback.budgetTotal,
      currency: input.currency || parsed.currency || fallback.currency,
      travelerCount: input.travelers || parsed.travelerCount || fallback.travelerCount,
      preferences: input.interests?.length ? input.interests : parsed.preferences?.length ? parsed.preferences : fallback.preferences,
      assumptions: parsed.assumptions?.length ? parsed.assumptions : fallback.assumptions,
    }
    pipelineLog("supervisor.parse", `merged dest=${merged.destination} origin=${merged.origin}`)
    return merged
  } catch (error) {
    pipelineWarn("supervisor.parse", "Gemini parse failed, using form defaults", error)
    return fallback
  }
}

function distributeDays(state: TripState, flightNotes?: string): DayPlan[] {
  const nights = nightsBetween(state.startDate, state.endDate)
  const days = nights + 1
  const activities = [...state.proposedActivities]
  const lateArrival = /no activities/i.test(flightNotes || "")
  const plans: DayPlan[] = []
  let cursor = lateArrival ? 0 : 0
  for (let i = 0; i < days; i++) {
    const date = isoPlusDays(state.startDate, i)
    const bucket: ActivityOffer[] = []
    if (i === 0 && lateArrival) {
      plans.push({ day: 1, date, activities: [], notes: "Late arrival — transit and check-in only." })
      continue
    }
    if (activities[cursor]) bucket.push(activities[cursor++])
    if (i > 0 && i < days - 1 && activities[cursor]) bucket.push(activities[cursor++])
    plans.push({
      day: i + 1,
      date,
      activities: bucket,
      notes: i === days - 1 ? "Departure day — keep the schedule light." : undefined,
    })
  }
  return plans
}

export async function finalizeItinerary(state: TripState, useLlm: boolean): Promise<FinalItinerary> {
  const nights = nightsBetween(state.startDate, state.endDate)
  const breakdown = calculateTotal({
    flights: state.proposedFlights,
    hotel: state.proposedHotel,
    activities: state.proposedActivities,
    nights,
    travelers: state.travelerCount,
  })
  const flight = pickConvenientFlight(state.proposedFlights)!
  const hotel = state.proposedHotel!

  const fallback: FinalItinerary = {
    destination: state.destination,
    dates: { start: state.startDate, end: state.endDate },
    flight,
    hotel,
    dayByDay: distributeDays(state, flight.notes),
    totalCost: breakdown.total,
    budgetTotal: state.budgetTotal,
    currency: state.currency,
    assumptions: state.assumptions,
    notes: state.budgetFeedback,
    costBreakdown: breakdown,
  }

  if (!useLlm) {
    pipelineLog("supervisor.finalize", "deterministic itinerary (no Gemini key)")
    return fallback
  }

  try {
    pipelineLog("supervisor.finalize", "calling Gemini")
    const result = await runGeminiJson<FinalItinerary>({
      system: SUPERVISOR_FINALIZE_PROMPT,
      user: JSON.stringify({
        destination: state.destination,
        dates: { start: state.startDate, end: state.endDate },
        proposedFlights: state.proposedFlights,
        proposedHotel: state.proposedHotel,
        proposedActivities: state.proposedActivities,
        assumptions: state.assumptions,
        budgetFeedback: state.budgetFeedback,
        calculateTotalResult: breakdown,
        instruction:
          "Do not invent costs. Use calculateTotalResult.total as totalCost. Distribute proposedActivities across days. Honor late-arrival notes on the chosen flight.",
      }),
    })
    pipelineLog("supervisor.finalize", `LLM days=${(result.dayByDay?.length ?? 0)} totalCost locked=${breakdown.total}`)
    return {
      ...fallback,
      ...result,
      totalCost: breakdown.total,
      costBreakdown: breakdown,
      flight: result.flight || flight,
      hotel: result.hotel || hotel,
      dayByDay: result.dayByDay?.length ? result.dayByDay : fallback.dayByDay,
      assumptions: result.assumptions?.length ? result.assumptions : state.assumptions,
    }
  } catch (error) {
    pipelineWarn("supervisor.finalize", "Gemini finalize failed, using deterministic itinerary", error)
    return fallback
  }
}
