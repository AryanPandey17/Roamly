# Roamly — AI Multi-Agent Trip Planner

Premium travel-planning prototype where four specialized agents collaborate: **Supervisor**, **Logistics**, **Recommendations**, and **Budget**. They parse a trip brief, propose flights and stays, negotiate cost vs quality, and produce a day-by-day itinerary.

## Current status

Working full-stack **frontend + agent graph + persistence hooks**. Live LLM planning uses **Google Gemini**. Auth and trip storage use **Supabase** when configured. Flight / hotel / maps APIs are adapters behind tools and fall back to a destination catalog until those keys are reviewed.

| Area | Status |
|------|--------|
| Landing, auth, dashboard, plan-trip wizard | Done |
| Live planning stream (logs + negotiation + itinerary) | Done |
| Gemini agents (parse → logistics → recs → budget loop → finalize) | Done (Gemini 3.x compatible: no `function` role) |
| Deterministic `calculateTotal` (Budget never does mental math) | Done |
| Supabase schema, RLS, trip/profile/saved APIs | Done — enable with env + SQL |
| Duffel / Expedia / Viator / Google Maps | Placeholders — catalog until keys are approved |
| Demo Mode | Runs the live graph when `GEMINI_API_KEY` is set; otherwise the mock replay |

## Architecture

```
User form
  → POST /api/trips/plan (SSE)
    → Supervisor parse
    → Logistics (searchFlights + getTransitTime)
    → Recommendations (searchHotels + searchActivities)
    → Budget (calculateTotal in code)
    → reject + ceiling → Recommendations again (max 3)
    → compromise fallback if still over
    → Supervisor finalize JSON itinerary
  → optional persist to Supabase
  → Dashboard / Itinerary / Flights / Hotels / Budget UI
```

Schema: `supabase/schema.sql`  
Env template: `.env.example`

## Getting started

```bash
npm install
cp .env.example .env.local
# add GEMINI_API_KEY (required for live agents)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Minimum for live agents

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

(or any model your key supports). Tools run in TypeScript; Gemini only ranks and writes JSON.

### Supabase (auth + saved trips)

1. Create a project and paste `NEXT_PUBLIC_SUPABASE_URL` plus that same project's **publishable key** (or legacy `anon` key) into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run `supabase/schema.sql` in the SQL editor. This creates `profiles`, `trips`, `agent_events`, and `saved_places`, with the RLS policies the app requires.
3. Restart the Next.js server after changing any `NEXT_PUBLIC_*` variable.

`SUPABASE_SERVICE_ROLE_KEY` is optional and is intentionally not used for browser-backed writes. Keep it server-only for future trusted admin tasks; the app APIs write with the signed-in user's JWT so RLS is enforced. If the dashboard shows no rows, first verify the public key is valid and that the schema script has been run.

If those vars are empty, login is demo-only and trips stay in memory / mock data.

### Later (review)

- `DUFFEL_API_KEY` — live flights  
- `EXPEDIA_RAPID_*` — hotels  
- `VIATOR_API_KEY` / `GETYOURGUIDE_API_KEY` — activities  
- `GOOGLE_MAPS_API_KEY` — transit times and map overlay  

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Gemini (`@google/generative-ai`), Supabase JS, Recharts.
