"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { AgentAvatar } from "@/components/trip/agents";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  {
    agent: "supervisor",
    title: "You say where and how much",
    text: "The Supervisor reads your sentence, fills the gaps from your profile, and tells you every assumption it made.",
  },
  {
    agent: "logistics",
    title: "Logistics finds a route that works",
    text: "It ranks real flights by travel time, stops and arrival hour, and flags tight layovers. Price is not its problem.",
  },
  {
    agent: "recommendations",
    title: "Recommendations picks the good stuff",
    text: "The best-rated stay and the places that match your interests. It is allowed to overspend. That is the point.",
  },
  {
    agent: "budget",
    title: "Budget does the sums and says no",
    text: "A calculator adds it all up. If the plan is over, Budget names the exact limit to hit and sends it back.",
  },
  {
    agent: "supervisor",
    title: "The plan converges",
    text: "After at most three rounds you get a day-by-day itinerary that fits, or an honest note of how far over the cheapest option is.",
  },
];

/**
 * Scroll-told explanation of one run. Each step fades up as it enters the
 * viewport and the line beside the steps fills with scroll progress.
 * useGSAP reverts every animation and trigger when the component unmounts.
 */
export function Story() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".story-step", {
          opacity: 0,
          y: 32,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
        gsap.fromTo(
          ".story-line",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top 70%", end: "bottom 60%", scrub: 0.4 },
          }
        );
      });
      return () => media.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative">
      <div aria-hidden className="absolute left-4 top-2 bottom-2 w-px bg-border" />
      <div aria-hidden className="story-line absolute left-4 top-2 bottom-2 w-px origin-top bg-primary" />
      <ol className="space-y-10">
        {STEPS.map((step, i) => (
          <li key={step.title} className="story-step relative flex gap-5 pl-0">
            <span className="relative z-10 rounded-full bg-background p-0.5">
              <AgentAvatar agent={step.agent} />
            </span>
            <div className="max-w-xl space-y-1.5">
              <p className="font-mono text-xs text-muted">Step {i + 1}</p>
              <h3 className="font-display text-2xl font-extrabold tracking-tight">{step.title}</h3>
              <p className="text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
