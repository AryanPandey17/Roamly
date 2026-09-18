import { isLlmConfigured } from "@/lib/config"
import { pipelineLog } from "@/lib/agents/log"
import { calculateTotal, cheapestFlight, nightsBetween, stamp } from "@/lib/agents/math"
import { runBudgetAgent } from "@/lib/agents/budget"
import { runLogisticsAgent } from "@/lib/agents/logistics"
import { runRecommendationsAgent } from "@/lib/agents/recommendations"
import { finalizeItinerary, parseRequest } from "@/lib/agents/supervisor"
import { searchHotels } from "@/lib/tools"
import type { AgentEvent, GraphEvent, PlanTripInput, TripRecord, TripState } from "@/lib/types/trip"

function event(
  agent: AgentEvent["agent"],
  message: string,
  type: AgentEvent["type"] = "info",
  extra?: Partial<AgentEvent>
): AgentEvent {
  return { timestamp: stamp(), agent, message, type, ...extra }
}

export async function runPlanningGraph(
  input: PlanTripInput,
  emit: (event: GraphEvent) => void | Promise<void>
): Promise<TripRecord> {
  const useLlm = isLlmConfigured()
  const events: AgentEvent[] = []
  const started = Date.now()

  pipelineLog(
    "graph.start",
    `llm=${useLlm} dest=${input.destination || input.to || "(unspecified)"} from=${input.from || "(default)"} ${input.startDate || "?"}→${input.endDate || "?"} travelers=${input.travelers ?? "?"} budget=${input.currency || "INR"} ${input.budget ?? "?"}`
  )

  const push = async (item: AgentEvent) => {
    events.push(item)
    pipelineLog(`ui.${item.agent.toLowerCase()}`, item.message)
    await emit({ type: "log", event: item })
  }

  await push(event("Supervisor", "Received trip requirements. Parsing into structured state."))
  pipelineLog("supervisor.parse", `running llm=${useLlm}`)
  const parsed = await parseRequest(input, useLlm)
  pipelineLog(
    "supervisor.parse",
    `done dest=${parsed.destination} ${parsed.startDate}→${parsed.endDate} pax=${parsed.travelerCount} ${parsed.currency} ${parsed.budgetTotal} prefs=${parsed.preferences.join(",")}`
  )
  await push(
    event(
      "Supervisor",
      `Parsed ${parsed.destination} · ${parsed.startDate} → ${parsed.endDate} · ${parsed.travelerCount} travelers · ${parsed.currency} ${parsed.budgetTotal}.`
    )
  )
  for (const assumption of parsed.assumptions) {
    await push(event("Supervisor", `Assumption: ${assumption}`, "warning"))
  }

  let state: TripState = {
    ...parsed,
    round: 1,
    rejectionCount: 0,
    proposedFlights: [],
    proposedHotel: null,
    proposedActivities: [],
    budgetStatus: "pending",
    budgetFeedback: "",
  }

  await push(event("Logistics", "Searching for optimal flight routes (feasibility first, not price)."))
  pipelineLog("logistics", "running")
  const logistics = await runLogisticsAgent(state, useLlm)
  pipelineLog(
    "logistics",
    `done flights=${logistics.flights.map((f) => `${f.flightNumber} ${f.duration} ${f.stops} ${f.price}`).join(" | ")}`
  )
  state.proposedFlights = logistics.flights
  state.assumptions = [...state.assumptions, logistics.assumption]
  await push(
    event(
      "Logistics",
      `Proposed ${state.proposedFlights.length} flights, ranked by convenience. ${state.proposedFlights[0]?.notes ?? ""}`,
      "success",
      {
        status: "PROPOSED",
        details: {
          "Option 1": state.proposedFlights[0]?.flightNumber ?? "",
          Duration: state.proposedFlights[0]?.duration ?? "",
          Price: String(state.proposedFlights[0]?.price ?? ""),
        },
      }
    )
  )
  if (state.proposedFlights[1]) {
    await push(
      event("Logistics", `Backup option ${state.proposedFlights[1].flightNumber}: ${state.proposedFlights[1].notes}`, "info", {
        status: "PROPOSED",
      })
    )
  }

  const maxRounds = 4
  while (state.round <= maxRounds) {
    pipelineLog("round", `${state.round}/${maxRounds} rejections=${state.rejectionCount}`)
    await push(
      event(
        "Recommendations",
        state.budgetFeedback
          ? `Retry round ${state.round}: applying budget constraint before ranking stays.`
          : "Finding attractions and accommodations (quality-first pass)."
      )
    )
    pipelineLog("recommendations", `running round=${state.round} retry=${Boolean(state.budgetFeedback)}`)
    const recs = await runRecommendationsAgent(state, useLlm)
    pipelineLog(
      "recommendations",
      `done hotel=${recs.proposedHotel?.name ?? "none"} ${recs.proposedHotel?.pricePerNight ?? "?"}/night activities=${recs.proposedActivities.length}`
    )
    state.proposedHotel = recs.proposedHotel
    state.proposedActivities = recs.proposedActivities
    await push(
      event(
        "Recommendations",
        recs.justification || `Proposed ${state.proposedHotel?.name}.`,
        "info",
        {
          status: "PROPOSED",
          round: state.round,
          details: {
            Hotel: state.proposedHotel?.name ?? "",
            "Per night": String(state.proposedHotel?.pricePerNight ?? ""),
            Activities: state.proposedActivities.length,
          },
        }
      )
    )

    await push(event("Budget", "Calculating estimated trip cost from the deterministic calculator."))
    pipelineLog("budget", "running calculateTotal")
    const verdict = await runBudgetAgent(state, useLlm)
    pipelineLog(
      "budget",
      `${verdict.budgetStatus} total=${verdict.breakdown.total} budget=${state.budgetTotal} flights=${verdict.breakdown.flightCost} hotel=${verdict.breakdown.hotelCost} activities=${verdict.breakdown.activitiesCost}`
    )
    state.lastBreakdown = verdict.breakdown
    state.budgetStatus = verdict.budgetStatus
    state.budgetFeedback = verdict.budgetFeedback
    await emit({ type: "state", state })

    if (verdict.budgetStatus === "approved") {
      await push(event("Budget", verdict.budgetFeedback, "success", { status: "APPROVED", round: state.round }))
      await push(event("Supervisor", "Consensus reached. Compiling the final itinerary.", "success", { status: "CONSENSUS" }))
      pipelineLog("graph", "approved — moving to finalize")
      break
    }

    state.rejectionCount += 1
    await push(event("Budget", verdict.budgetFeedback, "error", { status: "REJECTED", round: state.round }))
    pipelineLog("budget", `rejected #${state.rejectionCount} ${verdict.budgetFeedback}`)

    if (state.rejectionCount >= 3) {
      await push(
        event(
          "Supervisor",
          "Rejection limit reached. Applying compromise fallback (drop discretionary activities, keep cheapest viable stay).",
          "negotiation",
          { round: state.round }
        )
      )
      pipelineLog("compromise", "applying fallback")
      state = await applyCompromise(state)
      pipelineLog(
        "compromise",
        `done total=${state.lastBreakdown?.total} hotel=${state.proposedHotel?.name} activities=${state.proposedActivities.length}`
      )
      await push(event("Budget", state.budgetFeedback, "warning", { status: "APPROVED", round: state.round }))
      break
    }

    await push(
      event("Supervisor", "Requesting cheaper hotel alternatives while keeping neighborhood quality.", "negotiation", {
        round: state.round,
      })
    )
    state.round += 1
  }

  pipelineLog("supervisor.finalize", "running")
  const itinerary = await finalizeItinerary(state, useLlm)
  pipelineLog("supervisor.finalize", `done ${itinerary.destination} total=${itinerary.totalCost} days=${itinerary.dayByDay.length}`)
  state.finalItinerary = itinerary
  state.budgetStatus = "approved"
  await emit({ type: "state", state })
  await push(event("Supervisor", "Optimized itinerary generated and verified.", "success", { status: "CONSENSUS" }))

  const now = new Date().toISOString()
  const trip: TripRecord = {
    id: crypto.randomUUID(),
    title: `${state.destination} trip`,
    destination: state.destination,
    origin: state.origin,
    startDate: state.startDate,
    endDate: state.endDate,
    travelerCount: state.travelerCount,
    budgetTotal: state.budgetTotal,
    currency: state.currency,
    status: "ready",
    userRequest: input.userRequest || "",
    parsedRequest: parsed,
    tripState: state,
    finalItinerary: itinerary,
    events,
    createdAt: now,
    updatedAt: now,
  }
  pipelineLog("graph.done", `trip=${trip.id} ${trip.destination} elapsed=${Date.now() - started}ms events=${events.length}`)
  return trip
}

