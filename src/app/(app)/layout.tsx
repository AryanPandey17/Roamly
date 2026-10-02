import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { AppNav } from "@/components/app-nav";
import { SubmitButton } from "@/components/form-status";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { buttonClass } from "@/components/ui/button";
import { getProfile } from "@/server/account";
import { requireUser } from "@/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const name = profile?.full_name ?? user.email ?? "You";

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/trips" aria-label="Roamly, your trips">
            <Logo />
          </Link>
          <div className="ml-2 flex-1 overflow-x-auto">
            <AppNav />
          </div>
          <Link href="/trips/new" className={buttonClass("primary", "hidden sm:inline-flex", "sm")}>
            <Plus className="size-4" aria-hidden /> New trip
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <span
            aria-hidden
            title={name}
            className="hidden size-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary md:grid"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          <form action={signOut}>
            <SubmitButton variant="ghost" pendingLabel="…" className="h-8 px-2" aria-label="Sign out">
              <LogOut className="size-4" aria-hidden />
              <span className="sr-only">Sign out</span>
            </SubmitButton>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>
      <Link
        href="/trips/new"
        className={buttonClass("primary", "fixed bottom-5 right-5 z-30 shadow-card sm:hidden print:hidden", "lg")}
      >
        <Plus className="size-5" aria-hidden /> New trip
      </Link>
    </div>
  );
}
