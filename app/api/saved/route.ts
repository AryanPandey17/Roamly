import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/config"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, listSaved, toggleSaved } from "@/lib/db/trips"
import type { SavedPlaceCategory } from "@/lib/types/persistence"

const savedCategories = new Set<SavedPlaceCategory>(["hotels", "flights", "recs"])

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ items: [], source: "mock" })
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const items = await listSaved(token, userId)
    return NextResponse.json({ items, source: "supabase" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load saved places." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ saved: false, source: "mock" })
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await request.json()
    if (!savedCategories.has(body.category) || body.externalId === undefined || body.externalId === null) {
      return NextResponse.json({ error: "A valid category and item id are required." }, { status: 400 })
    }
    const result = await toggleSaved(token, userId, {
      category: body.category,
      externalId: String(body.externalId),
      title: typeof body.title === "string" ? body.title : undefined,
      payload: body.payload,
    })
    return NextResponse.json({ ...result, source: "supabase" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update saved place." },
      { status: 500 }
    )
  }
}
