import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/** Pages that require a signed-in user. */
const PROTECTED_PREFIXES = ["/trips", "/onboarding", "/settings", "/saved", "/debug"];
/** Pages a signed-in user has no reason to see. */
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

/**
 * Refreshes the Supabase session cookie on every request and performs the
 * optimistic redirect for protected pages. Pages and route handlers still
 * verify the user themselves; this is the first gate, not the only one.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not put code between createServerClient and getClaims: this call is
  // what refreshes an expired token and verifies the signature.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string, search = "") => {
    const target = request.nextUrl.clone();
    target.pathname = pathname;
    target.search = search;
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies on the redirect response.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && startsWithAny(path, PROTECTED_PREFIXES)) {
    return redirectTo("/login", `?next=${encodeURIComponent(path + request.nextUrl.search)}`);
  }
  if (signedIn && startsWithAny(path, AUTH_PAGES)) {
    return redirectTo("/trips");
  }

  return response;
}
