import { notFound, requireUuid, withUser } from "@/server/http";
import { getTripDetail, softDeleteTrip } from "@/server/trips";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async ({ context }) => {
  const id = requireUuid((await context.params).id, "Trip");
  const detail = await getTripDetail(id);
  if (!detail) throw notFound("Trip");
  return detail;
});

export const DELETE = withUser<Ctx>(async ({ context }) => {
  const id = requireUuid((await context.params).id, "Trip");
  await softDeleteTrip(id);
  return { ok: true };
});
