import { defaultOrigin } from "@/lib/config"
import { cityCenterCoords, getTransitTime, searchFlights } from "@/lib/tools"
import { runGeminiJson } from "@/lib/agents/gemini"
import { pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { LOGISTICS_PROMPT } from "@/lib/agents/prompts"
import type { FlightOffer, TripState } from "@/lib/types/trip"

function hourFrom(time: string) {
  const match = time.match(/^(\d{1,2})/)
  return match ? Number(match[1]) : 12
}

function annotate(flight: FlightOffer, transit?: number): FlightOffer {
  const flags: string[] = []
  if ((flight.layoverMinutes ?? 99) < 60 && flight.stops !== "Direct") {
    flags.push("RED FLAG: sub-60-minute layover")
  }
  const hour = hourFrom(flight.arrival)
  if (hour >= 0 && hour < 6) {
    flags.push("RED FLAG: arrival between midnight and 6am")
  }
  const transitNote =
    transit != null ? ` Airport-to-center transit ~${transit} min.` : ""
  const late = hour >= 21 || hour < 6
  const day1 = late
    ? " Day 1 should have no activities scheduled after transit and check-in."
    : " Day 1 activities are feasible after transit and check-in."
  return {
    ...flight,
    transitMinutesToCenter: transit,
    notes: [flight.notes, flags.join(". "), `Duration ${flight.duration}, ${flight.stops}.${transitNote}${day1}`]
      .filter(Boolean)
      .join(" "),
  }
}

export async function runLogisticsAgent(state: TripState, useLlm: boolean): Promise<{ flights: FlightOffer[]; assumption: string }> {
  const origin = state.origin || `${defaultOrigin().city} (${defaultOrigin().iata})`
  const assumption = state.origin
    ? `Using origin ${origin}.`
    : `Origin was not specified; assumed ${defaultOrigin().city} (${defaultOrigin().iata}).`

  pipelineLog("logistics", `origin=${origin} dest=${state.destination} llm=${useLlm}`)
  const offers = await searchFlights({
    origin,
    destination: state.destination,
    departDate: state.startDate,
    returnDate: state.endDate,
    travelers: state.travelerCount,
    currency: state.currency,
  })

  const center = cityCenterCoords(state.destination)

  const attachTransit = async (flights: FlightOffer[]) => {
    const withTransit: FlightOffer[] = []
    for (const flight of flights) {
      const minutes = await getTransitTime({
        originLat: flight.arrivalAirportLat ?? center.lat,
        originLng: flight.arrivalAirportLng ?? center.lng,
        destLat: center.lat,
        destLng: center.lng,
      })
      withTransit.push(annotate(flight, minutes))
    }
    return withTransit
  }

  const rankedFallback = async () => {
    const ranked = [...offers].sort((a, b) => {
      const aFlag = (a.layoverMinutes ?? 99) < 60 ? 1 : 0
      const bFlag = (b.layoverMinutes ?? 99) < 60 ? 1 : 0
      if (aFlag !== bFlag) return aFlag - bFlag
      return a.durationMinutes - b.durationMinutes
    })
    return attachTransit(ranked.slice(0, 2))
  }

  if (!useLlm) {
    pipelineLog("logistics", "ranking without LLM")
    return { flights: await rankedFallback(), assumption }
  }

  try {
    const result = await runGeminiJson<{ proposedFlights?: FlightOffer[]; assumption?: string }>({
      system: LOGISTICS_PROMPT,
      user: JSON.stringify({
        destination: state.destination,
        origin,
        startDate: state.startDate,
        endDate: state.endDate,
        travelerCount: state.travelerCount,
        destinationCenter: center,
        searchFlightsResult: offers,
        instruction:
          "Do not invent flights. Pick exactly 2 offers from searchFlightsResult, sorted most-to-least convenient (not by price). Put feasibility notes on each. Flag sub-60m layovers and midnight–6am arrivals.",
      }),
    })
    const ids = new Set(offers.map((o) => o.id))
    const selected = (result.proposedFlights ?? [])
      .map((picked) => offers.find((o) => o.id === picked.id) ?? picked)
      .filter((f) => ids.has(f.id) || offers.some((o) => o.flightNumber === f.flightNumber))
      .slice(0, 2)
    if (selected.length === 2) {
      pipelineLog("logistics", `LLM selected ${selected.map((f) => f.flightNumber).join(", ")}`)
      return {
        flights: await attachTransit(selected),
        assumption: result.assumption || assumption,
      }
    }
    pipelineWarn("logistics", `LLM returned ${selected.length} valid flights, using catalog rank`)
  } catch (error) {
    pipelineWarn("logistics", "LLM ranking failed, using catalog rank", error)
  }

  return { flights: await rankedFallback(), assumption }
}
