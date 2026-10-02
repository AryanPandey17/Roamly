import { z } from "zod";
import { hintsSchema } from "@/orchestrator";
import { listTrips } from "@/server/account";
import { parseBody, withUser } from "@/server/http";
import { createTrip } from "@/server/trips";

const createSchema = z.object({
  prompt: z.string().trim().min(3, "Describe the trip in a few words.").max(4000),
  hints: hintsSchema.default({}),
});

export const GET = withUser(async ({ user }) => ({ trips: await listTrips(user.id) }));

/** Creates a trip and a queued run. The run starts when the client opens its stream. */
export const POST = withUser(async ({ request, user }) => {
  const body = await parseBody(request, createSchema);
  return createTrip(user.id, body);
});
