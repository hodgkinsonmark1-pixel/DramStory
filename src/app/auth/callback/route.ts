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

  /* ALWAYS LAND ON /account (Mark, 18 Sep 2026), rather than back on the
     page they signed in from.

     The earlier behaviour returned them to that page so they did not lose
     their place, with a bar to confirm the sign-in. Mark's call was that
     seeing the trips list is better proof than being told: you arrive
     looking at the thing you were worried about.

     `next` is not discarded, it is carried as `from`, so the notice can
     offer a way back and losing your place stops being the price. It is
     already validated above as a relative same-site path, and AuthNotice
     checks it again before rendering a link - a redirect parameter that
     becomes an anchor href is an open redirect by another route. */
  const params = new URLSearchParams({ signedin: "1" });
  if (next !== "/" && next !== "/account") params.set("from", next);

  return NextResponse.redirect(`${origin}/account?${params.toString()}`);
}
