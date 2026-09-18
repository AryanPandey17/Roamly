import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "@/lib/config"

export function createBrowserSupabase() {
  if (!isSupabaseConfigured()) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createServerSupabase(accessToken?: string | null): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  // User-facing API routes must always use the public key plus the caller's JWT.
  // Using a service-role key here bypasses RLS and can make an auth wiring issue
  // look like it worked while writing data under the wrong security context.
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  return client
}

export function bearerFrom(request: Request) {
  const header = request.headers.get("authorization") || ""
  return header.startsWith("Bearer ") ? header.slice(7) : null
}
