import { AppShell } from "@/components/app-shell";
import { getProfile } from "@/server/account";
import { requireUser } from "@/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <AppShell name={profile?.full_name ?? user.email ?? "Traveller"}>{children}</AppShell>;
}
