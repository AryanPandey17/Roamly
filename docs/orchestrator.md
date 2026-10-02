# Roamly — Orchestrator (Phase 4)

Last updated: 2026-10-03. What was built in Phase 4, how to run it, and where it differs from the earlier design docs.

## What exists now

| Piece | Where |
|---|---|
| Entry point: `runTrip(request, onEvent, deps)` and `resumeTrip(...)` | `src/orchestrator/index.ts` |
| Shared state (Zod `StateSchema`) | `src/orchestrator/state.ts` |
| Graph: nodes, edges, routing rules | `src/orchestrator/graph.ts` |
| Agents | `src/orchestrator/agents/` |
| Prompts | `src/orchestrator/prompts/index.ts` |
| Tools with Zod schemas, budget calculator | `src/orchestrator/tools/` |
| LLM module: providers, fallback, limiter, logging | `src/orchestrator/llm/` |
| Model registry | `config/models.json` |
| Limits (rejections, request budget, timeouts) | `src/orchestrator/config.ts` |
| Supabase run store, telemetry, checkpointer wiring | `src/server/run-store.ts`, `src/server/orchestrator.ts` |
| API | `POST /api/trips`, `GET /api/runs/[id]/stream` (SSE), `POST /api/runs/[id]/resume` |
| UI | `/trips/new`, `/trips/[id]` (live negotiation, then itinerary), `/debug/runs/[id]` |

Nothing under `src/orchestrator/` imports Next.js or Supabase. Everything external arrives through `deps` (`ports.ts`).

## How a run works

1. `POST /api/trips` stores the trip, the request and a `queued` run, and returns their ids.
2. The trip page opens `GET /api/runs/{id}/stream`. That request replays stored events, claims the run, and executes it.
3. Events are saved to `agent_messages` with a sequence number and sent to the browser as they happen.
4. State is checkpointed in Postgres (schema `langgraph`) after every step, under thread id = run id.
5. If the browser reconnects, it sends the last sequence number and gets only newer events. If another request already owns the run, the stream follows it from the database.
6. Closing the tab does not stop the run.

## Where the LLM is used, and where it is not

| Step | LLM | Code |
|---|---|---|
| Parse request | Reads the prompt into fields (`reasoning`) | Merges with form fields and profile defaults, validates dates, geocodes |
| Logistics propose | Calls `search_flights` and `estimate_travel_time`, picks one (`worker`) | Red flags, id validation, fallback ranking |
| Recommendations propose | Calls `search_hotels` and `search_places`, picks (`worker`) | Id validation, activity count, fallback ranking |
| Budget audit | Words the verdict (`fast`), only if it repeats the calculator's numbers | Total, verdict, target category, ceiling |
| Mediate | — | Builds the instruction and routes |
| Revise | Chooses among options that already fit the ceiling (`worker`) | Ceiling filter, re-search, "nothing cheaper" detection |
| Compromise | — | Cheapest feasible combination, honest label |
| Finalize | Arranges activities into days, writes a summary (`reasoning`) | Totals, itinerary rows, markdown |

When a model's answer is unusable (invalid JSON twice, an id that was not in the tool results, malformed tool arguments twice), the node uses its rule-based choice and the feed shows "Chosen by rule, not by the model" with the reason. When every model is unavailable, the run pauses and can be resumed.

A clean run uses about 7 LLM requests. A run with three rejections uses about 11.

## LLM fallback

For each role, `config/models.json` lists tiers in order. A tier is tried only if its API key is set, it has live models, and its daily quota is not spent.

1. **OpenRouter** with the tier's free models sent as OpenRouter's `models` array and `provider.require_parameters: true`.
2. **NVIDIA** hosted endpoint, with thinking on for `reasoning` and off otherwise.

Tools are bound to each model first, then the tiers are chained with LangChain's `withFallbacks`. Each provider has one shared token-bucket limiter. Every attempt writes a row to `llm_call_logs` and increments `provider_quota_usage`.

## Commands

| Command | Purpose |
|---|---|
| `npm run models:check` | Pings every configured model with a tiny tool call. One real request per model |
| `npm run dev` | Checkpoint tables are created automatically on first use |

## Differences from the earlier docs

| Earlier doc said | What was built | Why |
|---|---|---|
| Missing budget is assumed from budget style | The run stops and asks for a budget | A made-up budget would make the whole negotiation meaningless |
| `npm run checkpointer:setup` | Setup runs automatically when the server first needs it | One less step to forget |
| Startup health check pings every model | Manual `models:check`, plus dead ids are dropped in-process on "model not found" | A startup ping would spend a fifth of the daily free quota each time |
| Fan-in to Budget through a join edge | Two plain edges | With the Postgres checkpointer, a resumed run did not continue past the join. Plain edges resume correctly |
| Geocoding chosen in Phase 5 | Open-Meteo geocoding is wired now | It is free, needs no key, and avoids fake coordinates |

## Sample data still in use

Flights, stays, activities and daily cost estimates come from `src/orchestrator/providers/dev.ts`. Every option is tagged `dev-fixture`, names end in "(sample)", and the itinerary page shows a notice. Phase 5 replaces this file with real providers. Geocoding is already real.

## How this was checked

Without access to the real API keys or database from the build environment, checks used stand-ins:

- **Graph logic:** eight scripted-model scenarios run end to end: approval after one rejection, three rejections then compromise within budget, compromise still over budget, a model that returns nonsense, a model that picks ids that do not exist, a model that sends malformed tool arguments, missing budget, and form fields with a useless model. In every completed run the itinerary's item costs sum to the calculator's total.
- **Fallback chain:** the real LLM module against a local mock of both providers: a 429 on tier 1 falls through to tier 2 with the tool call intact, the `models` array and `require_parameters` reach the provider, a spent daily quota skips tier 1, a missing key skips its tier, and both tiers failing raises the resumable error.
- **Checkpointing:** the real Postgres checkpointer on a local PostgreSQL 16: a run paused mid-step, a fresh process resumed it, the parse step and the finished Logistics branch were not re-run, and the run completed.
- **Not checked:** real OpenRouter and NVIDIA responses, the configured model ids, and the Supabase run store against the live project. These are covered by the manual checklist.
