import { defaultOrigin, isDuffelConfigured, isExpediaConfigured, isMapsConfigured, isTavilyConfigured, isViatorConfigured } from "@/lib/config"
import { pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { calculateTotal as calc, nightsBetween } from "@/lib/agents/math"
import {
  catalogActivities,
  catalogFlights,
  catalogHotels,
  cityCenterCoords,
  haversineMinutes,
} from "@/lib/tools/catalog"
import type { ActivityOffer, FlightOffer, HotelOffer } from "@/lib/types/trip"

export async function searchFlights(args: {
  origin: string
  destination: string
  departDate: string
  returnDate: string
  travelers: number
  currency?: string
}): Promise<FlightOffer[]> {
  pipelineLog("tool.searchFlights", `${args.origin} → ${args.destination} ${args.departDate}/${args.returnDate} pax=${args.travelers}`)
  if (isDuffelConfigured()) {
    try {
      const offers = await searchDuffel(args)
      pipelineLog("tool.searchFlights", `source=duffel count=${offers.length}`)
      return offers
    } catch (error) {
      pipelineWarn("tool.searchFlights", "Duffel failed, using catalog", error)
    }
  }
  const catalog = catalogFlights({
    origin: args.origin,
    destination: args.destination,
    departDate: args.departDate,
    returnDate: args.returnDate,
    travelers: args.travelers,
    currency: args.currency || "INR",
  })
  pipelineLog("tool.searchFlights", `source=catalog count=${catalog.length}`)
  return catalog
}

async function searchDuffel(args: {
  origin: string
  destination: string
  departDate: string
  returnDate: string
  travelers: number
  currency?: string
}): Promise<FlightOffer[]> {
  const origin = defaultOrigin()
  const res = await fetch(`${process.env.DUFFEL_API_URL || "https://api.duffel.com"}/air/offer_requests?return_offers=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [
          { origin: origin.iata, destination: args.destination, departure_date: args.departDate },
          { origin: args.destination, destination: origin.iata, departure_date: args.returnDate },
        ],
        passengers: Array.from({ length: args.travelers }, () => ({ type: "adult" })),
        cabin_class: "economy",
      },
    }),
  })
  if (!res.ok) throw new Error(`Duffel ${res.status}`)
  const json = await res.json()
  const offers = json?.data?.offers ?? json?.data ?? []
  return (offers as Record<string, unknown>[]).slice(0, 8).map((offer, index) => {
    const slices = (offer.slices as Record<string, unknown>[] | undefined) ?? []
    const first = slices[0] ?? {}
    const segments = (first.segments as Record<string, unknown>[] | undefined) ?? []
    const dep = segments[0] as Record<string, unknown> | undefined
    const arr = segments[segments.length - 1] as Record<string, unknown> | undefined
    const duration = String(first.duration ?? "PT8H")
    const minutes = parseIsoDuration(duration)
    const stops = Math.max(0, segments.length - 1)
    return {
      id: String(offer.id ?? `duffel-${index}`),
      airline: String((dep?.operating_carrier as Record<string, unknown>)?.name ?? "Airline"),
      flightNumber: String((dep?.operating_carrier_flight_number as string) ?? "XX000"),
      from: args.origin,
      to: args.destination,
      originIata: origin.iata,
      destinationIata: String(arr?.arriving_at ?? args.destination),
      departure: isoToTime(String(dep?.departing_at ?? "")),
      arrival: isoToTime(String(arr?.arriving_at ?? "")),
      durationMinutes: minutes,
      duration: `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, "0")}m`,
      stops: stops === 0 ? "Direct" : `${stops} Stop${stops > 1 ? "s" : ""}`,
      price: Number(offer.total_amount ?? 0),
      currency: String(offer.total_currency ?? args.currency ?? "INR"),
      source: "duffel" as const,
    }
  })
}

function parseIsoDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return 480
  return Number(match[1] || 0) * 60 + Number(match[2] || 0)
}

function isoToTime(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16)
  return d.toISOString().slice(11, 16)
}

export async function getTransitTime(args: {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
}): Promise<number> {
  pipelineLog("tool.getTransitTime", `${args.originLat},${args.originLng} → ${args.destLat},${args.destLng}`)
  if (isMapsConfigured()) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
      url.searchParams.set("origins", `${args.originLat},${args.originLng}`)
      url.searchParams.set("destinations", `${args.destLat},${args.destLng}`)
      url.searchParams.set("mode", "transit")
      url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY || "")
      const res = await fetch(url)
      const json = await res.json()
      const seconds = json?.rows?.[0]?.elements?.[0]?.duration?.value
      if (typeof seconds === "number") {
        const minutes = Math.round(seconds / 60)
        pipelineLog("tool.getTransitTime", `source=maps minutes=${minutes}`)
        return minutes
      }
    } catch (error) {
      pipelineWarn("tool.getTransitTime", "Maps failed, using haversine", error)
    }
  }
  const estimate = haversineMinutes(
    { lat: args.originLat, lng: args.originLng },
    { lat: args.destLat, lng: args.destLng }
  )
  pipelineLog("tool.getTransitTime", `source=haversine minutes=${estimate}`)
  return estimate
}

export async function searchHotels(args: {
  destination: string
  checkIn: string
  checkOut: string
  occupants: number
  maxPricePerNight?: number | null
  currency?: string
}): Promise<HotelOffer[]> {
  const nights = nightsBetween(args.checkIn, args.checkOut)
  pipelineLog(
    "tool.searchHotels",
    `${args.destination} ${args.checkIn}→${args.checkOut} nights=${nights} occupants=${args.occupants} maxNight=${args.maxPricePerNight ?? "none"}`
  )
  if (isExpediaConfigured()) {
    pipelineLog("tool.searchHotels", "Expedia configured but live adapter pending — catalog")
  }
  const hotels = catalogHotels({
    destination: args.destination,
    nights,
    occupants: args.occupants,
    maxPricePerNight: args.maxPricePerNight,
    currency: args.currency || "INR",
  })
  pipelineLog("tool.searchHotels", `source=catalog count=${hotels.length}`)
  return hotels
}

export async function searchActivities(args: {
  destination: string
  interests: string[]
  currency?: string
}): Promise<ActivityOffer[]> {
  pipelineLog("tool.searchActivities", `${args.destination} interests=${args.interests.join(",") || "(none)"}`)
  if (isViatorConfigured()) {
    pipelineLog("tool.searchActivities", "Viator configured but live adapter pending — catalog")
  }
  const activities = catalogActivities({
    destination: args.destination,
    interests: args.interests,
    currency: args.currency || "INR",
  })
  pipelineLog("tool.searchActivities", `source=catalog count=${activities.length}`)
  return activities
}

export async function webSearch(query: string): Promise<string> {
  pipelineLog("tool.webSearch", query)
  if (!isTavilyConfigured()) {
    const center = cityCenterCoords(query)
    pipelineLog("tool.webSearch", "source=catalog")
    return `Catalog grounding: ${center.city} central neighborhoods are the default walkable base for mixed culture/food trips.`
  }
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 3,
    }),
  })
  if (!res.ok) {
    pipelineWarn("tool.webSearch", `Tavily ${res.status}`)
    return ""
  }
  const json = await res.json()
  const text =
    (json.results as { title: string; content: string }[] | undefined)
      ?.map((r) => `${r.title}: ${r.content}`)
      .join("\n") ?? ""
  pipelineLog("tool.webSearch", `source=tavily chars=${text.length}`)
  return text
}

export function toolCalculateTotal(args: {
  flights: FlightOffer[]
  hotel: HotelOffer | null
  activities: ActivityOffer[]
  nights: number
  travelers: number
}) {
  const result = calc(args)
  pipelineLog("tool.calculateTotal", `total=${result.total} flights=${result.flightCost} hotel=${result.hotelCost} activities=${result.activitiesCost}`)
  return result
}

export { cityCenterCoords }
