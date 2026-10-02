import Link from "next/link";
import {
  BudgetArt,
  ItineraryArt,
  NegotiationArt,
  PlacesArt,
  RouteArt,
} from "@/components/illustrations";
import { NegotiationDemo } from "@/components/landing/demo";
import { GlobeSlot } from "@/components/landing/globe-slot";
import { Story } from "@/components/landing/story";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUser } from "@/server/auth";

const AGENT_ROWS = [
  {
    tag: "Supervisor agent",
    heading: "One agent runs the whole negotiation.",
    text: "Tell it where you're going and how much you can spend. It splits the work across the other three agents, settles their disagreements, and tells you every assumption it made along the way.",
    photo: "photo-forest",
    art: <NegotiationArt />,
  },
  {
    tag: "Logistics agent",
    heading: "Routes that actually hold together.",
    text: "Real flights ranked by travel time, stops and arrival hour. Tight layovers and middle-of-the-night arrivals are flagged before anything is suggested to you.",
    photo: "photo-dusk",
    art: <RouteArt />,
  },
  {
    tag: "Recommendations agent",
    heading: "Stays and days out worth the money.",
    text: "The best-rated stay it can find and places that match what you told it, laid out day by day. It is allowed to overspend. That is the point.",
    photo: "photo-dawn",
    art: <PlacesArt />,
  },
  {
    tag: "Budget agent",
    heading: "Nothing ships until it fits.",
    text: "A calculator, not a guess, adds up every flight, room and activity. Go over, and it sends the plan back with the exact limit to hit.",
    photo: "photo-sea",
    art: <BudgetArt />,
  },
];

const BENTO = [
  {
    title: "Budget negotiation, visible",
    text: "Watch the Budget agent reject a hotel and the Recommendations agent come back with a cheaper one.",
    cta: "See a negotiation",
    href: "#example",
    photo: "photo-sea",
    art: <NegotiationArt className="scale-[0.6]" />,
  },
  {
    title: "Day by day, not a list",
    text: "Times, places and costs laid out by day on a map, ready to follow.",
    cta: "How a run works",
    href: "#run",
    photo: "photo-dusk",
    art: <ItineraryArt className="scale-90" />,
  },
  {
    title: "Live prices, honest estimates",
    text: "Flights and stays are current search results. Anything estimated is marked as an estimate, with its source.",
    cta: "Start planning",
    href: "/signup",
    photo: "photo-dawn",
    art: <BudgetArt className="scale-90" />,
  },
  {
    title: "Start from one sentence",
    text: "A city, a length and a budget is enough. The agents fill in the rest and tell you what they assumed.",
    cta: "Try it now",
    href: "/signup",
    photo: "photo-forest",
    art: <RouteArt className="scale-75" />,
  },
];

const tag = "inline-block rounded-full bg-accent-soft px-3 py-1 text-[0.82rem] font-semibold text-accent-deep";

