import { profilePatchSchema } from "@/lib/preferences";
import { getProfile, updateProfile } from "@/server/account";
import { notFound, parseBody, withUser } from "@/server/http";

export const GET = withUser(async ({ user }) => {
  const profile = await getProfile(user.id);
  if (!profile) throw notFound("Profile");
  return { profile };
});

export const PUT = withUser(async ({ request, user }) => {
  const patch = await parseBody(request, profilePatchSchema);
  return { profile: await updateProfile(user.id, patch) };
});
