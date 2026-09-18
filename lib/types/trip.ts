export type AgentName = "Supervisor" | "Logistics" | "Recommendations" | "Budget"

export interface FlightOffer {
  id: string
  airline: string
  flightNumber: string
  from: string
  to: string
  originIata: string
  destinationIata: string
  departure: string
  arrival: string
  durationMinutes: number
  duration: string
  stops: string
  layoverMinutes?: number
  price: number
  currency: string
  badge?: string
  arrivalAirportLat?: number
  arrivalAirportLng?: number
  transitMinutesToCenter?: number
  notes?: string
  source?: "duffel" | "catalog"
}

export interface HotelOffer {
  id: string
  name: string
  rating: number
  location: string
  neighborhood?: string
  pricePerNight: number
  totalPrice: number
  nights?: number
  currency: string
  distance: string
  amenities: string[]
  image?: string
  notes?: string
  source?: "expedia" | "catalog"
}

export interface ActivityOffer {
  id: string
  name: string
  category: string
  rating: number
  location: string
  cost: number
  costLabel: string
  duration: string
  bestTime?: string
  description: string
  notes?: string
  source?: "viator" | "catalog"
}

export interface CostBreakdown {
  flightCost: number
  hotelCost: number
  activitiesCost: number
  total: number
  breakdownPct: { flight: number; hotel: number; activities: number }
}

export interface ParsedTripRequest {
  destination: string
  origin?: string
  startDate: string
  endDate: string
  budgetTotal: number
  currency: string
  travelerCount: number
  preferences: string[]
  assumptions: string[]
}

export interface DayPlan {
  day: number
  date: string
  activities: ActivityOffer[]
  notes?: string
}

export interface FinalItinerary {
  destination: string
  dates: { start: string; end: string }
  flight: FlightOffer
  hotel: HotelOffer
  dayByDay: DayPlan[]
  totalCost: number
  budgetTotal: number
  currency: string
  assumptions: string[]
  notes: string
  costBreakdown?: CostBreakdown
}

export interface TripState extends ParsedTripRequest {
  round: number
  rejectionCount: number
  proposedFlights: FlightOffer[]
  proposedHotel: HotelOffer | null
  proposedActivities: ActivityOffer[]
  budgetStatus: "pending" | "approved" | "rejected"
  budgetFeedback: string
  lastBreakdown?: CostBreakdown
  finalItinerary?: FinalItinerary | null
}

export interface AgentEvent {
  timestamp: string
  agent: AgentName
  message: string
  type: "info" | "success" | "warning" | "error" | "negotiation"
  round?: number
  status?: "PROPOSED" | "REJECTED" | "APPROVED" | "CONSENSUS"
  details?: Record<string, string | number>
}

export interface TripRecord {
  id: string
  userId?: string | null
  title: string
  destination: string
  origin?: string | null
  startDate: string
  endDate: string
  travelerCount: number
  budgetTotal: number
  currency: string
  status: "draft" | "planning" | "ready" | "completed"
  userRequest: string
  parsedRequest?: ParsedTripRequest | null
  tripState?: TripState | null
  finalItinerary?: FinalItinerary | null
  events: AgentEvent[]
  createdAt: string
  updatedAt: string
}

export interface PlanTripInput {
  userRequest?: string
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
}

export type GraphEvent =
  | { type: "log"; event: AgentEvent }
  | { type: "state"; state: TripState }
  | { type: "done"; trip: TripRecord }
  | { type: "error"; message: string }
