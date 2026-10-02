import { ArrowRight, Calculator, CircleDollarSign, Eye, Link2, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { NegotiationDemo } from "@/components/landing/demo";
import { GlobeSlot } from "@/components/landing/globe-slot";
import { Story } from "@/components/landing/story";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { AGENTS, AgentAvatar } from "@/components/trip/agents";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUser } from "@/server/auth";

const AGENT_CARDS = [
  { id: "logistics", wants: "The shortest, sanest way there.", ignores: "What it costs." },
  { id: "recommendations", wants: "The trip you will talk about.", ignores: "Your bank balance." },
  { id: "budget", wants: "A total under your limit.", ignores: "How nice the hotel is." },
  { id: "supervisor", wants: "A decision.", ignores: "Nobody. It keeps them all moving." },
] as const;

const PROOF = [
  { icon: Calculator, title: "Arithmetic in code", text: "No model adds numbers. The total comes from a calculator and every item on the itinerary adds up to it." },
  { icon: CircleDollarSign, title: "Live prices", text: "Flights and stays are current search results with links to book. Estimates are marked as estimates, with their source." },
  { icon: Eye, title: "Nothing hidden", text: "Every proposal, rejection and assumption is in the feed. If a rule made a choice instead of a model, it says so." },
  { icon: RotateCcw, title: "Resumable", text: "Progress is saved after every step. If the free models are busy, the run pauses and picks up where it stopped." },
  { icon: ShieldCheck, title: "Agents cannot act for you", text: "They search and compare. Sharing and exporting only happen when you click." },
  { icon: Link2, title: "Take it with you", text: "A map, a share link, a calendar file and a printable page for every trip." },
];

export default async function LandingPage() {
  const user = await getUser();
  const cta = user ? { href: "/trips/new", label: "Plan a trip" } : { href: "/signup", label: "Plan a trip" };

  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Roamly home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <Link href="/trips" className={buttonClass("secondary", undefined, "sm")}>
                Your trips
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "hidden sm:inline-flex", "sm")}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClass("primary", undefined, "sm")}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="pointer-events-none absolute -right-56 -top-40 hidden h-[46rem] w-[46rem] lg:block">
            <GlobeSlot />
          </div>
          <div className="relative space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" /> Multi-agent trip planning
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Trip plans that survive a <em className="text-primary">budget check</em>.
            </h1>
            <p className="max-w-lg text-lg text-muted">
              Say where and how much. Three agents with opposing priorities negotiate in front of you until the
              itinerary fits.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={cta.href} className={buttonClass("primary", undefined, "lg")}>
                {cta.label} <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href="#how" className={buttonClass("ghost", undefined, "lg")}>
                See how it works
              </a>
            </div>
          </div>
          <div className="relative">
            <NegotiationDemo />
          </div>
        </section>

        {/* Agents */}
        <section className="border-y border-border bg-surface-2/50 py-20">
          <div className="mx-auto w-full max-w-6xl space-y-10 px-4">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-display text-4xl font-semibold tracking-tight">Four agents. They do not agree.</h2>
              <p className="text-muted">
                One model asked to plan a trip, hold a budget and check the geography drops one of the three. So each
                concern gets its own agent, and one of them exists only to say no.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AGENT_CARDS.map((card) => {
                const agent = AGENTS[card.id];
                return (
                  <li key={card.id}>
                    <Card className="h-full space-y-4">
                      <AgentAvatar agent={card.id} />
                      <div>
                        <h3 className="font-display text-xl font-semibold">{agent.name}</h3>
                        <p className={`text-sm font-medium ${agent.text}`}>{agent.role}</p>
                      </div>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted">Wants</dt>
                          <dd>{card.wants}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted">Ignores</dt>
                          <dd>{card.ignores}</dd>
                        </div>
                      </dl>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Story */}
        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-3 lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display text-4xl font-semibold tracking-tight">One run, start to finish</h2>
              <p className="text-muted">
                The order is fixed in code. No model decides who speaks next, and the loop always ends.
              </p>
            </div>
            <Story />
          </div>
        </section>

        {/* Proof */}
        <section className="border-t border-border py-20">
          <div className="mx-auto w-full max-w-6xl space-y-10 px-4">
            <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight">Built to be checked, not trusted.</h2>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {PROOF.map(({ icon: Icon, title, text }) => (
                <li key={title} className="space-y-2">
                  <Icon className="size-6 text-primary" aria-hidden />
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="px-4 pb-24">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 rounded-lg bg-primary px-8 py-14 text-primary-foreground sm:px-14">
            <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Give it a destination and a number.
            </h2>
            <p className="max-w-xl opacity-85">It runs on free models and free travel data. It costs nothing to try.</p>
            <Link
              href={cta.href}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition hover:brightness-95"
            >
              {cta.label} <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted">
          <Logo className="text-base" />
          <p>A final-year project. Map data © OpenStreetMap contributors.</p>
        </div>
      </footer>
    </div>
  );
}
