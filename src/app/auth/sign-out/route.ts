import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out (4 Sep 2026).
 *
 * POST only, deliberately. A GET sign-out can be triggered by anything
 * that loads a URL - a prefetch, an image tag on another site - which
 * makes signing people out a trivial cross-site nuisance.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    // 303 so the browser follows with GET rather than repeating the POST.
    status: 303,
  });
}
