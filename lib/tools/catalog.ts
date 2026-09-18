import { defaultOrigin } from "@/lib/config"
import { formatDuration } from "@/lib/agents/math"
import type { ActivityOffer, FlightOffer, HotelOffer } from "@/lib/types/trip"

function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return h
}

function cityCenter(destination: string) {
  const key = destination.toLowerCase()
  if (key.includes("tokyo")) return { lat: 35.6595, lng: 139.7004, city: "Tokyo" }
  if (key.includes("paris")) return { lat: 48.8566, lng: 2.3522, city: "Paris" }
  if (key.includes("goa")) return { lat: 15.4909, lng: 73.8278, city: "Goa" }
  if (key.includes("london")) return { lat: 51.5074, lng: -0.1278, city: "London" }
  if (key.includes("dubai")) return { lat: 25.2048, lng: 55.2708, city: "Dubai" }
  if (key.includes("bali")) return { lat: -8.4095, lng: 115.1889, city: "Bali" }
  if (key.includes("new york")) return { lat: 40.7128, lng: -74.006, city: "New York" }
  return { lat: 35.6595, lng: 139.7004, city: destination.split(",")[0] || destination }
}

function iataFor(destination: string) {
  const key = destination.toLowerCase()
  if (key.includes("tokyo")) return { primary: "NRT", alt: "HND" }
  if (key.includes("paris")) return { primary: "CDG", alt: "ORY" }
  if (key.includes("goa")) return { primary: "GOI", alt: "GOI" }
  if (key.includes("london")) return { primary: "LHR", alt: "LGW" }
  if (key.includes("dubai")) return { primary: "DXB", alt: "DWC" }
  if (key.includes("bali")) return { primary: "DPS", alt: "DPS" }
  return { primary: "NRT", alt: "HND" }
}

export function catalogFlights(input: {
  origin: string
  destination: string
  departDate: string
  returnDate: string
  travelers: number
  currency: string
}): FlightOffer[] {
  const origin = defaultOrigin()
  const dest = iataFor(input.destination)
  const center = cityCenter(input.destination)
  const seed = hash(`${input.origin}-${input.destination}-${input.departDate}`)
  const base = 38000 + (seed % 12000)
  const currency = input.currency || "INR"

  const rows: Omit<FlightOffer, "duration">[] = [
    {
      id: "catalog-nonstop-eve",
      airline: "Air India",
      flightNumber: "AI302",
      from: input.origin,
      to: `${center.city} (${dest.primary})`,
      originIata: origin.iata,
      destinationIata: dest.primary,
      departure: "08:30",
      arrival: "18:00",
      durationMinutes: 510,
      stops: "Direct",
      price: base + 10000,
      currency,
      arrivalAirportLat: center.lat + 0.4,
      arrivalAirportLng: center.lng + 0.35,
      source: "catalog",
    },
    {
      id: "catalog-one-stop",
      airline: "Singapore Airlines",
      flightNumber: "SQ421",
      from: input.origin,
      to: `${center.city} (${dest.alt})`,
      originIata: origin.iata,
      destinationIata: dest.alt,
      departure: "11:45",
      arrival: "22:15",
      durationMinutes: 630,
      stops: "1 Stop",
      layoverMinutes: 90,
      price: base,
      currency,
      arrivalAirportLat: center.lat + 0.2,
      arrivalAirportLng: center.lng - 0.15,
      source: "catalog",
    },
    {
      id: "catalog-tight-layover",
      airline: "Cathay Pacific",
      flightNumber: "CX654",
      from: input.origin,
      to: `${center.city} (${dest.primary})`,
      originIata: origin.iata,
      destinationIata: dest.primary,
      departure: "06:10",
      arrival: "19:40",
      durationMinutes: 750,
      stops: "1 Stop",
      layoverMinutes: 45,
      price: base - 4000,
      currency,
      arrivalAirportLat: center.lat + 0.4,
      arrivalAirportLng: center.lng + 0.35,
      source: "catalog",
    },
    {
      id: "catalog-red-eye",
      airline: "Japan Airlines",
      flightNumber: "JL728",
      from: input.origin,
      to: `${center.city} (${dest.primary})`,
      originIata: origin.iata,
      destinationIata: dest.primary,
      departure: "19:00",
      arrival: "06:30",
      durationMinutes: 480,
      stops: "Direct",
      price: base + 22000,
      currency,
      arrivalAirportLat: center.lat + 0.4,
      arrivalAirportLng: center.lng + 0.35,
      source: "catalog",
    },
    {
      id: "catalog-two-stop",
      airline: "Emirates",
      flightNumber: "EK501",
      from: input.origin,
      to: `${center.city} (${dest.primary})`,
      originIata: origin.iata,
      destinationIata: dest.primary,
      departure: "04:20",
      arrival: "23:50",
      durationMinutes: 980,
      stops: "2 Stops",
      layoverMinutes: 240,
      price: base - 8000,
      currency,
      arrivalAirportLat: center.lat + 0.4,
      arrivalAirportLng: center.lng + 0.35,
      source: "catalog",
    },
  ]

  return rows.map((row) => ({ ...row, duration: formatDuration(row.durationMinutes) }))
}

