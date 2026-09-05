"use client";

import { STORAGE_KEY, ACTIVE_TRIP_KEY, TRIP_SYNCED_KEY } from "@/lib/trip-context";

/**
 * Sign out, and clear the browser's copy of the trip - but only when the
 * account already has it (5 September 2026).
 *
 * THE PROBLEM THIS SOLVES. localStorage belongs to the browser, not the
 * session. Signing out left `dramstory-trip-v2` sitting there, so the
 * next visitor to that browser - or Mark, testing as a fresh visitor -
 * saw somebody else's trip while signed out. Confusing at best.
 *
 * THE REASON IT IS NOT JUST `localStorage.clear()`. Somebody can build a
 * trip while signed out, sign in on a flaky connection, and sign out
 * again before a single write lands. Clearing unconditionally would
 * delete the only copy of their afternoon's work. So TripSync maintains
 * TRIP_SYNCED_KEY, which is present only while the local trip is known
 * to match the account's, and this button clears nothing without it.
 * Unsynced trips survive sign-out untouched.
 *
 * WHY THIS IS A CLIENT COMPONENT WRAPPING A REAL FORM POST rather than
 * an onClick that calls signOut() in JavaScript. Sign-out has to happen
 * on the server, because the session lives in httpOnly cookies the
 * browser cannot touch. The form POST is the mechanism; this adds a
 * step before it. Keeping it a genuine form means it still signs you out
 * with JavaScript disabled or still loading - the trip simply is not
 * cleared, which is the harmless failure.
 *
 * ORDER MATTERS, AND THIS ORDER IS SAFE. Storage is cleared first and
 * the POST follows. If the POST then fails, the visitor is still signed
 * in and TripSync pulls the trip straight back down from the account -
 * which it can, because we only cleared what the account already had.
 */
export default function SignOutButton() {
  function handleSubmit() {
    // No preventDefault: the browser carries on and submits the form.
    try {
      if (window.localStorage.getItem(TRIP_SYNCED_KEY) !== "1") return;
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(ACTIVE_TRIP_KEY);
      window.localStorage.removeItem(TRIP_SYNCED_KEY);
    } catch {
      // Storage unavailable or blocked. Sign out anyway - failing to
      // clear is a tidiness problem, failing to sign out is a security
      // one.
    }
  }

  return (
    <form
      action="/auth/sign-out"
      method="post"
      className="account-signout"
      onSubmit={handleSubmit}
    >
      <button type="submit" className="account-signout-btn">
        Sign out
      </button>
    </form>
  );
}
