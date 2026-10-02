import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { getProfile, listTrips } from "@/server/account";
import { requireUser } from "@/server/auth";
import { listSaved } from "@/server/saved";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser();
  const [profile, trips, saved] = await Promise.all([getProfile(user.id), listTrips(user.id), listSaved(user.id)]);
  const name = profile?.full_name ?? user.email ?? "there";

  return (
    <HomeView
      firstName={name.split(/[\s@]/)[0]}
      onboarded={Boolean(profile?.onboarded_at)}
      trips={trips}
      savedCount={saved.length}
    />
  );
}
