import type { GraphEvent, PlanTripInput, TripRecord } from "@/lib/types/trip"

export type ProviderStatus = {
  gemini: boolean
  supabase: boolean
  duffel: boolean
  expedia: boolean
  maps: boolean
  activities: boolean
  tavily: boolean
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const res = await fetch("/api/status")
  return res.json()
}

export async function planTripStream(
  input: PlanTripInput,
  token: string | null,
  onEvent: (event: GraphEvent) => void
): Promise<TripRecord | null> {
  const res = await fetch("/api/trips/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  })
  if (!res.body) throw new Error("No response stream")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let trip: TripRecord | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split("\n\n")
    buffer = chunks.pop() ?? ""
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data: "))
      if (!line) continue
      const event = JSON.parse(line.slice(6)) as GraphEvent
      onEvent(event)
      if (event.type === "done") trip = event.trip
      if (event.type === "error") throw new Error(event.message)
    }
  }
  return trip
}

export async function apiGet<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return res.json()
}

export async function apiSend<T>(path: string, token: string | null, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}