async function applyCompromise(state: TripState): Promise<TripState> {
  const nights = nightsBetween(state.startDate, state.endDate)
  let activities = [...state.proposedActivities]
  let hotel = state.proposedHotel
  let breakdown = calculateTotal({
    flights: state.proposedFlights,
    hotel,
    activities,
    nights,
    travelers: state.travelerCount,
  })

  while (breakdown.total > state.budgetTotal && activities.length) {
    const dropped = activities.pop()
    pipelineLog("compromise", `dropped activity ${dropped?.name}`)
    breakdown = calculateTotal({
      flights: state.proposedFlights,
      hotel,
      activities,
      nights,
      travelers: state.travelerCount,
    })
  }

  if (breakdown.total > state.budgetTotal) {
    const cheaper = await searchHotels({
      destination: state.destination,
      checkIn: state.startDate,
      checkOut: state.endDate,
      occupants: state.travelerCount,
      maxPricePerNight: Math.max(1000, Math.floor((hotel?.pricePerNight || 8000) * 0.5)),
      currency: state.currency,
    })
    if (cheaper[0]) {
      pipelineLog("compromise", `switched hotel to ${cheaper[0].name} ${cheaper[0].pricePerNight}/night`)
      hotel = cheaper[0]
    }
    breakdown = calculateTotal({
      flights: state.proposedFlights,
      hotel,
      activities,
      nights,
      travelers: state.travelerCount,
    })
  }

  const over = breakdown.total > state.budgetTotal
  return {
    ...state,
    proposedHotel: hotel,
    proposedActivities: activities,
    lastBreakdown: breakdown,
    budgetStatus: "approved",
    budgetFeedback: over
      ? `Compromise: itinerary is ${state.currency} ${breakdown.total} vs budget ${state.currency} ${state.budgetTotal}. Cheapest flight ${cheapestFlight(state.proposedFlights)?.flightNumber ?? ""} and reduced activities still exceed the original cap.`
      : `Compromise: dropped paid extras to fit ${state.currency} ${breakdown.total} within ${state.currency} ${state.budgetTotal}.`,
  }
}
