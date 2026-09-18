import { NextResponse } from "next/server"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, listTrips } from "@/lib/db/trips"
import { isSupabaseConfigured } from "@/lib/config"

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ trips: [], source: "mock" })
    }
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const trips = await listTrips(token, userId)
    return NextResponse.json({ trips, source: "supabase" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load trips." },
      { status: 500 }
    )
  }
}
