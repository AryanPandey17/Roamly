import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { AgentAvatar } from "@/components/trip/agents";

const LINES = [
  { agent: "recommendations", text: "A hotel in the centre at $320 a night." },
  { agent: "budget", text: "Rejected. Over by $460. Find one under $165." },
  { agent: "recommendations", text: "Switched to a boutique hotel at $150." },
  { agent: "budget", text: "Approved. $50 to spare." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Roamly home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>

      {/* Decorative panel: a taste of the negotiation. Hidden on small screens and from screen readers. */}
      <aside aria-hidden className="hidden flex-col justify-center gap-8 bg-primary p-12 text-primary-foreground lg:flex">
        <p className="max-w-md font-display text-4xl font-semibold leading-tight tracking-tight">
          Three agents argue about your trip so you do not have to.
        </p>
        <ul className="max-w-md space-y-3">
          {LINES.map((line, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-background/10 p-3 text-sm backdrop-blur">
              <AgentAvatar agent={line.agent} size="sm" />
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
