// Shared Postgres connection for the scripts in this folder.
// Run them with:  node --env-file=.env scripts/<name>.mjs
import pg from "pg";

export function connect() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error(
      "SUPABASE_DB_URL is not set. Add the Postgres connection string from\n" +
        "Supabase (Connect → Session pooler) to .env and try again."
    );
    process.exit(1);
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
  return new pg.Client({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
}
