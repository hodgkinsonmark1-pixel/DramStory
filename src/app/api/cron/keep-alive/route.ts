import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Keep the Supabase project awake (17 Sep 2026).
 *
 * WHY THIS EXISTS. Supabase's free tier pauses a project after seven days
 * with no activity. Paused means the database stops answering: sign-in
 * fails, /account breaks, and saved trips will not load. Mark hit exactly
 * this on 17 Sep and had to reactivate the project by hand. A daily poke
 * means it never reaches seven idle days.
 *
 * IT IS A WORKAROUND WITH AN EXPIRY DATE. The real fix is Supabase Pro,
 * and the reason is backups rather than pausing - the free tier has none,
 * so the moment a real person saves a real trip the database is the only
 * copy of it. Pro projects do not pause, which makes this route pointless
 * the day that happens. Delete it then. See docs/to-do.md.
 *
 * WHAT COUNTS AS ACTIVITY, and why this query looks wrong. It asks for a
 * row from `trips` using the anon key, and the anon role has no grant on
 * that table - migration 0002 grants to `authenticated` only, on purpose.
 * So this request comes back as a permission error, every time, by
 * design.
 *
 * That is still the thing we need. A permission error is Postgres
 * ANSWERING: the request travelled through PostgREST, reached the
 * database, and the database declined it. A paused project cannot
 * decline anything - it does not respond at all. So the error path is the
 * success path here, and only a network-level failure means the project
 * was actually asleep.
 *
 * The alternative was a dedicated heartbeat table that anon may read,
 * which would be tidier to reason about but means another migration for
 * Mark to run by hand for no functional gain.
 */
export async function GET(request: NextRequest) {
  /* Vercel sends this header on scheduled invocations. Without the check
     the route is a public URL anyone can hammer, and while a keep-alive
     is harmless to call, an unauthenticated endpoint that talks to the
     database is not a habit worth forming.

     If CRON_SECRET is not set, refuse rather than run: an unset secret
     that silently allows everything is the failure mode this check
     exists to prevent. */
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error("keep-alive: Supabase environment variables are not set.");
    return Response.json({ ok: false, reason: "not-configured" }, { status: 500 });
  }

  const supabase = createClient(url, key, {
    // No session, no storage: this is a machine poking a database, not a
    // visitor. Persisting anything here would be a leak between runs.
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { error } = await supabase.from("trips").select("id").limit(1);

    /* Reached the database either way - see the note above about why an
       error is the expected outcome. Logged at info rather than error so
       a week of normal runs does not read like a week of faults. */
    console.log(
      error
        ? `keep-alive: database responded (${error.message}) - project is awake`
        : "keep-alive: database responded with rows - project is awake"
    );

    return Response.json({ ok: true, awake: true });
  } catch (e) {
    /* A thrown error rather than a returned one means the request never
       got an answer: DNS, TLS, timeout. THIS is what a paused or
       unreachable project looks like, and it is worth shouting about,
       because the next thing to break will be somebody's sign-in. */
    console.error("keep-alive: could not reach Supabase at all -", e);
    return Response.json({ ok: false, awake: false }, { status: 503 });
  }
}
