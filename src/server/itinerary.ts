import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApiError, notFound } from "@/server/http";
import type { Json } from "@/types/database";

export const itemPatchSchema = z
  .object({
    dayId: z.uuid().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.")
      .optional(),
  })
  .refine((v) => v.dayId !== undefined || v.startTime !== undefined, "Nothing to change.");

type Breakdown = {
  currency: string;
  flights: number;
  stay: number;
  activities: number;
  food: number;
  localTransport: number;
  total: number;
  percent: Record<"flights" | "stay" | "activities" | "food" | "localTransport", number>;
};

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

type Db = Awaited<ReturnType<typeof createClient>>;

/** The activity being edited. All queries run as the user, so RLS limits them to their own trips. */
async function loadActivity(db: Db, tripId: string, itemId: string) {
  const { data: itinerary } = await db.from("itineraries").select("*").eq("trip_id", tripId).maybeSingle();
  if (!itinerary) throw notFound("Itinerary");
  const { data: item } = await db
    .from("itinerary_items")
    .select("*")
    .eq("id", itemId)
    .eq("itinerary_id", itinerary.id)
    .maybeSingle();
  if (!item) throw notFound("Item");
  if (item.type !== "activity") {
    throw new ApiError(409, "not_editable", "Only activities can be moved or removed. Flights and stays are fixed.");
  }
  return { itinerary, item };
}

/**
 * After an edit, totals are recomputed from the rows themselves with the same
 * rule the Budget agent uses: activities are the sum of activity items, the
 * other categories are unchanged. No model is involved and no run is started.
 */
async function recalculate(db: Db, tripId: string, itineraryId: string, budget: number, previous: Json) {
  const { data: items, error } = await db
    .from("itinerary_items")
    .select("type, cost_amount")
    .eq("itinerary_id", itineraryId);
  if (error) throw new Error(`Could not recalculate the total: ${error.message}`);

  const old = previous as unknown as Breakdown;
  const activities = items.filter((i) => i.type === "activity").reduce((sum, i) => sum + i.cost_amount, 0);
  const total = Math.round((old.flights + old.stay + activities + old.food + old.localTransport) * 100) / 100;
  const pct = (part: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
  const breakdown: Breakdown = {
    ...old,
    activities,
    total,
    percent: {
      flights: pct(old.flights),
      stay: pct(old.stay),
      activities: pct(activities),
      food: pct(old.food),
      localTransport: pct(old.localTransport),
    },
  };
  const overBy = Math.max(0, Math.round((total - budget) * 100) / 100);

  const [a, b] = await Promise.all([
    db
      .from("itineraries")
      .update({ total_cost: total, over_by: overBy, fits_budget: overBy === 0, cost_breakdown: breakdown as unknown as Json })
      .eq("id", itineraryId),
    db.from("trips").update({ total_cost: total, status: overBy === 0 ? "ready" : "over_budget" }).eq("id", tripId),
  ]);
  if (a.error || b.error) throw new Error("Could not save the new total.");
  return { total, overBy, fitsBudget: overBy === 0 };
}

export async function updateActivity(tripId: string, itemId: string, patch: z.infer<typeof itemPatchSchema>) {
  const db = await createClient();
  const { itinerary, item } = await loadActivity(db, tripId, itemId);
  const update: { day_id?: string; position?: number; start_time?: string; end_time?: string | null } = {};

  if (patch.dayId && patch.dayId !== item.day_id) {
    const { data: day } = await db
      .from("itinerary_days")
      .select("id")
      .eq("id", patch.dayId)
      .eq("itinerary_id", itinerary.id)
      .maybeSingle();
    if (!day) throw notFound("Day");
    update.day_id = day.id;
    update.position = 500; // after the fixed items; the list is shown in time order anyway
  }

  if (patch.startTime) {
    // Keep the activity's length when its start moves.
    const length = item.start_time && item.end_time ? minutesOf(item.end_time) - minutesOf(item.start_time) : null;
    update.start_time = patch.startTime;
    update.end_time = length && length > 0 ? clock(minutesOf(patch.startTime) + length) : item.end_time;
  }

  const { error } = await db.from("itinerary_items").update(update).eq("id", item.id);
  if (error) throw new Error(`Could not update the activity: ${error.message}`);
  return { ok: true };
}

export async function removeActivity(tripId: string, itemId: string) {
  const db = await createClient();
  const { itinerary, item } = await loadActivity(db, tripId, itemId);
  const { error } = await db.from("itinerary_items").delete().eq("id", item.id);
  if (error) throw new Error(`Could not remove the activity: ${error.message}`);
  return recalculate(db, tripId, itinerary.id, itinerary.budget_amount, itinerary.cost_breakdown);
}
