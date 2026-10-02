import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

/**
 * Landing point for Google sign-in, email confirmation and password-reset
 * links. Exchanges the one-time code for a session cookie, then sends the
 * user on to `next`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const message = url.searchParams.get("error_description") ?? "That link is invalid or has expired. Try again.";
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, url.origin));
}
