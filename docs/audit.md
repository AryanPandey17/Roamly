# Phase 0 Audit — Roamly (Multi-Agent Trip Planner)

Audit date: 2026-10-02. Repo state: `main` @ `32e083d` ("Integrating Mistal llm for gemini fallback"), 4 commits, remote `github.com/AryanPandey17/Roamly`.
No code was changed in this phase. This file is the only thing added.

---

## 1. Summary

The repo is a working demo, not a multi-agent system yet. Four things matter most:

1. **There is no LangGraph.** `lib/agents/graph.ts` is a hand-written `while` loop. No graph, no typed shared state with reducers, no checkpointing, no parallel branches.
2. **The LLM never calls a tool.** Tools run in TypeScript, their results are pasted into the prompt, and the model only ranks and writes JSON. The prompts tell the model to "call searchFlights", but nothing is bound.
3. **All travel data is fabricated.** Flights, hotels and activities come from a hardcoded catalog (`lib/tools/catalog.ts`). Any destination outside 7 cities silently gets Tokyo's coordinates and Tokyo's airports.
4. **The app is a single-route client SPA.** One `app/page.tsx` switches 20 "pages" on a React state variable. No URLs, no server components, no route protection, no server-side session.

Reusable: the deterministic budget math, the agent prompts (as intent), the SSE envelope idea, the domain types (as a base for Zod schemas), and the profile trigger SQL. Almost everything else is a rewrite, which matches the plan.

Baseline health: `tsc --noEmit` passes. There are no tests and no test runner.

---

## 2. Current stack and versions

| Area | What is there | Notes |
|---|---|---|
| Framework | Next.js 16.3.3, App Router, no `src/` dir | Latest is 16.3.8. Alias `@/*` → `./*` |
| React | 19.2.8 | |
| Language | TypeScript ^5, `strict: true` | Node v22 locally |
| Styling | Tailwind CSS 4 + a 442-line `app/globals.css` | Plus 155 inline `style={{}}` blocks and a large inline `<style>` in `LandingPage.tsx:45` |
| LLM | `@google/generative-ai` ^0.24.1 and raw `fetch` to Mistral | Both to be removed |
| DB/Auth | `@supabase/supabase-js` ^2.116.0 only | No `@supabase/ssr`, no `proxy.ts`/`middleware.ts` |
| Charts/UI | `recharts`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` | |
| Unused dep | `framer-motion` | Zero imports |
| Validation | none | No Zod anywhere |
| Tests / CI | none | |

`AGENTS.md` (auto-written by `next dev`) warns that Next 16 has breaking changes and says to read `node_modules/next/dist/docs/` before writing code. That will be followed from Phase 3 on. One relevant change: `middleware.ts` is now `proxy.ts`.

---

## 3. Structure and entry points

```
app/
  layout.tsx            wraps everything in AppProvider
  page.tsx              "use client"; switch(activePage) over 20 page components
  globals.css
  api/
    trips/plan/route.ts POST, SSE — runs the planner
    trips/route.ts      GET list
    trips/[id]/route.ts GET, DELETE
    saved/route.ts      GET, POST toggle
    profile/route.ts    GET, PUT
    status/route.ts     GET provider flags (public)
