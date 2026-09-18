import { NextResponse } from "next/server"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, listTrips } from "@/lib/db/trips"
import { isSupabaseConfigured } from "@/lib/config"

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ trips: [], source: "mock" })
  }
  const token = bearerFrom(request)
  const userId = await currentUserId(token)
  if (!userId) return NextResponse.json({ trips: [], source: "supabase" })
  const trips = await listTrips(token, userId)
  return NextResponse.json({ trips, source: "supabase" })
}
