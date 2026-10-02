import { preferencesPatchSchema } from "@/lib/preferences";
import { getPreferences, updatePreferences } from "@/server/account";
import { notFound, parseBody, withUser } from "@/server/http";

export const GET = withUser(async ({ user }) => {
  const preferences = await getPreferences(user.id);
  if (!preferences) throw notFound("Preferences");
  return { preferences };
});

export const PUT = withUser(async ({ request, user }) => {
  const patch = await parseBody(request, preferencesPatchSchema);
  return { preferences: await updatePreferences(user.id, patch) };
});
