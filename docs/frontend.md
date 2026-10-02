# Roamly — Frontend (Phase 6)

Last updated: 2026-10-03. What the interface is built from and where it differs from `docs/ux_flow.md`.

## Design system

| Piece | Where | Notes |
|---|---|---|
| Tokens | `src/app/globals.css` | Colours, radius, shadow and one colour per agent, each with a light and a dark value. Components use token names only |
| Type | Geist for interface text, Fraunces for headings | Both are bundled packages, so the build needs no network |
| Theme | `src/components/theme.tsx` | Light, dark or system. An inline script sets `<html data-theme>` before first paint, so there is no flash. The choice is stored in the browser |
| Primitives | `src/components/ui/` | Button, Card, Badge, Field, Skeleton. Small, own code on Tailwind CSS 4 |
| Icons | `lucide-react` | |

## Screens

| Route | What it does |
|---|---|
| `/` | Landing: 3D globe, a replayed example negotiation (labelled "Example run"), the four agents, a scroll-told walk through one run, and what makes the output checkable |
| `/login`, `/signup`, `/forgot-password`, `/auth/update-password` | Split layout with the form on one side |
| `/onboarding` | Preference defaults, skippable |
| `/trips` | Trip cards with status, search once there are more than three, delete with confirmation |
| `/trips/new` | One prompt box, example prompts, optional details |
| `/trips/[id]` | Live negotiation while the run is active. Once an itinerary exists: tabs for the itinerary and for how the agents got there |
| `/saved` | Bookmarked flights, stays and places |
| `/settings` | Profile, preferences, theme, password |
| `/share/[token]` | Read-only itinerary with map, no account needed |
| `/debug/runs/[id]` | Model and tool calls for a run |

## The trip page

**Negotiation.** Agent roster with a pulsing "working" state inferred from the last event, a feed that follows new messages only while you are at the bottom, option cards for proposals, a note when a rule made the choice instead of a model, and a budget meter split by category with a marker at the limit.

**Itinerary.** Day filter, a timeline per day, and a Leaflet map beside it. Hovering a list row highlights its pin and the reverse. Each day draws a dotted line through its stops. Activities can be retimed, moved to another day, or removed; the total is recalculated in code with the same rule the Budget agent uses, and no new run is started. Flights, stays and activities can be bookmarked.

**Actions.** Share link, calendar file, markdown, print.

## Motion and accessibility

- GSAP with ScrollTrigger drives the landing story through `useGSAP`, which reverts animations and triggers on unmount.
- three.js is loaded only in the browser and only on the landing page.
- With `prefers-reduced-motion`, the globe stops, the story shows without animation, the example negotiation shows its finished state, and CSS transitions are disabled.
- Skip link, visible focus rings, labelled controls, `aria-live` on the feed, a `meter` role on the budget bar, and status never shown by colour alone.

## Differences from the plan

| Planned | Built | Why |
|---|---|---|
| shadcn/ui | A handful of own primitives | Five small components did not justify the dependency and its setup |
| Marker clustering | Not added | An itinerary has at most a few dozen pins; the day filter does the same job |
| Swap an item for another candidate | Not added | The agents' other candidates live in the run's checkpoint, not in the itinerary tables. Remove, move and retime are in |
| Theme saved to the profile | Saved in the browser | Reading it from the profile on every page would make every page wait on the database before first paint |
| Custom illustrations, Lottie, parallax | Not added | The globe, the replayed negotiation and the scroll story carry the landing page |

## How this was checked

Rendered in headless Chromium at desktop and phone widths, in light and dark: the landing page, log in, the trip page with fixture data, the negotiation tab, the paused state and the trip list. No console errors. Verified in the browser: the theme survives a reload with no flash, the scroll story reveals on scroll and is fully visible with reduced motion, hovering a list row activates exactly one pin, and the day filter renumbers the pins. Map tiles could not load in the build environment, so the tile layer itself and everything behind sign-in were not seen with real data. No Lighthouse run and no formal accessibility audit were done.
