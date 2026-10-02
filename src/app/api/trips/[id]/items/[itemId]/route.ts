import { parseBody, requireUuid, withUser } from "@/server/http";
import { itemPatchSchema, removeActivity, updateActivity } from "@/server/itinerary";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/** Move an activity to another day or change its start time. */
export const PATCH = withUser<Ctx>(async ({ request, context }) => {
  const { id, itemId } = await context.params;
  const patch = await parseBody(request, itemPatchSchema);
  return updateActivity(requireUuid(id, "Trip"), requireUuid(itemId, "Item"), patch);
});

/** Remove an activity. The total is recalculated in code. */
export const DELETE = withUser<Ctx>(async ({ context }) => {
  const { id, itemId } = await context.params;
  return removeActivity(requireUuid(id, "Trip"), requireUuid(itemId, "Item"));
});
