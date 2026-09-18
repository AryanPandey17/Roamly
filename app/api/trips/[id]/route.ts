import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/config"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, deleteTrip, getTrip } from "@/lib/db/trips"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isSupabaseConfigured()) return NextResponse.json({ trip: null, source: "mock" })
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const trip = await getTrip(token, id, userId)
  return NextResponse.json({ trip, source: "supabase" })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await deleteTrip(token, id, userId)
  return NextResponse.json({ ok: true })
}
