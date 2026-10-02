import { requireUuid, withUser } from "@/server/http";
import { createShare, getActiveShare, revokeShares } from "@/server/share";

type Ctx = { params: Promise<{ id: string }> };

// Sharing is a user action: it only ever runs from a click on the trip page.
export const GET = withUser<Ctx>(async ({ context }) => {
  const id = requireUuid((await context.params).id, "Trip");
  return { share: await getActiveShare(id) };
});

export const POST = withUser<Ctx>(async ({ user, context }) => {
  const id = requireUuid((await context.params).id, "Trip");
  return { share: await createShare(user.id, id) };
});

export const DELETE = withUser<Ctx>(async ({ context }) => {
  const id = requireUuid((await context.params).id, "Trip");
  await revokeShares(id);
  return { ok: true };
});
