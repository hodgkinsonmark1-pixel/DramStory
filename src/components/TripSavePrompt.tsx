"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTrip } from "@/lib/trip-context";

/**
 * One prompt, everywhere (5 Sep 2026).
 *
 * WHY THIS EXISTS AND FOUR SEPARATE PATCHES DO NOT. Mark found three
 * routes in a row where a visitor commits real work and is told nothing
 * about accounts: /trip's dead buttons, a journey's "put this in my
 * planner", and adding a day from the hub. There are TWELVE components
 * that add to a trip - the day hub, the day screen, the workspace, the
 * mobile sheet, distillery pages, area pages, explore pages, the hero's
 * own columns, the accommodation control. Bolting an offer onto each is
 * a job that is never finished and drifts the moment a thirteenth is
 * added.
 *
 * So the prompt watches the TRIP, not the buttons. Anything that adds a
 * stop moves the trip, and this notices. A new surface built next month
 * is covered without knowing this exists.
 *
 * NEVER A WALL. This is the rule the whole product is built on: the
 * planner works signed out, and an account is an offer. So it is a slim
 * bar that can be dismissed, not a modal, not an interstitial, and it
 * blocks nothing.
 *
 * THE THRESHOLD is deliberate work, not curiosity (plan section 4.2).
 * Two stops, or two days. One tap is someone looking; two is someone
 * planning, and only the second has anything to lose.
 */

const DISMISS_KEY = "dramstory-save-prompt-dismissed";

/** Pages that already say this better than a bar could. /trip has the
 *  full panel; /login and /account are about accounts already; the
 *  workspace has its own bottom sheet on mobile and a bar would sit on
 *  top of it. */
const SILENT_PATHS = ["/trip", "/login", "/account", "/journey"];

export default function TripSavePrompt() {
  const trip = useTrip();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(true);

  /* One effect, and the storage read happens inside the async callback
     rather than the effect body. Reading it synchronously in the body is
     a setState during an effect, which cascades a render and trips
     react-hooks/set-state-in-effect - the same rule TripSync hit. It
     cannot go in a lazy useState initialiser either: sessionStorage does
     not exist during server rendering. */
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      let wasDismissed = false;
      try {
        wasDismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        // Storage blocked - show the prompt rather than hide it.
      }
      setDismissed(wasDismissed);
      setSignedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!trip.ready || signedIn !== false || dismissed) return null;
  if (SILENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const days = trip.snapshot.days ?? [];
  const stopCount = days.reduce((n, d) => n + (d.stops?.length ?? 0), 0);
  if (stopCount < 2 && days.length < 2) return null;

  function dismiss() {
    setDismissed(true);
    try {
      // sessionStorage, not local: dismissing means "not now", not
      // "never". It comes back on a future visit, when the trip is
      // bigger and the offer is worth more.
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Dismissed for this render either way.
    }
  }

  return (
    <div className="trip-save-prompt" role="complementary" aria-label="Keep your trip">
      <p className="trip-save-prompt-text">
        <strong>
          {stopCount > 0
            ? `${stopCount} ${stopCount === 1 ? "stop" : "stops"} planned.`
            : `${days.length} days planned.`}
        </strong>{" "}
        This trip is only in this browser.
      </p>
      <div className="trip-save-prompt-actions">
        <Link
          href={`/login?next=${encodeURIComponent(pathname || "/")}`}
          className="trip-save-prompt-cta"
        >
          Keep it
        </Link>
        <button type="button" onClick={dismiss} className="trip-save-prompt-dismiss" aria-label="Dismiss">
          Not now
        </button>
      </div>
    </div>
  );
}
