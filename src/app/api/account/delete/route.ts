import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Delete the signed-in visitor's account and everything in it
 * (17 Sep 2026). UK GDPR Article 17, the right to erasure.
 *
 * WHY THIS NEEDS A SERVER ROUTE AND THE OTHER ACCOUNT ACTIONS DO NOT.
 * Everything else on /account - listing, renaming, deleting a single
 * trip - runs from the browser with the publishable key, because row
 * level security already scopes it to the one signed-in user. Deleting
 * the ACCOUNT is different: the email address lives in `auth.users`,
 * which no client key can touch. A visitor cannot erase their own
 * account from the browser, by design.
 *
 * So this route holds the service role key, which bypasses RLS
 * entirely. Three consequences, all deliberate:
 *
 *   1. The key is read from a NON-public env var. If it ever gains a
 *      NEXT_PUBLIC_ prefix it ships to every browser and the database is
 *      wide open. It is never imported by anything a client component
 *      can reach.
 *   2. The user id comes from the SESSION COOKIE, never from the request
 *      body. A body-supplied id on a route holding the service role key
 *      would let anyone delete anyone.
 *   3. It is a POST. A GET could be triggered by a prefetch or an image
 *      tag on another site - the same reasoning as the sign-out route.
 *
 * THE TRIPS GO WITH IT AUTOMATICALLY. `trips.user_id` is declared
 * `references auth.users (id) on delete cascade` in migration 0001, so
 * removing the auth user removes their rows in the same transaction.
 * Deleting the trips here first would be redundant, and would leave a
 * window where the trips were gone and the account was not.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  /* Fail loudly rather than pretending. If the key is missing the
     account is not deleted, and a visitor who has just asked to be
     erased must not be shown a success message. This is the one error
     path on the site where silence would be a legal problem rather than
     a cosmetic one. */
  if (!serviceKey || !url) {
    console.error(
      "Account deletion attempted without SUPABASE_SERVICE_ROLE_KEY set - nothing was deleted."
    );
    return NextResponse.json({ error: "not-configured" }, { status: 500 });
  }

  const admin = createAdminClient(url, serviceKey, {
    // No session handling on an admin client: it acts as the service
    // role, not as a user, and persisting anything would be a leak.
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Account deletion failed:", error.message);
    return NextResponse.json({ error: "delete-failed" }, { status: 500 });
  }

  /* Clear the session cookies. The user no longer exists, so the cookies
     are worthless - but leaving them means the next page load tries to
     refresh a session for a deleted user and the visitor sees an error
     rather than a signed-out site. */
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
