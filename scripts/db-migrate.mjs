// Applies supabase/migrations/*.sql in filename order, once each.
// Each file runs in its own transaction and is recorded in
// public.schema_migrations, so re-running is safe.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./_db.mjs";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

const client = connect();
await client.connect();

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    );
    alter table public.schema_migrations enable row level security;
  `);

  const applied = new Set(
    (await client.query("select name from public.schema_migrations")).rows.map((r) => r.name)
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    process.stdout.write(`applying ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
      count += 1;
    } catch (error) {
      await client.query("rollback");
      console.log("FAILED");
      console.error(`\n${file}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }

  if (!process.exitCode) {
    console.log(count ? `\n${count} migration(s) applied.` : "Nothing to apply. Database is up to date.");
  }
} finally {
  await client.end();
}
