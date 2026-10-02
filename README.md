# Roamly — Multi-Agent Trip Planner

Four agents with opposing priorities (Supervisor, Logistics, Recommendations, Budget) negotiate over a shared plan until it passes a budget check, then produce an itinerary.

This branch is a ground-up refactor of the original prototype. Read the docs in this order:

| Doc | What it covers |
|---|---|
| `docs/context.md` | The product, the agents, the shared state, a worked example |
| `docs/workflow.md` | Architecture: graph, tools, LLM fallback, data, auth, API |
| `docs/ux_flow.md` | Screens and flows |
| `docs/implementation_plan.md` | Phases, tasks and checks |
| `docs/database.md` | Schema, RLS policies, ER diagram |
| `docs/audit.md` | What the old code looked like and why it was replaced |

## Status

| Phase | State |
|---|---|
| 3. Database, RLS, auth | Done |
| 4. LLM layer and LangGraph orchestrator | Next |
| 5. Real travel APIs, maps | Pending |
| 6. Frontend | Pending |

## Setup

```bash
npm install
cp .env.example .env     # then fill in the values
npm run db:migrate       # creates the schema in your Supabase project
npm run dev
```

Open http://localhost:3000.

In the Supabase dashboard, under Authentication → URL Configuration, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to the redirect URLs. Google sign-in also needs the Google provider enabled there.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:types` | Regenerate `src/types/database.ts` |

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, RLS), Zod. LangGraph.js arrives in Phase 4.
