import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser/client components (4 Sep 2026).
 *
 * Both values are PUBLIC by design - the publishable key is meant to
 * ship in client code. What actually protects the data is Row Level
 * Security on every table: the key gets you to the door, RLS decides
 * which rows you may see. If RLS is ever off on a table, this key reads
 * all of it. That is the whole security model in one sentence, and the
 * reason no table here is created without a policy.
 *
 * The service role key is NOT used anywhere in this codebase and must
 * never be imported into anything the browser can reach - it bypasses
 * RLS entirely.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