components/             AppLayout, Sidebar, PageHeader, pages/* (20 files)
context/AppContext.tsx  596 lines: routing, auth, theme, planning, saved items, mock demo
lib/
  agents/               graph, supervisor, logistics, recommendations, budget, gemini, math, prompts, log
  tools/                index.ts (tool functions), catalog.ts (fake data)
  db/trips.ts           all Supabase queries
  supabase/             browser.ts, client.ts
  trip/view.ts          maps a trip to UI shapes, falls back to mock data
  types/                trip.ts, persistence.ts
  mockData.ts           571 lines of demo content
  api.ts, config.ts, utils.ts
supabase/schema.sql     single SQL file, 4 tables
```

---

## 4. How a request flows today

1. User fills the wizard in `PlanTripPage`. State lives in `AppContext.requirements`.
2. `planTrip()` → `startPlanning()` (`context/AppContext.tsx:520`). If an LLM key or a signed-in session exists it runs live; otherwise it replays `mockAgentLogs` on timers (`:479`).
3. `planTripStream()` (`lib/api.ts:19`) POSTs to `/api/trips/plan` with the Supabase access token in an `Authorization` header and reads the SSE body.
4. The route handler (`app/api/trips/plan/route.ts`) calls `runPlanningGraph(body, emit)`.
5. `runPlanningGraph` (`lib/agents/graph.ts:20`), in order:
   - Supervisor parse (LLM, deterministic fallback)
   - Logistics once (catalog flights → LLM picks 2 → haversine transit)
   - Loop up to 4 rounds: Recommendations → Budget (`calculateTotal`) → approve, or reject and repeat
   - After 3 rejections: `applyCompromise` (drop activities, then a cheaper hotel)
   - Supervisor finalize (LLM, deterministic fallback)
6. Only after the whole run finishes does `persistTrip` insert one `trips` row and the `agent_events` rows.
7. The client maps events into the "planning process" and "negotiations" views, then shows the itinerary.

Good news for the refactor: `runPlanningGraph(input, emit)` already has roughly the `runTrip(request, onEvent)` shape, and it does not import Next.js request/response objects.

---

## 5. Direct Gemini / Mistral usage (all to be removed)

| File:line | What |
|---|---|
| `lib/agents/gemini.ts:1` | `import { GoogleGenerativeAI } from "@google/generative-ai"` |
| `lib/agents/gemini.ts:11-77` | `runGeminiJson` — the single LLM entry point for every agent |
| `lib/agents/gemini.ts:15-21` | Mistral is tried **first**, Gemini is the fallback (opposite of the commit message) |
| `lib/agents/gemini.ts:27-30, 39-49, 58-67` | Three Gemini `generateContent` calls (JSON mime, retry without mime, repair) |
| `lib/agents/gemini.ts:79-81` | `new GoogleGenerativeAI(process.env.GEMINI_API_KEY)` |
| `lib/agents/gemini.ts:83-121` | `runMistralJson` — raw `fetch("https://api.mistral.ai/v1/chat/completions")` |
| `lib/agents/supervisor.ts:48, 135` | Parse and finalize calls |
| `lib/agents/logistics.ts:85` | Flight ranking call |
| `lib/agents/recommendations.ts:56` | Hotel/activity pick call |
| `lib/agents/budget.ts:44` | Budget feedback wording call |
| `lib/config.ts:8-18, 49-55, 59-60` | Gemini/Mistral config flags and default model names (`gemini-2.0-flash`, `mistral-small-latest`) |
| `lib/api.ts:4-5`, `context/AppContext.tsx:100-101, 523` | `gemini` / `mistral` provider flags used by the UI |
| `package.json:12` | `@google/generative-ai` dependency |
| `.env`, `.env.example:8-9`, `README.md` | `GEMINI_*`, `MISTRAL_*` variables and setup text |

Other direct third-party calls in tools: Duffel (`lib/tools/index.ts:43-101`), Google Distance Matrix (`:123-141`), Tavily (`:202-221`).

---

## 6. Hardcoded values, mocks and canned data

### 6.1 Backend — fake data presented as tool results

| File:line | Item |
|---|---|
| `lib/tools/catalog.ts:11-21` | City coordinates for 7 cities. **Unknown destinations return Tokyo's lat/lng** |
| `lib/tools/catalog.ts:23-32` | IATA codes for 6 cities. **Unknown destinations return NRT/HND** |
| `lib/tools/catalog.ts:34-146` | 5 invented flights (AI302, SQ421, CX654, JL728, EK501) with fixed times and durations, returned for every route |
| `lib/tools/catalog.ts:45-46` | Price = `38000 + hash % 12000`, plus fixed offsets |
| `lib/tools/catalog.ts:148-221` | 4 invented hotels ("Grand Atelier", "Central Boutique Hotel", "Station Inn", "Capsule & Lodge") at fixed ₹12,000 / 6,800 / 4,200 / 2,800 per night |
| `lib/tools/catalog.ts:223-320` | 6 invented activities with fixed costs, city name string-interpolated in |
| `lib/tools/catalog.ts:326-336` | Transit time = haversine at 35 km/h + 20 min, minimum 25 |
| `lib/tools/index.ts:163-174, 183-192` | `searchHotels` / `searchActivities` always use the catalog, even when an Expedia/Viator key is set |
| `lib/tools/index.ts:198-200` | `webSearch` returns a canned "Catalog grounding" sentence without Tavily |
| `lib/agents/supervisor.ts:16-17` | Default start date +35 days, default length 5 days |
| `lib/agents/supervisor.ts:21-22` | Default destination `"Tokyo"` |
| `lib/agents/supervisor.ts:30-33` | Default budget `200000`, currency `"INR"`, interests `["culture","food"]` |
| `lib/agents/graph.ts:99, 158` | `maxRounds = 4`, rejection cap `3` as inline literals |
| `lib/agents/graph.ts:247` | Compromise hotel ceiling `max(1000, 50% of current)`, default `8000` |
| `lib/agents/recommendations.ts:23, 44, 82` | 70% retry ceiling, top-4 / top-5 activity cut-offs |
| `lib/agents/math.ts:95` | `safetyMargin` 0.85, rounding to nearest 100 |
| `lib/config.ts:40-47` | Default origin Mumbai / BOM / 19.0896, 72.8656 |
| `lib/config.ts:50, 54` | Default model IDs |
| `app/api/trips/plan/route.ts:7` | `maxDuration = 120` |

### 6.2 Frontend — mock content

| File:line | Item |
|---|---|
| `lib/mockData.ts:23-41` | `initialRequirements` — Mumbai → Tokyo, 15–20 Sep 2026, ₹2,00,000 (pre-fills the form and drives Demo Mode) |
| `lib/mockData.ts:51-65` | `mockAgentLogs` — 13 scripted agent log lines |
| `lib/mockData.ts:75-123` | `mockNegotiations` — scripted negotiation thread |
| `lib/mockData.ts:125-213` | `mockFlights`, `mockHotels` |
| `lib/mockData.ts:215-289` | `mockRecommendations` |
| `lib/mockData.ts:290-493` | `mockDayPlans` — a full canned Tokyo itinerary |
| `lib/mockData.ts:494-501` | `mockArchitectures` ("FastAPI / Node.js (placeholder)", "OpenAI GPT-4o / Google Gemini") |
| `lib/mockData.ts:503-513` | `mockBudgetBreakdown`, totals |
| `lib/mockData.ts:515-546` | `mockTrips` (Tokyo, Paris, Goa) |
| `lib/mockData.ts:548-563` | `mockOptimizations` (fake savings) |
| `lib/mockData.ts:565-571` | `mockMapPins` — the "map" is emoji at CSS percentages |
| `lib/trip/view.ts:20-37, 43-55, 63-74, 80-88, 124` | Every view helper falls back to mock data when a trip is missing |
| `lib/trip/view.ts:26-27, 30, 69, 79` | `"BOM"`, `"NRT"`, `510`, `2200`, `200000` literals |
| `context/AppContext.tsx:111-115` | `demoSavedItems` |
| `context/AppContext.tsx:307-311, 325-329, 370-374` | **Demo login**: with Supabase unset, any email/password "signs in"; Google sign-in becomes `google@roamly.app` |
| `context/AppContext.tsx:479-518, 534-540` | Timer-driven mock planning replay; `stopDemo` backfills mock logs |
| `components/pages/DashboardPage.tsx:21-24` | Fake "recent agent activity" feed |
| `components/pages/DashboardPage.tsx:30, 58` | `mockTrips` fallback; stat tile `"₹7.6L"` |
| `components/pages/AgentsPage.tsx:16, 43` (and neighbours) | Fake agent metrics ("98%", "₹32,000", "8/8") |
| `components/pages/ProfilePage.tsx:14, 99` | `demo@roamly.app`; "Total savings ₹32,000" |
| `components/pages/ItineraryPage.tsx:19, 150` | "Your Optimized Tokyo Adventure" fallback title; `mockMapPins` |
| `components/pages/BudgetInsightsPage.tsx:88` | `mockOptimizations` |
| `components/pages/SavedPage.tsx:56-80, 102` | `demoEntries()` from mock data |
| `components/pages/MyTripsPage.tsx:16` | `mockTrips` fallback |
| `components/pages/ArchitecturePage.tsx:12-16, 49` | Renders `mockArchitectures` |
| `components/pages/LandingPage.tsx:34, 494-516` | Mock budget rows, "₹26,000 cheaper", ₹2,00,000 / ₹3,50,000 / ₹45,000 sample cards |
| `lib/trip/view.ts:136`, catalog `image` fields | Emoji used as imagery |
| Many components | `₹` and `en-IN` formatting hardcoded regardless of trip currency |

---

## 7. Bugs and correctness problems found

These are live defects, separate from "it's mocked".

1. **Priced flight ≠ shown flight.** `calculateTotal` prices the *cheapest* flight (`lib/agents/math.ts:65`), but `finalizeItinerary` displays the *most convenient* one (`lib/agents/supervisor.ts:111`). The total on the itinerary can belong to a flight the user is not shown.
2. **Over-budget plans are labelled approved.** `applyCompromise` sets `budgetStatus: "approved"` even when still over (`lib/agents/graph.ts:269`), and `graph.ts:189` forces `"approved"` unconditionally.
3. **Logistics never renegotiates.** Flights are chosen once outside the loop; only hotels and activities move. The Budget agent can only ever ask for a cheaper hotel.
4. **No parallelism.** Logistics and Recommendations run in sequence, not as parallel initial proposals.
5. **Duffel adapter is broken** (`lib/tools/index.ts:43-101`): it ignores the user's origin and always uses the default IATA (`:51, :63`); it sends the destination *city name* where an IATA code is required (`:63`); `destinationIata` is set from `arriving_at`, a timestamp (`:90`); and Duffel's `total_amount` (all passengers) would be multiplied by travelers again in `calculateTotal`.
6. **No currency handling.** Offers can come back in a different currency than the budget and are summed as-is.
7. **Cost model is incomplete.** No food, local transport, taxes, or room count. The mock UI shows those categories; the real calculator has three.
8. **Budget feedback is parsed with regex** (`lib/agents/math.ts:29-44`) to recover a number the code itself computed a moment earlier. It should be a typed state field.
9. **LLM output is trusted without validation.** `parseJsonFromText<T>` casts to `T`; `recommendations.ts:78-82` accepts LLM-returned hotel/activity objects without checking they exist in the search results, so invented or re-priced items can enter the total.
10. **Silent degradation.** Every agent swallows LLM failures and falls back to deterministic picks, so a run with a dead key looks like a successful "AI" run.
11. **Late-arrival detection** relies on a regex over free-text notes (`supervisor.ts:80`).

---

## 8. Auth, API and data layer

### Auth
- Session lives in the browser only (`supabase-js` default storage). The server never sees a cookie; the client sends `Authorization: Bearer <token>` (`lib/supabase/client.ts:30`).
- No `@supabase/ssr`, no `proxy.ts`, no server components, no protected routes. "Protection" is which component the client chooses to render.
- No OAuth callback route. `signInWithOAuth({ provider: "google" })` has no `redirectTo` (`AppContext.tsx:375`).
- Password reset sends the email with `redirectTo: window.location.origin` and there is no "set new password" screen (`AppContext.tsx:358-360`).
- Two duplicate browser clients: `lib/supabase/browser.ts` and `createBrowserSupabase` in `lib/supabase/client.ts`.

### API routes
- **`POST /api/trips/plan` runs without authentication.** `userId` may be null and planning proceeds as "anon" (`route.ts:12, 22`). Anyone can spend LLM quota.
- No request-body validation on any route (`request.json()` cast to a type).
- The run is tied to one open HTTP request. If the tab closes, the work and the result are lost; nothing is persisted until the end; nothing can resume.
- `GET /api/status` is public and reveals which providers are configured.
- Routes return `source: "mock"` with empty data when Supabase is unset, instead of failing.

### Database (`supabase/schema.sql`)
- 4 tables: `profiles`, `trips`, `agent_events`, `saved_places`. The spec needs roughly 16.
- RLS is enabled on all four with own-row policies; profile-creation trigger exists and is sound (`security definer`, fixed `search_path`).
- Gaps: `trips.user_id` is nullable; status is a `text` check rather than an enum; itinerary, state and request are JSON blobs; no migrations folder (one idempotent script); no generated TypeScript types (hand-written row types in `lib/db/trips.ts:8-26`); no soft delete; no logging, quota, checkpoint, audit or share tables.

### Secrets
- `.env` is git-ignored and has **never been committed** (checked `git log --all`). No key values appear in history.
- The service-role key is not referenced anywhere in code. Good. The comment in `.env` ("Used for schema-safe writes from API routes") is stale.
- `.env` has `MISTRAL_API_KEY` / `MISTRAL_MODEL`, which are missing from `.env.example`.
- README says to copy to `.env.local`, but the project uses `.env`.
- Env var name is `NEXT_PUBLIC_SUPABASE_ANON_KEY`; current Supabase docs use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

---

## 9. Reusable vs rewrite

| Keep (port and harden) | Why |
|---|---|
| `lib/agents/math.ts` — `calculateTotal`, `nightsBetween`, `nightlyCeilingToFitBudget` | Deterministic and pure. Becomes the Budget agent's calculator tool after fixing §7.1, §7.6, §7.7, and adding tests |
| `lib/agents/prompts.ts` | Good statements of each agent's intent and boundaries. Rewrite for real tool calling |
| `lib/types/trip.ts` | Starting point for the Zod state and tool schemas |
| SSE envelope (`GraphEvent`) and `planTripStream` reader | Concept carries over; event types will expand |
| `handle_new_user` trigger, `touch_updated_at`, own-row RLS pattern | Move into migrations |
| `runPlanningGraph(input, emit)` signature | Already close to `runTrip(request, onEvent)` |
| Wizard field set in `PlanTripPage` / `TripRequirements` | Useful input for onboarding and trip-creation design |

| Rewrite or delete | Why |
|---|---|
| `lib/agents/gemini.ts` | Replaced by the `llm` module (OpenRouter-first) |
| `lib/agents/graph.ts`, `logistics.ts`, `recommendations.ts`, `budget.ts`, `supervisor.ts` | Replaced by LangGraph.js nodes with bound tools |
| `lib/tools/catalog.ts`, `lib/mockData.ts`, `lib/trip/view.ts` fallbacks | Fake data. Removed |
| `lib/tools/index.ts` | Replaced by provider interfaces and Zod-typed tools (Phase 5) |
| `lib/supabase/*`, `lib/db/trips.ts` | Replaced by `@supabase/ssr` clients and typed queries |
| `supabase/schema.sql` | Replaced by full schema as migrations |
| `context/AppContext.tsx`, `app/page.tsx` | Replaced by real routes, server components, small client stores |
| All of `components/`, `app/globals.css` | Phase 6 rebuild from scratch |
| `framer-motion`, `@google/generative-ai` | Unused / removed |

---

## 10. LangGraph.js readiness (verified 2026-10-02)

Versions are from the npm registry today. API claims were checked against the official docs and, where marked "(types)", against the installed packages' `.d.ts` files.

| Need | Status | Detail |
|---|---|---|
| Core packages | OK | `@langchain/langgraph` 1.4.18, `@langchain/core` 1.2.14, `@langchain/openai` 1.6.2, `langchain` 1.5.15. Node ≥ 18 |
| Zod state | OK | `StateSchema`, `ReducedValue`, `UntrackedValue`, `MessagesValue` from `@langchain/langgraph`, with `zod/v4`. Peer range `zod ^3.25.32 \|\| ^4.2.0`; current zod is 4.6.5. Repo has no Zod yet |
| Reducers, parallel branches | OK | `ReducedValue` reducers; fan-out via multiple edges or `Send` |
| Conditional routing / handoffs | OK | `addConditionalEdges`, `Command({ update, goto })`, `Command.PARENT` for subgraphs |
| Loop breakers | OK | Own counter in state plus `recursionLimit` (default 25) and `GraphRecursionError` |
| Checkpointing | OK | `@langchain/langgraph-checkpoint` 1.1.5 (`MemorySaver`) and `@langchain/langgraph-checkpoint-postgres` 1.0.5: `PostgresSaver.fromConnString(conn, { schema })` then `await setup()` (types). **No custom checkpointer needed** |
| Supabase-backed checkpoints | OK with one requirement | `PostgresSaver` uses `pg` over a real Postgres connection, not the Supabase REST keys. Needs a new server-only `SUPABASE_DB_URL`. Plan: dedicated `langgraph` schema not exposed to the Data API. To confirm in Phase 3: which Supabase pooler mode works with `pg` here |
| Resume | OK | `thread_id` in `configurable`; re-invoke on the same thread to continue; `durability` option on runs (types); `interrupt` available for user-confirmation steps |
| Streaming | OK | `streamMode`: `values`, `updates`, `messages`, `custom`, `tools`, `debug`. `config.writer(...)` emits custom events from a node; `subgraphs: true` for nested graphs. Maps cleanly to SSE |
| Supervisor pattern | OK | `@langchain/langgraph-supervisor` 1.1.3 (`createSupervisor`, `createHandoffTool`) exists. **Recommendation: do not use it for the main loop.** It routes by LLM choice; the spec wants deterministic conditional edges. Build a custom `StateGraph` |
| Model fallback | OK | `.withFallbacks({ fallbacks })` on any runnable (types). The fallback wrapper has no `bindTools`, so the order is: build model → `bindTools` → wrap. Matches Section 6.4 |
| Rate limiter | **Gap, not a blocker** | `@langchain/core` 1.2.14 for JS ships no rate-limiter class (only `maxConcurrency` / `maxRetries`). We write a small shared token bucket per provider |
| OpenAI-compatible providers | OK | `ChatOpenAI` accepts `configuration.baseURL` and `modelKwargs` for extra body fields such as OpenRouter's `models` and `provider` (types). To prove in a Phase 4 spike that `modelKwargs` passes them through untouched. Alternative: `@langchain/openrouter` 0.4.17 exists as a first-party integration |
| Node retries / caching | OK | `retryPolicy` and `cachePolicy` per node (`InMemoryCache`) |
| MCP | OK | `@langchain/mcp-adapters` 2.0.0 |

**Blockers: none.** LangGraph.js can carry the whole design. No change of course needed.

### Provider facts verified today

| Fact | Result |
|---|---|
| OpenRouter `:free` limits | 20 requests/min. **50 requests/day** with no credit purchase; **1000/day** after ≥ $10 lifetime credits. Request-based, not token-based |
| Remaining quota | `GET https://openrouter.ai/api/v1/key` returns `free_model_daily_requests` (`used`, `limit`, `remaining`), reset on UTC day |
| Failed requests counting toward the cap | **Not stated** on the limits page. Unverified; we will measure it and design as if they count |
| Negative balance | Can cause 402 errors even on free models |
| `models` fallback array | Confirmed. Any error can trigger fallback, including context-length, moderation, rate limit, downtime. Served model is in the response `model` field. Via OpenAI SDKs it goes in the extra body. A 3-entry cap is documented for the Anthropic-style endpoint; cap for chat completions not confirmed |
| `provider.require_parameters` | Confirmed. `true` restricts to providers that support every request parameter (tools included) |
| NVIDIA endpoint | `nvidia/nemotron-3-ultra-550b-a55b` exists at `https://integrate.api.nvidia.com/v1`, lists tool calling, `enable_thinking` shown in the sample. **Rate limits are not published** on the model page; `reasoning_budget` not confirmed |
| Supabase SSR | `@supabase/ssr` 0.12.7. `createBrowserClient` / `createServerClient`. On Next 16 the file is `proxy.ts`. Docs say to use `getClaims()` (verifies the token) for protection and never trust `getSession()` on the server. Env name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

**Quota arithmetic that affects design:** today's flow makes 5 LLM calls when the plan passes first time (parse, logistics, recommendations, budget, finalize) and 9 with three rejections. Real tool calling adds at least one extra request per tool round-trip, so expect roughly double. At 50 requests/day that is about 3–5 full runs per day per API key, shared by everyone using it. At 1000/day it is comfortable.

---

## 11. Risks and gaps against the spec

| # | Risk / gap | Impact |
|---|---|---|
| R1 | 50 req/day free cap on OpenRouter without the $10 top-up | Development and demo will stall daily. See Q1 |
| R2 | Free model quality: malformed or missing tool calls | Needs schema validation, retry-or-skip, and a health check. Planned in Section 6 |
| R3 | NVIDIA limits unknown | Treat as best-effort; conservative limiter and 429 backoff |
| R4 | Real flight/hotel prices on a student budget | Phase 5 research. Likely "search + price + deep link", not booking |
| R5 | Checkpointer needs a direct DB connection string | One more server-only secret; pooler mode to confirm |
| R6 | Long runs vs one HTTP request | Needs run records, event log in Supabase, and a reconnect/resume endpoint |
| R7 | Whole frontend is one client route | Phases 3–4 need real routes for auth callbacks and protected pages before the Phase 6 redesign. See Q6 |
| R8 | No tests today | Test runner must be chosen and set up in Phase 3 |
| R9 | Next 16 differences from older tutorials | Follow `node_modules/next/dist/docs/` per `AGENTS.md` |
| R10 | Cost model has 3 categories | Spec's budget audit needs food, local transport, FX. Schema and calculator must grow |
| R11 | Anonymous planning endpoint | Must require auth before any real LLM quota is attached |
| R12 | Supabase project state unknown | Fresh migrations may collide with the existing 4 tables. See Q5 |
