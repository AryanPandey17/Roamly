import { createClient } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "@/lib/config"
import { pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { createServerSupabase } from "@/lib/supabase/client"
import type { AgentEvent, FinalItinerary, TripRecord, TripState } from "@/lib/types/trip"
import type { SavedPlace, SavedPlaceCategory, UserProfile } from "@/lib/types/persistence"

type TripRow = {
  id: string
  user_id: string | null
  title: string | null
  destination: string
  origin: string | null
  start_date: string
  end_date: string
  traveler_count: number
  budget_total: number
  currency: string
  status: TripRecord["status"]
  user_request: string | null
  parsed_request: TripRecord["parsedRequest"]
  trip_state: TripState | null
  final_itinerary: FinalItinerary | null
  created_at: string
  updated_at: string
}

function mapTrip(row: TripRow, events: AgentEvent[] = []): TripRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || `${row.destination} trip`,
    destination: row.destination,
    origin: row.origin,
    startDate: row.start_date,
    endDate: row.end_date,
    travelerCount: row.traveler_count,
    budgetTotal: Number(row.budget_total),
    currency: row.currency,
    status: row.status,
    userRequest: row.user_request || "",
    parsedRequest: row.parsed_request,
    tripState: row.trip_state,
    finalItinerary: row.final_itinerary,
    events,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function persistTrip(accessToken: string | null, trip: TripRecord, userId: string | null) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase || !userId) {
    pipelineLog("persist", `skip supabase=${Boolean(supabase)} user=${userId ?? "none"}`)
    return trip
  }

  pipelineLog("persist", `insert dest=${trip.destination} user=${userId}`)

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      title: trip.title,
      destination: trip.destination,
      origin: trip.origin,
      start_date: trip.startDate,
      end_date: trip.endDate,
      traveler_count: trip.travelerCount,
      budget_total: trip.budgetTotal,
      currency: trip.currency,
      status: trip.status,
      user_request: trip.userRequest,
      parsed_request: trip.parsedRequest,
      trip_state: trip.tripState,
      final_itinerary: trip.finalItinerary,
      rejection_count: trip.tripState?.rejectionCount ?? 0,
    })
    .select("*")
    .single()

  if (error || !data) {
    pipelineWarn("persist", "insert failed", error)
    throw new Error(`Unable to save this trip: ${error?.message || "Supabase did not return a trip."}`)
  }

  pipelineLog("persist", `saved id=${data.id}`)

  if (trip.events.length) {
    const { error: eventsError } = await supabase.from("agent_events").insert(
      trip.events.map((e) => ({
        trip_id: data.id,
        agent: e.agent,
        event_type: e.type,
        message: e.message,
        round: e.round ?? null,
        payload: { status: e.status, details: e.details },
      }))
    )
    if (eventsError) {
      // The itinerary has already been stored successfully. Preserve that result
      // while surfacing the missing event history in server diagnostics.
      pipelineWarn("persist", "agent event insert failed", eventsError)
    }
  }

  return mapTrip(data as TripRow, trip.events)
}

export async function listTrips(accessToken: string | null, userId: string) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return []
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) {
    throw new Error(`Unable to load trips: ${error.message}`)
  }
  return (data as TripRow[]).map((row) => mapTrip(row))
}

export async function getTrip(accessToken: string | null, id: string, userId: string) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return null
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Unable to load trip: ${error.message}`)
  if (!data) return null
  const { data: events } = await supabase
    .from("agent_events")
    .select("*")
    .eq("trip_id", id)
    .order("created_at", { ascending: true })
  const mappedEvents: AgentEvent[] =
    events?.map((e) => ({
      timestamp: new Date(e.created_at).toLocaleTimeString("en-GB", { hour12: false }),
      agent: e.agent,
      message: e.message,
      type: e.event_type,
      round: e.round,
      status: e.payload?.status,
      details: e.payload?.details,
    })) ?? []
  return mapTrip(data as TripRow, mappedEvents)
}

export async function deleteTrip(accessToken: string | null, id: string, userId: string) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return
  const { error } = await supabase.from("trips").delete().eq("id", id).eq("user_id", userId)
  if (error) throw new Error(`Unable to delete trip: ${error.message}`)
}

export async function currentUserId(accessToken: string | null) {
  if (!accessToken || !isSupabaseConfigured()) return null
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await client.auth.getUser(accessToken)
  return data.user?.id ?? null
}

export async function upsertProfile(
  accessToken: string | null,
  userId: string,
  patch: Record<string, unknown>
) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return null
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...patch, id: userId, updated_at: new Date().toISOString() })
    .select("*")
    .single()
  if (error) {
    throw new Error(`Unable to save profile: ${error.message}`)
  }
  return data as UserProfile
}

export async function getProfile(accessToken: string | null, userId: string) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return null
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  if (error) throw new Error(`Unable to load profile: ${error.message}`)
  return data as UserProfile | null
}

export async function listSaved(accessToken: string | null, userId: string) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return []
  const { data, error } = await supabase
    .from("saved_places")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`Unable to load saved places: ${error.message}`)
  return (data ?? []) as SavedPlace[]
}

export async function toggleSaved(
  accessToken: string | null,
  userId: string,
  item: { category: SavedPlaceCategory; externalId: string; title?: string; payload?: unknown }
) {
  const supabase = createServerSupabase(accessToken)
  if (!supabase) return { saved: false }
  const { data: existing, error: lookupError } = await supabase
    .from("saved_places")
    .select("id")
    .eq("user_id", userId)
    .eq("category", item.category)
    .eq("external_id", item.externalId)
    .maybeSingle()
  if (lookupError) throw new Error(`Unable to check saved place: ${lookupError.message}`)
  if (existing) {
    const { error } = await supabase.from("saved_places").delete().eq("id", existing.id)
    if (error) throw new Error(`Unable to remove saved place: ${error.message}`)
    return { saved: false }
  }
  const { error } = await supabase.from("saved_places").insert({
    user_id: userId,
    category: item.category,
    external_id: item.externalId,
    title: item.title,
    payload: item.payload,
  })
  if (error) throw new Error(`Unable to save place: ${error.message}`)
  return { saved: true }
}
