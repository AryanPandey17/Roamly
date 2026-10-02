import "server-only";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";
import { createLlm, type Deps } from "@/orchestrator";
import { devProviders } from "@/orchestrator/providers/dev";
import { openMeteoGeocoding } from "@/orchestrator/providers/open-meteo";
import { createRunStore, createTelemetry } from "@/server/run-store";

// Built once per server process. Kept on globalThis so Next.js hot reload in
// development does not open a new connection pool on every file save.
const globals = globalThis as unknown as { __roamlyDeps?: Promise<Deps> };

async function build(): Promise<Deps> {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is not set. It is required for run checkpoints.");
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 5,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

  // LangGraph's own tables live in the `langgraph` schema, away from the Data API.
  const checkpointer = new PostgresSaver(pool, undefined, { schema: "langgraph" });
  await checkpointer.setup(); // creates or migrates its tables; safe to call every start

  const telemetry = createTelemetry(pool);

  return {
    llm: createLlm({ telemetry }),
    store: createRunStore(),
    telemetry,
    // Real geocoding; flights, stays, places and estimates are labelled dev
    // fixtures until the real providers are wired in (Phase 5).
    providers: { ...devProviders, geocoding: openMeteoGeocoding },
    checkpointer,
    now: () => new Date(),
  };
}

export function getDeps(): Promise<Deps> {
  globals.__roamlyDeps ??= build().catch((error) => {
    globals.__roamlyDeps = undefined; // allow a retry after fixing configuration
    throw error;
  });
  return globals.__roamlyDeps;
}