export default async function LandingPage() {
  const user = await getUser();
  const start = user ? "/trips/new" : "/signup";

  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-5 sm:px-14">
          <Link href="/" aria-label="Roamly home">
            <Logo className="text-[1.35rem]" />
          </Link>
          <nav aria-label="Site" className="flex items-center gap-4 sm:gap-7">
            <a href="#how" className="hidden text-[0.94rem] font-medium text-muted hover:text-foreground sm:inline">
              How it works
            </a>
            {user ? null : (
              <Link href="/login" className="hidden text-[0.94rem] font-medium text-muted hover:text-foreground sm:inline">
                Log in
              </Link>
            )}
            <ThemeToggle />
            <Link href={user ? "/home" : "/signup"} className={buttonClass("primary", "px-5")}>
              {user ? "Open Roamly" : "Start planning"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[860px] px-5 pt-14 text-center sm:pt-20">
          <h1 className="animate-rise font-display text-[clamp(2.6rem,6vw,4.4rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Plan easier.
            <br />
            Travel further.
          </h1>
          <p className="mx-auto mt-6 max-w-[34rem] animate-rise text-[1.15rem] leading-relaxed text-muted [animation-delay:0.1s]">
            Four AI agents research your flights, stays and days out, then argue with each other until the plan fits
            your budget.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap justify-center gap-3 [animation-delay:0.2s]">
            <Link href={start} className={buttonClass("primary", "px-7", "lg")}>
              Start planning
            </Link>
            <a href="#example" className={buttonClass("secondary", "px-7", "lg")}>
              Watch it work
            </a>
          </div>
        </section>

        <section className="relative mx-auto mt-12 max-w-[1320px] animate-rise px-5 [animation-delay:0.3s] sm:px-14">
          <div className="photo photo-sunset h-[clamp(280px,40vw,460px)] rounded-[28px]">
            {/* A square larger than the banner, so the globe fills it and is cropped by the rounded frame. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[190%] -translate-x-1/2 -translate-y-[42%]">
              <GlobeSlot onPhoto />
            </div>
          </div>
          <div className="absolute inset-x-0 -bottom-12 hidden justify-center gap-5 sm:flex">
            <div className="photo photo-gold flex h-[118px] w-[168px] -rotate-3 items-end rounded-2xl border-4 border-background p-3 shadow-card">
              <span className="font-display text-[0.92rem] font-bold text-white">Proposed</span>
            </div>
            <div className="photo photo-dusk flex h-[118px] w-[168px] translate-y-3 items-end rounded-2xl border-4 border-background p-3 shadow-card">
              <span className="font-display text-[0.92rem] font-bold text-white">Rejected</span>
            </div>
            <div className="photo photo-lagoon flex h-[118px] w-[168px] rotate-3 items-end rounded-2xl border-4 border-background p-3 shadow-card">
              <span className="font-display text-[0.92rem] font-bold text-white">Within budget</span>
            </div>
          </div>
        </section>

        {/* How it works: the four agents */}
        <section id="how" className="mx-auto max-w-[1180px] scroll-mt-24 px-5 pb-12 pt-32 sm:px-14 sm:pt-40">
          <div className="mx-auto mb-14 max-w-[34rem] text-center">
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold">How it works</h2>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">
              Four specialists, each with a different priority, working on the same trip at once.
            </p>
          </div>
          {AGENT_ROWS.map((row, i) => (
            <div
              key={row.tag}
              className="grid items-center gap-10 border-b border-border py-12 last:border-b-0 md:grid-cols-2 md:gap-20"
            >
              <div
                className={cn(
                  "photo grid h-[clamp(240px,26vw,340px)] place-items-center rounded-[22px]",
                  row.photo,
                  i % 2 ? "md:order-2" : ""
                )}
              >
                <div className="scale-125 sm:scale-150">{row.art}</div>
              </div>
              <div>
                <span className={tag}>{row.tag}</span>
                <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,1.95rem)] font-extrabold leading-[1.15]">
                  {row.heading}
                </h3>
                <p className="mt-3.5 max-w-[30rem] text-[1.02rem] leading-[1.65] text-muted">{row.text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Bento */}
        <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-14">
          <div className="mx-auto mb-14 max-w-[34rem] text-center">
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold">What you get</h2>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">A plan you can check, not one you have to trust.</p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENTO.map((card) => (
              <li key={card.title} className="overflow-hidden rounded-[20px] border border-border bg-surface-2">
                <div className={cn("photo grid h-[150px] place-items-center", card.photo)}>{card.art}</div>
                <div className="px-5 pb-6 pt-5">
                  <h3 className="font-display text-[1.05rem] font-bold">{card.title}</h3>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{card.text}</p>
                  <a href={card.href} className="mt-3.5 inline-block text-[0.85rem] font-semibold text-primary hover:underline">
                    {card.cta}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* One example run */}
        <section id="example" className="mx-auto max-w-[1180px] scroll-mt-24 px-5 py-20 sm:px-14">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className={tag}>Example run</span>
              <h2 className="mt-4 font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold leading-tight">
                Watch a plan get rejected, then fixed.
              </h2>
              <p className="mt-4 max-w-[30rem] text-[1.02rem] leading-[1.65] text-muted">
                This is the kind of exchange you see live for your own trip: proposals, a rejection with an exact number,
                a revision, and a total that moves under the limit.
              </p>
            </div>
            <NegotiationDemo />
          </div>
        </section>

        {/* One run, step by step */}
        <section id="run" className="mx-auto max-w-[1180px] scroll-mt-24 px-5 py-20 sm:px-14">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold">One run, start to finish</h2>
              <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">
                The order is fixed in code. No model decides who speaks next, and the loop always ends.
              </p>
            </div>
            <Story />
          </div>
        </section>

        {/* Call to action */}
        <section className="mx-5 mb-24 rounded-[28px] bg-[#14453f] px-8 py-16 text-center text-white sm:mx-14 sm:py-20">
          <h2 className="mx-auto max-w-[30rem] font-display text-[clamp(1.8rem,3.6vw,2.5rem)] font-extrabold leading-tight">
            See what four agents can put together for your next trip.
          </h2>
          <Link
            href={start}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-[#ff6a45] px-7 font-semibold text-white transition-colors hover:bg-white hover:text-[#14453f]"
          >
            Start planning
          </Link>
        </section>
      </main>

      <footer className="border-t border-border px-5 pb-10 pt-14 sm:px-14">
        <div className="mx-auto grid max-w-[1320px] gap-8 border-b border-border pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[16rem] text-[0.9rem] leading-normal text-muted">
              Multi-agent trip planning. Routes, stays, experiences and budget, negotiated for you.
            </p>
          </div>
          {[
            { title: "For travellers", links: [["Plan a trip", start], ["Your trips", "/trips"], ["Saved", "/saved"]] },
            { title: "Product", links: [["How it works", "#how"], ["Example run", "#example"], ["One run, step by step", "#run"]] },
            { title: "Account", links: [["Log in", "/login"], ["Sign up", "/signup"], ["Settings", "/settings"]] },
          ].map((col) => (
            <div key={col.title} className="flex flex-col gap-2.5">
              <h3 className="mb-1.5 text-[0.85rem] font-semibold">{col.title}</h3>
              {col.links.map(([label, href]) => (
                <Link key={label} href={href} className="text-[0.9rem] text-muted hover:text-foreground">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 pt-6 text-[0.85rem] text-muted">
          <span>© 2026 Roamly</span>
          <span>A final-year project. Map data © OpenStreetMap contributors.</span>
        </div>
      </footer>
    </div>
  );
}
