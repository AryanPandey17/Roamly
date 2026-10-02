// Generates src/types/database.ts from the live database schema.
// Produces the same shape as `supabase gen types typescript`, without needing
// Docker or the Supabase CLI.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./_db.mjs";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "types", "database.ts");
const SKIP_TABLES = new Set(["schema_migrations"]);

const SCALARS = {
  uuid: "string", text: "string", varchar: "string", bpchar: "string", citext: "string",
  date: "string", time: "string", timetz: "string", timestamp: "string", timestamptz: "string",
  int2: "number", int4: "number", int8: "number", float4: "number", float8: "number", numeric: "number",
  bool: "boolean", json: "Json", jsonb: "Json",
};

const client = connect();
await client.connect();

try {
  const enums = (
    await client.query(`
      select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder)::text[] as labels
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      group by t.typname
      order by t.typname`)
  ).rows;
  const enumNames = new Set(enums.map((e) => e.name));

  const columns = (
    await client.query(`
      select c.table_name, c.column_name, c.udt_name, c.is_nullable,
             c.column_default, c.is_identity, c.is_generated
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by c.table_name, c.ordinal_position`)
  ).rows;

  const tsType = (udt) => {
    const isArray = udt.startsWith("_");
    const base = isArray ? udt.slice(1) : udt;
    const mapped = enumNames.has(base)
      ? `Database["public"]["Enums"]["${base}"]`
      : (SCALARS[base] ?? "unknown");
    return isArray ? `${mapped}[]` : mapped;
  };

  const tables = new Map();
  for (const col of columns) {
    if (SKIP_TABLES.has(col.table_name)) continue;
    if (!tables.has(col.table_name)) tables.set(col.table_name, []);
    tables.get(col.table_name).push(col);
  }

  const lines = [];
  lines.push("// GENERATED FILE. Do not edit by hand.");
  lines.push("// Regenerate with `npm run db:types` after changing supabase/migrations.");
  lines.push("");
  lines.push("export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];");
  lines.push("");
  lines.push("export type Database = {");
  lines.push("  public: {");
  lines.push("    Tables: {");
  for (const [name, cols] of tables) {
    lines.push(`      ${name}: {`);
    for (const shape of ["Row", "Insert", "Update"]) {
      lines.push(`        ${shape}: {`);
      for (const col of cols) {
        const nullable = col.is_nullable === "YES";
        const type = tsType(col.udt_name) + (nullable ? " | null" : "");
        const generated = col.is_identity === "YES" || col.is_generated === "ALWAYS";
        const optional =
          shape === "Update" || (shape === "Insert" && (nullable || col.column_default !== null || generated));
        if (shape !== "Row" && col.is_identity === "YES") {
          lines.push(`          ${col.column_name}?: never;`);
        } else {
          lines.push(`          ${col.column_name}${optional ? "?" : ""}: ${type};`);
        }
      }
      lines.push("        };");
    }
    lines.push("        Relationships: [];");
    lines.push("      };");
  }
  lines.push("    };");
  lines.push("    Views: { [_ in never]: never };");
  lines.push("    Functions: { [_ in never]: never };");
  lines.push("    Enums: {");
  for (const e of enums) {
    lines.push(`      ${e.name}: ${e.labels.map((l) => JSON.stringify(l)).join(" | ")};`);
  }
  lines.push("    };");
  lines.push("    CompositeTypes: { [_ in never]: never };");
  lines.push("  };");
  lines.push("};");
  lines.push("");
  lines.push('type Public = Database["public"];');
  lines.push('export type Tables<T extends keyof Public["Tables"]> = Public["Tables"][T]["Row"];');
  lines.push('export type TablesInsert<T extends keyof Public["Tables"]> = Public["Tables"][T]["Insert"];');
  lines.push('export type TablesUpdate<T extends keyof Public["Tables"]> = Public["Tables"][T]["Update"];');
  lines.push('export type Enums<T extends keyof Public["Enums"]> = Public["Enums"][T];');
  lines.push("");
  lines.push("export const Constants = {");
  lines.push("  public: {");
  lines.push("    Enums: {");
  for (const e of enums) {
    lines.push(`      ${e.name}: [${e.labels.map((l) => JSON.stringify(l)).join(", ")}],`);
  }
  lines.push("    },");
  lines.push("  },");
  lines.push("} as const;");
  lines.push("");

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, lines.join("\n"), "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), out)} (${tables.size} tables, ${enums.length} enums).`);
} finally {
  await client.end();
}
