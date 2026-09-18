import { NextResponse } from "next/server"
import { providerStatus } from "@/lib/config"

export async function GET() {
  return NextResponse.json(providerStatus())
}
