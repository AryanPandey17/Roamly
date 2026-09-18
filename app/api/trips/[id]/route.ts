import { NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/config"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, deleteTrip, getTrip } from "@/lib/db/trips"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isSupabaseConfigured()) return NextResponse.json({ trip: null, source: "mock" })
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const trip = await getTrip(token, id, userId)
    return NextResponse.json({ trip, source: "supabase" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load trip." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = bearerFrom(request)
    const userId = await currentUserId(token)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await deleteTrip(token, id, userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete trip." },
      { status: 500 }
    )
  }
}
