import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/config"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, getProfile, upsertProfile } from "@/lib/db/trips"

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ profile: null, source: "mock" })
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ profile: null }, { status: 401 })
  const profile = await getProfile(token, userId)
  return NextResponse.json({ profile, source: "supabase" })
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ profile: null, source: "mock" })
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json()
  const profile = await upsertProfile(token, userId, body)
  return NextResponse.json({ profile, source: "supabase" })
}
