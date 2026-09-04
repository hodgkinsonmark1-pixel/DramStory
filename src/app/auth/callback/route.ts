import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the magic link lands (4 Sep 2026).
 *
 * Supabase sends a one-time `code`; this exchanges it for a session,
 * which the server client writes into cookies. From here the visitor is
 * signed in and goes back to whatever they were doing.
 *
 * `next` carries the page they were on when they asked to sign in, so
 * someone half-way through building a trip returns to it rather than to
 * the homepage. It is validated as a same-site path before use - an
 * unchecked redirect parameter is an open redirect, and a sign-in
 * callback is exactly where phishing looks for one.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";

  // Only a relative, single-slash path. Rejects "https://evil.com" and
  // protocol-relative "//evil.com" alike.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Most often an expired or already-used link. The login page says so
    // in plain words rather than showing a code.
    return NextResponse.redirect(`${origin}/login?error=link-expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
