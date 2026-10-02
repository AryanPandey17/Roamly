import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUser } from "@/server/auth";

const STEPS = [
  {
    title: "Agents propose",
    text: "Logistics works out a route that is physically possible. Recommendations picks the stay and the things worth doing.",
  },
  {
    title: "Budget pushes back",
    text: "A calculator, not a guess, adds everything up. If the plan is over, Budget names the exact limit to hit.",
  },
  {
    title: "The plan converges",
    text: "The agents revise until the total fits, or you are told plainly how far over the cheapest option is.",
  },
];

export default async function LandingPage() {
  const user = await getUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-12 px-4 py-16">
      <header className="space-y-5">
        <p className="text-sm font-medium text-primary">Roamly</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Trip plans that survive a budget check.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Tell it where and how much. Three agents with opposing priorities negotiate in front of you until the
          itinerary fits.
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link href="/trips" className={buttonClass()}>
              Go to your trips
            </Link>
          ) : (
            <>
              <Link href="/signup" className={buttonClass()}>
                Plan a trip
              </Link>
              <Link href="/login" className={buttonClass("secondary")}>
                Log in
              </Link>
            </>
          )}
        </div>
      </header>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card className="h-full space-y-2">
              <p className="font-mono text-xs text-muted">0{index + 1}</p>
              <h2 className="font-medium">{step.title}</h2>
              <p className="text-sm text-muted">{step.text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </main>
  );
}
