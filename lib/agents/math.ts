import type { ActivityOffer, CostBreakdown, FlightOffer, HotelOffer } from "@/lib/types/trip"

export function nightsBetween(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff)
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, "0")}m`
}

export function stamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false })
}

export function parseJsonFromText<T>(text: string): T {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1]?.trim() ?? trimmed
  const start = raw.search(/[[{]/)
  const slice = start >= 0 ? raw.slice(start) : raw
  return JSON.parse(slice) as T
}

export function extractNightlyCeiling(feedback: string): number | null {
  if (!feedback) return null
  const patterns = [
    /under\s*([₹$€£])\s*([\d,]+(?:\.\d+)?)\s*\/?\s*night/i,
    /(?:ceiling|max(?:imum)?|below|under)\s*(?:of\s*)?([₹$€£])?\s*([\d,]+(?:\.\d+)?)/i,
    /([₹$€£])\s*([\d,]+(?:\.\d+)?)\s*\/\s*night/i,
  ]
  for (const pattern of patterns) {
    const match = feedback.match(pattern)
    if (match) {
      const n = Number((match[2] ?? match[1]).replace(/,/g, ""))
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return null
}

export function cheapestFlight(flights: FlightOffer[]) {
  if (!flights.length) return null
  return [...flights].sort((a, b) => a.price - b.price)[0]
}

export function pickConvenientFlight(flights: FlightOffer[]) {
  if (!flights.length) return null
  const clean = flights.filter((f) => !/red flag/i.test(f.notes ?? ""))
  const pool = clean.length ? clean : flights
  return pool[0]
}

export function calculateTotal(input: {
  flights: FlightOffer[]
  hotel: HotelOffer | null
  activities: ActivityOffer[]
  nights: number
  travelers: number
}): CostBreakdown {
  const flight = cheapestFlight(input.flights)
  const flightCost = flight ? flight.price * Math.max(1, input.travelers) : 0
  const hotelCost = input.hotel
    ? (input.hotel.totalPrice || input.hotel.pricePerNight * Math.max(1, input.nights))
    : 0
  const activitiesCost = input.activities.reduce((sum, activity) => sum + (activity.cost || 0), 0)
  const total = flightCost + hotelCost + activitiesCost
  const pct = (part: number) => (total > 0 ? Math.round((part / total) * 100) : 0)
  return {
    flightCost,
    hotelCost,
    activitiesCost,
    total,
    breakdownPct: {
      flight: pct(flightCost),
      hotel: pct(hotelCost),
      activities: pct(activitiesCost),
    },
  }
}

export function nightlyCeilingToFitBudget(input: {
  budgetTotal: number
  flightCost: number
  activitiesCost: number
  nights: number
  safetyMargin?: number
}) {
  const remaining = input.budgetTotal - input.flightCost - input.activitiesCost
  const raw = remaining / Math.max(1, input.nights)
  const margin = input.safetyMargin ?? 0.85
  return Math.max(0, Math.floor((raw * margin) / 100) * 100)
}

export function buildUserRequest(input: {
  from?: string
  to?: string
  destination?: string
  startDate?: string
  endDate?: string
  travelers?: number
  budget?: number
  currency?: string
  interests?: string[]
  tripType?: string
  specialRequirements?: string
  travelPace?: string
  accommodation?: string
  foodPreferences?: string[]
}) {
  const dest = input.destination || input.to || "an unspecified destination"
  const origin = input.from ? `from ${input.from}` : ""
  const dates = input.startDate && input.endDate ? `${input.startDate} to ${input.endDate}` : ""
  const people = input.travelers ? `${input.travelers} travelers` : ""
  const type = input.tripType ? `${input.tripType} trip` : ""
  const budget = input.budget ? `budget ${input.currency || "INR"} ${input.budget}` : ""
  const interests = input.interests?.length ? `interests: ${input.interests.join(", ")}` : ""
  const food = input.foodPreferences?.length ? `food: ${input.foodPreferences.join(", ")}` : ""
  const stay = input.accommodation ? `stay: ${input.accommodation}` : ""
  const pace = input.travelPace ? `pace: ${input.travelPace}` : ""
  const notes = input.specialRequirements || ""
  return [dest, origin, dates, people, type, budget, interests, food, stay, pace, notes]
    .filter(Boolean)
    .join(". ")
}
