import { runPlanningGraph } from "@/lib/agents/graph"
import { pipelineError, pipelineLog } from "@/lib/agents/log"
import { bearerFrom } from "@/lib/supabase/client"
import { currentUserId, persistTrip } from "@/lib/db/trips"
import type { GraphEvent, PlanTripInput } from "@/lib/types/trip"

export const maxDuration = 120

export async function POST(request: Request) {
  const body = (await request.json()) as PlanTripInput
  const token = bearerFrom(request)
  const userId = await currentUserId(token)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: GraphEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        pipelineLog(
          "api.plan",
          `POST dest=${body.destination || body.to || "(unspecified)"} user=${userId ?? "anon"}`
        )
        const trip = await runPlanningGraph(body, async (event) => {
          send(event)
        })
        pipelineLog("api.plan", `persist trip=${trip.id} user=${userId ?? "anon"}`)
        const stored = await persistTrip(token, trip, userId)
        pipelineLog("api.plan", `SSE done trip=${stored.id} dest=${stored.destination}`)
        send({ type: "done", trip: stored })
      } catch (error) {
        pipelineError("api.plan", error instanceof Error ? error.message : "Planning failed", error)
        send({ type: "error", message: error instanceof Error ? error.message : "Planning failed" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

const encoder = new TextEncoder()
