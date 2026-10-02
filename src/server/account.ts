import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables, TablesUpdate } from "@/types/database";

// All queries here run as the signed-in user, so RLS limits them to their rows.

export async function getProfile(userId: string): Promise<Tables<"profiles"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data;
}

export async function updateProfile(userId: string, patch: TablesUpdate<"profiles">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select("*").single();
  if (error) throw new Error(`Could not save profile: ${error.message}`);
  return data;
}

export async function getPreferences(userId: string): Promise<Tables<"user_preferences"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Could not load preferences: ${error.message}`);
  return data;
}

export async function updatePreferences(userId: string, patch: TablesUpdate<"user_preferences">) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`Could not save preferences: ${error.message}`);
  return data;
}

export async function listTrips(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, budget_amount, currency, total_cost, status, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load trips: ${error.message}`);
  return data;
}
