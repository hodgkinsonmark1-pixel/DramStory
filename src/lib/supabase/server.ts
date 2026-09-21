import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server components, server actions and route
 * handlers (4 Sep 2026).
 *
 * `cookies()` is ASYNC in Next 16, so this function is too - see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md.
 *
 * getAll/setAll ONLY. Supabase's own guidance is emphatic that the
 * older get/set/remove cookie methods break session handling and cause
 * auth loops; they are not an alternative style.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, which cannot set cookies.
            // Safe to ignore: proxy.ts refreshes the session on every
            // request, so the cookie is kept fresh there instead.
          }
        },
      },
    }
  );
}
