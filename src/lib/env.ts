// Public (browser-safe) configuration. NEXT_PUBLIC_ variables must be read
// with their literal names so Next.js can inline them at build time.
// Server-only secrets are read where they are used (see supabase/admin.ts).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase renamed the "anon" key to "publishable" key. Accept either.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseEnv() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env."
    );
  }
  return { url: supabaseUrl, key: supabaseKey };
}
