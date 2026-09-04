import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh on every request (4 Sep 2026).
 *
 * NEXT 16 CALLS THIS "PROXY", NOT "MIDDLEWARE". The middleware file
 * convention is deprecated and renamed - see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 * Every Supabase tutorial written before Next 16 says `middleware.ts`,
 * and AGENTS.md is right that this is not the Next.js in anyone's
 * training data. The file must sit beside `app/`, so: src/proxy.ts.
 *
 * WHAT IT DOES: refreshes the auth token so a signed-in visitor stays
 * signed in. Server Components cannot write cookies, so without this the
 * session would expire and never renew.
 *
 * ONE DELIBERATE DEVIATION FROM SUPABASE'S OWN TEMPLATE. Theirs
 * redirects any request without a user to /login. That would be
 * catastrophic here: DramStory is a public site that works entirely
 * without an account, and gating it behind a login screen would break
 * the two-minute booking objective the whole product is built around.
 * An account adds trip sync; it is never a condition of entry. So the
 * refresh is kept and the redirect is dropped.
 *
 * The getUser() call stays exactly where it is. Supabase's guidance is
 * that running code between createServerClient and getUser causes
 * random sign-outs that are very hard to debug.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not put code between createServerClient and getUser().
  await supabase.auth.getUser();

  // Returned as-is, cookies untouched, per Supabase's warning about the
  // browser and server going out of sync.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and images. The API routes are
     * included deliberately - /api/attachment and /api/places-photo do
     * not need a session today, but a route that later does would
     * otherwise silently have no refreshed token.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