export function catalogHotels(input: {
  destination: string
  nights: number
  occupants: number
  maxPricePerNight?: number | null
  currency: string
}): HotelOffer[] {
  const center = cityCenter(input.destination)
  const nights = Math.max(1, input.nights)
  const currency = input.currency || "INR"
  const all: HotelOffer[] = [
    {
      id: "hotel-premium",
      name: `${center.city} Grand Atelier`,
      rating: 4.8,
      location: `Central ${center.city}`,
      neighborhood: "City center",
      pricePerNight: 12000,
      totalPrice: 12000 * nights,
      nights,
      currency,
      distance: "0.5 km from main station",
      amenities: ["Spa", "City view", "Concierge", "Breakfast"],
      image: "🏨",
      source: "catalog",
    },
    {
      id: "hotel-boutique",
      name: `${center.city} Central Boutique Hotel`,
      rating: 4.3,
      location: `Walkable core, ${center.city}`,
      neighborhood: "Downtown",
      pricePerNight: 6800,
      totalPrice: 6800 * nights,
      nights,
      currency,
      distance: "1.2 km from city center",
      amenities: ["WiFi", "Breakfast", "Gym", "Metro nearby"],
      image: "🏙️",
      source: "catalog",
    },
    {
      id: "hotel-value",
      name: `${center.city} Station Inn`,
      rating: 4.1,
      location: `Near transit, ${center.city}`,
      neighborhood: "Transit hub",
      pricePerNight: 4200,
      totalPrice: 4200 * nights,
      nights,
      currency,
      distance: "0.3 km from station",
      amenities: ["WiFi", "Luggage storage"],
      image: "🛏️",
      source: "catalog",
    },
    {
      id: "hotel-budget",
      name: `${center.city} Capsule & Lodge`,
      rating: 4.0,
      location: `${center.city} east`,
      neighborhood: "Local district",
      pricePerNight: 2800,
      totalPrice: 2800 * nights,
      nights,
      currency,
      distance: "2.4 km from center",
      amenities: ["WiFi", "Shared lounge"],
      image: "🛖",
      source: "catalog",
    },
  ]
  return all.filter((h) => !input.maxPricePerNight || h.pricePerNight <= input.maxPricePerNight)
}

export function catalogActivities(input: {
  destination: string
  interests: string[]
  currency: string
}): ActivityOffer[] {
  const center = cityCenter(input.destination)
  const currency = input.currency || "INR"
  const pool: ActivityOffer[] = [
    {
      id: "act-culture",
      name: `${center.city} Historic Quarter Walk`,
      category: "Culture",
      rating: 4.8,
      location: center.city,
      cost: 0,
      costLabel: "Free",
      duration: "2 hours",
      bestTime: "Morning",
      description: "Temples, old streets, and local crafts near the chosen hotel neighborhood.",
      source: "catalog",
    },
    {
      id: "act-food",
      name: `${center.city} Street Food Trail`,
      category: "Food",
      rating: 4.7,
      location: center.city,
      cost: 3500,
      costLabel: currency === "INR" ? "₹3,500" : "3500",
      duration: "3 hours",
      bestTime: "Evening",
      description: "Guided tasting walk matching local-food preferences.",
      source: "catalog",
    },
    {
      id: "act-nature",
      name: `${center.city} Garden & Park Morning`,
      category: "Nature",
      rating: 4.6,
      location: center.city,
      cost: 0,
      costLabel: "Free",
      duration: "1.5 hours",
      bestTime: "Morning",
      description: "Green space within 20 minutes of the hotel.",
      source: "catalog",
    },
    {
      id: "act-tech",
      name: `${center.city} Digital / Design District`,
      category: "Technology",
      rating: 4.5,
      location: center.city,
      cost: 4400,
      costLabel: currency === "INR" ? "₹4,400" : "4400",
      duration: "2 hours",
      bestTime: "Afternoon",
      description: "Interactive exhibits and gadget streets.",
      source: "catalog",
    },
    {
      id: "act-night",
      name: `${center.city} Lantern Alley Evening`,
      category: "Nightlife",
      rating: 4.4,
      location: center.city,
      cost: 2800,
      costLabel: currency === "INR" ? "₹2,800" : "2800",
      duration: "2 hours",
      bestTime: "Night",
      description: "Walkable evening neighborhood near the stay.",
      source: "catalog",
    },
    {
      id: "act-photo",
      name: `${center.city} Viewpoint & Photo Walk`,
      category: "Photography",
      rating: 4.6,
      location: center.city,
      cost: 2200,
      costLabel: currency === "INR" ? "₹2,200" : "2200",
      duration: "2 hours",
      bestTime: "Sunset",
      description: "Skyline or waterfront lookout within the core city.",
      source: "catalog",
    },
  ]

  const interests = input.interests.map((i) => i.toLowerCase())
  const ranked = [...pool].sort((a, b) => {
    const aMatch = interests.some((i) => a.category.toLowerCase().includes(i) || i.includes(a.category.toLowerCase()))
    const bMatch = interests.some((i) => b.category.toLowerCase().includes(i) || i.includes(b.category.toLowerCase()))
    if (aMatch && !bMatch) return -1
    if (!aMatch && bMatch) return 1
    return b.rating - a.rating
  })
  return ranked.slice(0, 6)
}

export function cityCenterCoords(destination: string) {
  return cityCenter(destination)
}

export function haversineMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const km = 2 * R * Math.asin(Math.sqrt(s))
  return Math.max(25, Math.round((km / 35) * 60) + 20)
}
