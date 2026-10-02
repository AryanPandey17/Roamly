import Link from "next/link";
import { NegotiationArt } from "@/components/illustrations";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Roamly home">
            <Logo className="text-[1.35rem]" />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>

      {/* Decorative panel. Hidden on small screens and from screen readers. */}
      <aside aria-hidden className="hidden p-4 lg:block">
        <div className="photo photo-sunset flex h-full flex-col justify-between rounded-[28px] p-12 text-white">
          <div className="grid flex-1 place-items-center">
            <NegotiationArt className="scale-[1.6]" />
          </div>
          <p className="max-w-md font-display text-[2.4rem] font-extrabold leading-[1.1]">
            Four agents argue about your trip, so you do not have to.
          </p>
        </div>
      </aside>
    </div>
  );
}
