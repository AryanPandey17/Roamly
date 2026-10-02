import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "@/server/http";

/** The trip's active share link, if any. Runs as the user, so only the owner sees it. */
export async function getActiveShare(tripId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shared_trips")
    .select("token, created_at")
    .eq("trip_id", tripId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the share link: ${error.message}`);
  return data;
}

/** Returns the existing link or creates one. RLS checks that the user owns the trip. */
export async function createShare(userId: string, tripId: string) {
  const existing = await getActiveShare(tripId);
  if (existing) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shared_trips")
    .insert({ trip_id: tripId, user_id: userId })
    .select("token, created_at")
    .single();
  if (error) throw notFound("Trip"); // not the owner, or no such trip
  return data;
}

export async function revokeShares(tripId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shared_trips")
    .update({ revoked_at: new Date().toISOString() })
    .eq("trip_id", tripId)
    .is("revoked_at", null);
  if (error) throw new Error(`Could not revoke the share link: ${error.message}`);
}

/**
 * What a visitor with a share link may see: the trip title and its itinerary.
 * Resolved on the server with the service role, because anonymous visitors
 * have no database access at all. The token is the only credential.
 */
export async function getSharedTrip(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("shared_trips")
    .select("trip_id, expires_at")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (!share || (share.expires_at && share.expires_at < new Date().toISOString())) return null;

  const [trip, itinerary] = await Promise.all([
    admin.from("trips").select("title, destination, deleted_at").eq("id", share.trip_id).maybeSingle(),
    admin.from("itineraries").select("*").eq("trip_id", share.trip_id).maybeSingle(),
  ]);
  if (!trip.data || trip.data.deleted_at || !itinerary.data) return null;

  const [days, items] = await Promise.all([
    admin.from("itinerary_days").select("*").eq("itinerary_id", itinerary.data.id).order("day_number"),
    admin.from("itinerary_items").select("*").eq("itinerary_id", itinerary.data.id).order("position"),
  ]);
  return { title: trip.data.title, itinerary: itinerary.data, days: days.data ?? [], items: items.data ?? [] };
}
