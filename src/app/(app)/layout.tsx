import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/form-status";
import { getProfile } from "@/server/account";
import { requireUser } from "@/server/auth";

const NAV = [
  { href: "/trips", label: "Trips" },
  { href: "/trips/new", label: "New trip" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
          <Link href="/trips" className="font-semibold">
            Roamly
          </Link>
          <nav aria-label="Main" className="flex flex-1 items-center gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-sm text-muted sm:inline">{profile?.full_name ?? user.email}</span>
          <form action={signOut}>
            <SubmitButton variant="ghost" pendingLabel="Signing out…" className="px-0">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
