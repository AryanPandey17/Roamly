import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/config"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, getProfile, upsertProfile } from "@/lib/db/trips"

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ profile: null, source: "mock" })
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const profile = await getProfile(token, userId)
    return NextResponse.json({ profile, source: "supabase" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load profile." },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ profile: null, source: "mock" })
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await request.json()
    const profile = await upsertProfile(token, userId, {
      full_name: typeof body.full_name === "string" ? body.full_name : undefined,
      home_location: typeof body.home_location === "string" ? body.home_location : undefined,
      travel_style: typeof body.travel_style === "string" ? body.travel_style : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      theme: ["light", "dark", "system"].includes(body.theme) ? body.theme : undefined,
      countries_visited: Array.isArray(body.countries_visited)
        ? body.countries_visited.filter((country: unknown) => typeof country === "string")
        : undefined,
      notifications:
        body.notifications && typeof body.notifications === "object" && !Array.isArray(body.notifications)
          ? body.notifications
          : undefined,
    })
    return NextResponse.json({ profile, source: "supabase" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save profile." },
      { status: 500 }
    )
  }
}
