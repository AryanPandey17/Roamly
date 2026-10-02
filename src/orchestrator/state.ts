import { ReducedValue, StateSchema } from "@langchain/langgraph";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Options returned by tools. Agents may only select from these.
// All prices are already converted to the trip currency by the tool layer.
// ---------------------------------------------------------------------------
const latLng = { lat: z.number(), lng: z.number() };

export const flightOptionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
  origin: z.string(),
  destination: z.string(),
  /** ISO local date-time of the outbound departure and arrival. */
  departAt: z.string(),
  arriveAt: z.string(),
  /** ISO local date-time of the return leg's departure. */
  returnDepartAt: z.string().nullable(),
  durationMinutes: z.number(),
  stops: z.number().int().min(0),
  layoverMinutes: z.number().nullable(),
  /** Round trip, all travellers. */
  price: z.number().nonnegative(),
  currency: z.string(),
  arrivalAirport: z.object({ code: z.string(), ...latLng }).nullable(),
  deepLink: z.string().nullable(),
  redFlags: z.array(z.string()),
});

export const hotelOptionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  rating: z.number().nullable(),
  neighbourhood: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  pricePerNight: z.number().nonnegative(),
  /** Whole stay, all rooms. */
  totalPrice: z.number().nonnegative(),
  currency: z.string(),
  amenities: z.array(z.string()),
  deepLink: z.string().nullable(),
});

export const placeOptionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  category: z.string(),
  rating: z.number().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  /** Per person. 0 means free. */
  price: z.number().nonnegative(),
  currency: z.string(),
  durationMinutes: z.number(),
  description: z.string(),
  deepLink: z.string().nullable(),
});

export type FlightOption = z.infer<typeof flightOptionSchema>;
export type HotelOption = z.infer<typeof hotelOptionSchema>;
export type PlaceOption = z.infer<typeof placeOptionSchema>;

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

