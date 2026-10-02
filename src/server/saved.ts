import "server-only";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "@/server/http";
import type { Enums, Json } from "@/types/database";

const KIND: Partial<Record<Enums<"item_type">, Enums<"option_kind">>> = {
  flight: "flight",
  stay: "stay",
  activity: "place",
};

export async function listSaved(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("saved_options")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load saved items: ${error.message}`);
  return data;
}

/** Bookmarks an itinerary item. Saving the same option twice keeps one copy. */
export async function saveItem(userId: string, itemId: string) {
  const db = await createClient();
  const { data: item } = await db
    .from("itinerary_items")
    .select("*, itineraries(trip_id, currency)")
    .eq("id", itemId)
    .maybeSingle();
  const kind = item ? KIND[item.type] : undefined;
  if (!item || !kind) throw notFound("Item");

  const parent = item.itineraries as unknown as { trip_id: string; currency: string } | null;
  const { error } = await db.from("saved_options").upsert(
    {
      user_id: userId,
      trip_id: parent?.trip_id ?? null,
      kind,
      provider: item.provider ?? "roamly",
      external_id: item.external_id ?? item.id,
      title: item.title.replace(/^Check in: /, ""),
      payload: {
        description: item.description,
        cost: item.cost_amount,
        currency: parent?.currency ?? item.currency,
        deepLink: item.deep_link,
        lat: item.lat,
        lng: item.lng,
      } as Json,
    },
    { onConflict: "user_id,kind,provider,external_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(`Could not save the item: ${error.message}`);
  return { ok: true };
}

export async function removeSaved(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("saved_options").delete().eq("id", id).select("id");
  if (error) throw new Error(`Could not remove the saved item: ${error.message}`);
  if (!data.length) throw notFound("Saved item");
  return { ok: true };
}
