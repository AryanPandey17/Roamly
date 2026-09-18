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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

export function bearerFrom(request: Request) {
  const header = request.headers.get("authorization") || ""
  return header.startsWith("Bearer ") ? header.slice(7) : null
}
