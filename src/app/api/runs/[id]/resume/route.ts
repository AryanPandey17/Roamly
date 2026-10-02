import { requireUuid, withUser } from "@/server/http";
import { requeueRun } from "@/server/trips";

/** Puts a paused run back in the queue. The client then reopens the stream, which picks it up from its last checkpoint. */
export const POST = withUser<{ params: Promise<{ id: string }> }>(async ({ context }) => {
  const id = requireUuid((await context.params).id, "Run");
  await requeueRun(id);
  return { ok: true };
});
