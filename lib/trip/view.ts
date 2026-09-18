import {
  mockBudgetBreakdown,
  mockBudgetRemaining,
  mockBudgetTotal,
  mockDayPlans,
  mockFlights,
  mockHotels,
  mockRecommendations,
} from "@/lib/mockData"
import type { ActivityOffer, FlightOffer, HotelOffer, TripRecord } from "@/lib/types/trip"
import { formatCurrency } from "@/lib/utils"

export function viewFlights(trip: TripRecord | null): FlightOffer[] {
  const flights = trip?.tripState?.proposedFlights?.length
    ? trip.tripState.proposedFlights
    : trip?.finalItinerary
      ? [trip.finalItinerary.flight]
      : null
  if (flights?.length) return flights
  return mockFlights.map((f) => ({
    id: f.id,
    airline: f.airline,
    flightNumber: f.flightNumber,
    from: f.from,
    to: f.to,
    originIata: "BOM",
    destinationIata: "NRT",
    departure: f.departure,
    arrival: f.arrival,
    durationMinutes: 510,
    duration: f.duration,
    stops: f.stops,
    price: f.price,
    currency: "INR",
    badge: f.badge,
    notes: f.selected ? "Selected" : undefined,
  }))
}

export function viewHotels(trip: TripRecord | null): HotelOffer[] {
  const hotel = trip?.tripState?.proposedHotel || trip?.finalItinerary?.hotel
  if (hotel) return [hotel]
  return mockHotels.map((h) => ({
    id: h.id,
    name: h.name,
    rating: h.rating,
    location: h.location,
    pricePerNight: h.pricePerNight,
    totalPrice: h.totalPrice,
    currency: "INR",
    distance: h.distance,
    amenities: h.amenities,
    image: h.image,
    notes: h.badge,
  }))
}

export function viewActivities(trip: TripRecord | null): ActivityOffer[] {
  const acts = trip?.tripState?.proposedActivities?.length
    ? trip.tripState.proposedActivities
    : trip?.finalItinerary?.dayByDay.flatMap((d) => d.activities) ?? []
  if (acts.length) return acts
  return mockRecommendations.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    rating: r.rating,
    location: r.location,
    cost: r.cost === "Free" ? 0 : 2200,
    costLabel: r.cost,
    duration: r.duration,
    bestTime: r.bestTime,
    description: r.description,
  }))
}

export function viewBudget(trip: TripRecord | null) {
  const breakdown = trip?.tripState?.lastBreakdown || trip?.finalItinerary?.costBreakdown
  const budgetTotal = trip?.budgetTotal ?? 200000
  if (!breakdown) {
    return {
      budgetTotal,
      spent: mockBudgetTotal,
      remaining: mockBudgetRemaining,
      rows: mockBudgetBreakdown,
      health: "Excellent",
      currency: trip?.currency ?? "INR",
    }
  }
  const rows = [
    { category: "Flights", amount: breakdown.flightCost },
    { category: "Hotel", amount: breakdown.hotelCost },
    { category: "Activities", amount: breakdown.activitiesCost },
  ]
  return {
    budgetTotal,
    spent: breakdown.total,
    remaining: budgetTotal - breakdown.total,
    rows,
    health: breakdown.total <= budgetTotal ? "Excellent" : "Over budget",
    currency: trip?.currency ?? "INR",
    pct: breakdown.breakdownPct,
  }
}

export function viewDays(trip: TripRecord | null) {
  const days = trip?.finalItinerary?.dayByDay
  if (days?.length) {
    return days.map((d) => ({
      day: d.day,
      date: d.date,
      theme: d.notes || `Day ${d.day}`,
      events: d.activities.map((a) => ({
        time: a.bestTime || "Flexible",
        title: a.name,
        description: a.description,
        location: a.location,
        cost: a.costLabel || formatCurrency(a.cost, trip?.currency),
        travelTime: a.duration,
        icon: "📍",
      })),
    }))
  }
  return mockDayPlans
}

export function viewTripCards(trips: TripRecord[]) {
  return trips.map((t) => ({
    id: t.id,
    destination: t.title,
    location: t.destination,
    dates: `${t.startDate} – ${t.endDate}`,
    days: Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000)),
    budget: t.budgetTotal,
    status: (t.status === "ready" ? "Ready" : t.status === "completed" ? "Completed" : "Draft") as "Ready" | "Completed" | "Draft",
    image: "🗼",
  }))
}
