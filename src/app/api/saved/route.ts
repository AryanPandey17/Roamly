import { z } from "zod";
import { parseBody, withUser } from "@/server/http";
import { listSaved, saveItem } from "@/server/saved";

export const GET = withUser(async ({ user }) => ({ saved: await listSaved(user.id) }));

export const POST = withUser(async ({ request, user }) => {
  const { itemId } = await parseBody(request, z.object({ itemId: z.uuid() }));
  return saveItem(user.id, itemId);
});
