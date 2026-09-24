import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Keep the Supabase project awake (17 Sep 2026, rewritten 24 Sep).
 *
 * WHY THIS EXISTS. Supabase's free tier pauses a project after seven
 * days without sufficient activity. Paused means the database stops
 * answering: sign-in fails, /account breaks, and saved trips will not
 * load. Mark hit exactly that on 17 Sep and had to reactivate by hand.
 *
 * WHY IT WAS REWRITTEN, which is the part worth reading. The first
 * version asked for a row from `trips` using the anon key, knowing the
 * anon role has no grant on that table, and treated the resulting
 * "permission denied" as proof of life. The argument was that a paused
 * project cannot decline anything, so an error means Postgres answered.
 *
 * That argument is true and irrelevant. It establishes the database is
 * REACHABLE; it says nothing about whether the inactivity scan counts a
 * rejected query as ACTIVITY. It does not. This cron ran successfully
 * every day from 21 September and Supabase scheduled the project for
 * pausing anyway, which is how we found out. A reasoned guess was
 * written down as a fact, and the comment explaining it was the most
 * confident thing in the file.
 *
 * WHAT IT DOES NOW. Writes a timestamp to `public.heartbeat` - one row,
 * created by migration 0003, existing for no other purpose. A real
 * statement that really changes a real byte, rather than an argument
 * about what a refusal implies.
 *
 * WHY THE SERVICE ROLE. That table has RLS on and no policies, so
 * nothing reaching it through PostgREST as anon or authenticated can see
 * or touch it. The service role bypasses RLS by design. The alternative -
 * granting anon access so the publishable key could do the write - would
 * mean a public endpoint letting any holder of that key update our
 * database, to save using a key this route already has available.
 *
 * IT IS STILL A WORKAROUND WITH AN EXPIRY DATE. The real fix is Supabase
 * Pro, and the reason is backups rather than pausing - the free tier has
 * none, so the moment a real person saves a real trip the database is
 * the only copy of it. Pro projects do not pause either, which makes
 * this route, its table and its vercel.json entry all deletable that
 * day. See docs/to-do.md.
 */
export async function GET(request: NextRequest) {
  /* Vercel sends this header on scheduled invocations, and only when
     CRON_SECRET is set. Without the check the route is a public URL
     anyone can hammer, and while a keep-alive is harmless to call, an
     unauthenticated endpoint holding the service role key is not a habit
     worth forming.

     If CRON_SECRET is unset, refuse rather than run: a missing secret
     that silently allows everything is the failure this check exists to
     prevent. */
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "keep-alive: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set - the project will pause."
    );
    return Response.json({ ok: false, reason: "not-configured" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, {
    // No session, no storage: this is a machine poking a database, not a
    // visitor. Persisting anything here would leak between runs.
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("heartbeat")
      .update({ last_checked: now, note: "keep-alive cron" })
      .eq("id", 1)
      .select("last_checked");

    /* AN ERROR IS NOW A REAL FAILURE, not the expected outcome. This is
       the whole difference from the previous version: there is no longer
       a reading of "it went wrong" that also means "it worked". If this
       logs, the project is heading for a pause and somebody has to look.

       The likeliest cause by far is migration 0003 not having been run,
       so say so rather than making the next person guess. */
    if (error) {
      console.error(
        `keep-alive: could not write to heartbeat (${error.message}) - has migration 0003 been run?`
      );
      return Response.json({ ok: false, reason: "write-failed" }, { status: 500 });
    }

    /* A successful update that matched nothing is the other silent
       failure: the table exists, the row does not, and every run writes
       nothing while reporting success. */
    if (!data || data.length === 0) {
      console.error("keep-alive: heartbeat table has no row with id = 1 - nothing was written.");
      return Response.json({ ok: false, reason: "no-row" }, { status: 500 });
    }

    console.log(`keep-alive: heartbeat written at ${now}`);
    return Response.json({ ok: true, lastChecked: now });
  } catch (e) {
    /* A thrown error rather than a returned one means the request never
       got an answer at all: DNS, TLS, timeout. That is what a paused or
       unreachable project looks like, and it is worth shouting about,
       because the next thing to break is somebody's sign-in. */
    console.error("keep-alive: could not reach Supabase at all -", e);
    return Response.json({ ok: false, awake: false }, { status: 503 });
  }
}
