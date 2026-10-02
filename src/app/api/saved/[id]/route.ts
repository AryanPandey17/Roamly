import { requireUuid, withUser } from "@/server/http";
import { removeSaved } from "@/server/saved";

export const DELETE = withUser<{ params: Promise<{ id: string }> }>(async ({ context }) =>
  removeSaved(requireUuid((await context.params).id, "Saved item"))
);
