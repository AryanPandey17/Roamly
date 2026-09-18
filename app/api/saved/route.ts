import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/config"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, listSaved, toggleSaved } from "@/lib/db/trips"

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [], source: "mock" })
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ items: [] })
  const items = await listSaved(token, userId)
  return NextResponse.json({ items, source: "supabase" })
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ saved: false, source: "mock" })
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json()
  const result = await toggleSaved(token, userId, {
    category: body.category,
    externalId: String(body.externalId ?? body.id),
    title: body.title,
    payload: body.payload,
  })
  return NextResponse.json({ ...result, source: "supabase" })
}
