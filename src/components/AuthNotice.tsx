"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Says what just happened, on whatever page you land on (17 Sep 2026).
 *
 * THE PROBLEM. Signing in returns you to the page you were reading, which
 * is right - you were half way down a Journey and should not lose your
 * place. But the page comes back looking exactly as it did, because a
 * fresh load has no idea you have just signed in. So the one thing you
 * did it for is the one thing nothing tells you. Mark, 17 Sep: "when I
 * followed the magic link it opened on the classic journey page, not the
 * account page".
 *
 * Landing on /account instead would confirm the save and lose the page.
 * This keeps both: you come back where you were, and a slim bar says the
 * trip is safe.
 *
 * WHY THE MARKER IS STRIPPED IMMEDIATELY. The notice is triggered by a
 * query parameter, and a parameter that stays in the URL means the bar
 * returns on every refresh, gets copied into shared links, and turns up
 * in Plausible as a separate page. Removed with `replace` so it does not
 * add a history entry either - pressing Back should go back to the page
 * before, not to the same page with a banner on it.
 */
function Notice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  /* Read once, at the first render, rather than in an effect.
   *
   *  Two reasons. The effect below REMOVES the marker from the URL, so
   *  anything deriving from searchParams live would show the notice and
   *  then instantly hide it again. And setting state straight from an
   *  effect body cascades a render, which react-hooks/set-state-in-effect
   *  exists to stop - a lazy initialiser runs during render instead, so
   *  there is no second pass. */
  const [kind] = useState<"signed-in" | "deleted" | null>(() =>
    searchParams.get("deleted") === "1"
      ? "deleted"
      : searchParams.get("signedin") === "1"
        ? "signed-in"
        : null
  );
  const [dismissed, setDismissed] = useState(false);
  /* Where they were when they asked to sign in, captured at first render
     for the same reason as `kind`.

     VALIDATED AGAIN HERE, even though the callback validated it. That
     check protected a redirect; this one guards an anchor href, and an
     href built from a URL parameter is an open redirect by another route
     - "/account?from=https://evil.com" would otherwise render a link to
     evil.com wearing DramStory's clothes. Relative single-slash paths
     only. */
  const [from] = useState<string | null>(() => {
    const raw = searchParams.get("from");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  });

  useEffect(() => {
    if (!kind) return;

    /* Strip only our own markers - anything else on the URL belongs to
       the page and is not ours to throw away. Idempotent: once they are
       gone this returns before touching the router, so the effect
       re-running on the new searchParams does nothing. */
    const rest = new URLSearchParams(searchParams.toString());
    if (!rest.has("signedin") && !rest.has("deleted")) return;
    rest.delete("signedin");
    rest.delete("deleted");
    rest.delete("from");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [kind, searchParams, router, pathname]);

  if (!kind || dismissed) return null;

  return (
    <div className="auth-notice" role="status">
      <p className="auth-notice-text">
        {kind === "deleted" ? (
          <>Your account and everything in it has been deleted.</>
        ) : (
          <>
            <strong>Signed in.</strong> Your trip is saved to your account, on
            every device you sign in to.
          </>
        )}
      </p>
      {/* A way back to whatever they were reading, so landing on /account
          does not cost them their place. Deliberately not named: deriving
          "the Islay Grand Tour" from a slug means guessing, and a wrong
          name is worse than an honest generic one.

          No "Your trips" link when they are already on /account - that is
          the page they are standing on. */}
      {kind === "signed-in" && from && (
        <Link href={from} className="auth-notice-link">
          &larr; Back to where you were
        </Link>
      )}
      {kind === "signed-in" && !from && pathname !== "/account" && (
        <Link href="/account" className="auth-notice-link">
          Your trips &rarr;
        </Link>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="auth-notice-dismiss"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

/**
 * NEXT 16 REQUIRES THE SUSPENSE BOUNDARY, and not as a nicety: a client
 * component calling useSearchParams on a statically rendered page fails
 * the production build outright with "Missing Suspense boundary with
 * useSearchParams". Most of this site's pages are static, and this sits
 * in the root layout, so every one of them is affected.
 *
 * See node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
 * use-search-params.md - it also notes that development renders on demand
 * and does not suspend, so this would have looked fine locally and broken
 * the deploy.
 *
 * The fallback is null because there is nothing to show while it resolves.
 */
export default function AuthNotice() {
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}