/** Optional structured fields from the form. They override what the parser infers. */
export const hintsSchema = z.object({
  origin: z.string().trim().min(1).max(120).optional(),
  destination: z.string().trim().min(1).max(120).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  travellers: z.number().int().min(1).max(20).optional(),
  budget: z.number().positive().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const preferencesSchema = z.object({
  homeCity: z.string().nullable(),
  currency: z.string(),
  budgetStyle: z.enum(["saver", "balanced", "comfort"]),
  pace: z.enum(["relaxed", "balanced", "packed"]),
  interests: z.array(z.string()),
  dietary: z.array(z.string()),
});

export const placeSchema = z.object({ name: z.string(), country: z.string().nullable(), ...latLng });

export const parsedRequestSchema = z.object({
  destination: placeSchema,
  origin: placeSchema,
  startDate: isoDate,
  endDate: isoDate,
  nights: z.number().int().min(1),
  days: z.number().int().min(1),
  travellers: z.number().int().min(1),
  budget: z.object({ amount: z.number().positive(), currency: z.string() }),
  interests: z.array(z.string()),
});

export type Hints = z.infer<typeof hintsSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Place = z.infer<typeof placeSchema>;
export type ParsedRequest = z.infer<typeof parsedRequestSchema>;

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------
export const CATEGORIES = ["flights", "stay", "activities"] as const;
export type Category = (typeof CATEGORIES)[number];

export const costBreakdownSchema = z.object({
  currency: z.string(),
  flights: z.number(),
  stay: z.number(),
  activities: z.number(),
  food: z.number(),
  localTransport: z.number(),
  total: z.number(),
  /** Share of the total per category, 0–100, rounded. */
  percent: z.object({
    flights: z.number(),
    stay: z.number(),
    activities: z.number(),
    food: z.number(),
    localTransport: z.number(),
  }),
});

/** Per-person daily estimates for costs that are not booked up front. */
export const estimatesSchema = z.object({
  foodPerDay: z.number().nonnegative(),
  localTransportPerDay: z.number().nonnegative(),
  currency: z.string(),
  source: z.string(),
});

/** The typed constraint Budget hands to another agent. */
export const instructionSchema = z.object({
  target: z.enum(["logistics", "recommendations"]),
  category: z.enum(CATEGORIES),
  /** Maximum total for the category, in the trip currency. */
  ceiling: z.number().nonnegative(),
  /** The same limit per night, when the category is the stay. */
  ceilingPerNight: z.number().nonnegative().nullable(),
  currency: z.string(),
});

export const budgetAuditSchema = z.object({
  round: z.number().int(),
  status: z.enum(["approved", "rejected", "compromise"]),
  budget: z.number(),
  breakdown: costBreakdownSchema,
  overBy: z.number(),
  instruction: instructionSchema.nullable(),
  feedback: z.string(),
});

export type CostBreakdown = z.infer<typeof costBreakdownSchema>;
export type Estimates = z.infer<typeof estimatesSchema>;
export type Instruction = z.infer<typeof instructionSchema>;
export type BudgetAudit = z.infer<typeof budgetAuditSchema>;

// ---------------------------------------------------------------------------
// Final itinerary
// ---------------------------------------------------------------------------
export const itineraryItemSchema = z.object({
  type: z.enum(["flight", "stay", "activity", "meal", "transfer", "note"]),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  /** Cost of this line for the whole party, in the trip currency. */
  cost: z.number(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  provider: z.string().nullable(),
  externalId: z.string().nullable(),
  deepLink: z.string().nullable(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: isoDate,
  title: z.string(),
  items: z.array(itineraryItemSchema),
});

export const itinerarySchema = z.object({
  destination: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  travellers: z.number().int(),
  currency: z.string(),
  budget: z.number(),
  breakdown: costBreakdownSchema,
  fitsBudget: z.boolean(),
  overBy: z.number(),
  days: z.array(itineraryDaySchema),
  assumptions: z.array(z.string()),
  summary: z.string(),
  markdown: z.string(),
});

export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type ItineraryDay = z.infer<typeof itineraryDaySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;

// ---------------------------------------------------------------------------
// The blackboard
// ---------------------------------------------------------------------------
const usageSchema = z.object({ llmCalls: z.number(), toolCalls: z.number() });
export type Usage = z.infer<typeof usageSchema>;

export const TripState = new StateSchema({
  runId: z.string(),
  tripId: z.string(),
  userId: z.string(),
  rawRequest: z.string(),
  structuredHints: hintsSchema.default({}),
  preferences: preferencesSchema,

  request: parsedRequestSchema.nullable().default(null),

  /** Everything any agent guessed. Appended, never overwritten. */
  assumptions: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.array(z.string()),
    reducer: (current, next) => [...current, ...next],
  }),

  flights: z
    .object({
      candidates: z.array(flightOptionSchema),
      selectedId: z.string().nullable(),
      notes: z.string(),
      /** Minutes from the arrival airport to the destination centre. */
      transferMinutes: z.number().nullable(),
    })
    .default({ candidates: [], selectedId: null, notes: "", transferMinutes: null }),

  stay: z
    .object({
      candidates: z.array(hotelOptionSchema),
      selectedId: z.string().nullable(),
      notes: z.string(),
    })
    .default({ candidates: [], selectedId: null, notes: "" }),

  activities: z
    .object({
      candidates: z.array(placeOptionSchema),
      selectedIds: z.array(z.string()),
      notes: z.string(),
    })
    .default({ candidates: [], selectedIds: [], notes: "" }),

  estimates: estimatesSchema.nullable().default(null),

  budget: z
    .object({
      status: z.enum(["pending", "approved", "rejected", "compromise"]),
      breakdown: costBreakdownSchema.nullable(),
      overBy: z.number(),
      feedback: z.string(),
    })
    .default({ status: "pending", breakdown: null, overBy: 0, feedback: "" }),

  negotiation: z
    .object({
      round: z.number().int(),
      rejections: z.number().int(),
      instruction: instructionSchema.nullable(),
      /** Categories where a revision found nothing cheaper. Budget skips them. */
      exhausted: z.array(z.enum(CATEGORIES)),
    })
    .default({ round: 0, rejections: 0, instruction: null, exhausted: [] }),

  /** Every Budget verdict, in order. */
  audits: new ReducedValue(z.array(budgetAuditSchema).default(() => []), {
    inputSchema: z.array(budgetAuditSchema),
    reducer: (current, next) => [...current, ...next],
  }),

  itinerary: itinerarySchema.nullable().default(null),

  /** Requests spent by this run. Summed across nodes and parallel branches. */
  usage: new ReducedValue(usageSchema.default(() => ({ llmCalls: 0, toolCalls: 0 })), {
    inputSchema: usageSchema,
    reducer: (current, next) => ({
      llmCalls: current.llmCalls + next.llmCalls,
      toolCalls: current.toolCalls + next.toolCalls,
    }),
  }),
});

export type TripStateType = typeof TripState.State;
export type TripStateUpdate = typeof TripState.Update;
