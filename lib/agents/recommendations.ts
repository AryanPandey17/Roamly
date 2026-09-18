import { extractNightlyCeiling } from "@/lib/agents/math"
import { runGeminiJson } from "@/lib/agents/gemini"
import { pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { RECOMMENDATIONS_PROMPT } from "@/lib/agents/prompts"
import { searchActivities, searchHotels } from "@/lib/tools"
import type { ActivityOffer, HotelOffer, TripState } from "@/lib/types/trip"

function rankHotel(hotels: HotelOffer[], preferences: string[]) {
  const prefs = preferences.map((p) => p.toLowerCase())
  return [...hotels].sort((a, b) => {
    const fit = (h: HotelOffer) =>
      prefs.some((p) => `${h.location} ${h.neighborhood}`.toLowerCase().includes(p)) ? 1 : 0
    if (b.rating !== a.rating) return b.rating - a.rating
    return fit(b) - fit(a)
  })[0]
}

export async function runRecommendationsAgent(state: TripState, useLlm: boolean) {
  const ceiling = extractNightlyCeiling(state.budgetFeedback)
  const retry = Boolean(state.budgetFeedback)
  let maxPrice = ceiling
  if (retry && maxPrice == null && state.proposedHotel) {
    maxPrice = Math.floor(state.proposedHotel.pricePerNight * 0.7)
  }

  pipelineLog("recommendations", `ceiling=${maxPrice ?? "none"} retry=${retry} llm=${useLlm}`)
  const hotels = await searchHotels({
    destination: state.destination,
    checkIn: state.startDate,
    checkOut: state.endDate,
    occupants: state.travelerCount,
    maxPricePerNight: retry ? maxPrice : null,
    currency: state.currency,
  })
  const activities = await searchActivities({
    destination: state.destination,
    interests: state.preferences,
    currency: state.currency,
  })

  if (!useLlm) {
    pipelineLog("recommendations", "picking without LLM")
    const hotel = rankHotel(hotels, state.preferences) ?? hotels[0]
    const picked = activities.slice(0, 4)
    const justification = retry
      ? `At ${hotel?.currency} ${hotel?.pricePerNight}/night this is under the ${maxPrice} ceiling while keeping a central neighborhood.`
      : `Picked the highest-rated available stay and activities matching ${state.preferences.join(", ") || "general interests"}.`
    return {
      proposedHotel: hotel ? { ...hotel, notes: justification } : null,
      proposedActivities: picked,
      justification,
    }
  }

  try {
    const result = await runGeminiJson<{
      proposedHotel?: HotelOffer
      proposedActivities?: ActivityOffer[]
      justification?: string
    }>({
      system: RECOMMENDATIONS_PROMPT,
      user: JSON.stringify({
        destination: state.destination,
        startDate: state.startDate,
        endDate: state.endDate,
        travelerCount: state.travelerCount,
        preferences: state.preferences,
        budgetFeedback: state.budgetFeedback,
        round: state.round,
        parsedCeiling: maxPrice,
        searchHotelsResult: hotels,
        searchActivitiesResult: activities,
        instruction:
          "Do not invent hotels or activities. Pick one hotel from searchHotelsResult and 3-5 activities from searchActivitiesResult. On retry rounds, never exceed parsedCeiling.",
      }),
    })

    let hotel = result.proposedHotel ?? rankHotel(hotels, state.preferences) ?? hotels[0]
    if (retry && maxPrice && hotel && hotel.pricePerNight > maxPrice) {
      hotel = rankHotel(hotels.filter((h) => h.pricePerNight <= maxPrice), state.preferences) ?? hotels[0]
    }
    const acts = (result.proposedActivities?.length ? result.proposedActivities : activities).slice(0, 5)
    return {
      proposedHotel: hotel,
      proposedActivities: acts,
      justification: result.justification || hotel?.notes || "",
    }
  } catch (error) {
    pipelineWarn("recommendations", "LLM pick failed, using catalog rank", error)
    const hotel = rankHotel(hotels, state.preferences) ?? hotels[0]
    return {
      proposedHotel: hotel,
      proposedActivities: activities.slice(0, 4),
      justification: "Fallback ranking after the language model response could not be parsed.",
    }
  }
}
