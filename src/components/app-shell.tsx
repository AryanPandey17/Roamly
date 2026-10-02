import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { AppNav } from "@/components/app-nav";
import { SubmitButton } from "@/components/form-status";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { buttonClass } from "@/components/ui/button";

/**
 * Frame for every signed-in page: a sidebar on wide screens, a top bar and a
 * bottom tab bar on phones.
 */
export function AppShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-[17.5rem]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* Sidebar (wide screens) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-border bg-background px-3 py-5 lg:flex print:hidden">
        <Link href="/home" aria-label="Roamly home" className="mb-6 px-3">
          <Logo className="text-2xl" />
        </Link>
        <AppNav variant="rail" />
        <Link href="/trips/new" className={buttonClass("secondary", "mt-5 w-full border-transparent bg-surface-2", "lg")}>
          <Plus className="size-5" aria-hidden /> New trip
        </Link>

        <div className="mt-auto space-y-4 px-3">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
            <form action={signOut}>
              <SubmitButton variant="ghost" pendingLabel="…" className="size-9 px-0" aria-label="Sign out">
                <LogOut className="size-4" aria-hidden />
              </SubmitButton>
            </form>
          </div>
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden print:hidden">
        <Link href="/home" aria-label="Roamly home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <SubmitButton variant="ghost" pendingLabel="…" className="size-9 px-0" aria-label="Sign out">
              <LogOut className="size-4" aria-hidden />
            </SubmitButton>
          </form>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-8 sm:px-10 lg:pb-12 lg:pt-10">
        {children}
      </main>

      {/* Tab bar (phones) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden print:hidden">
        <AppNav variant="bar" />
      </div>
    </div>
  );
}
