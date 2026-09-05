"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Whether this trip is being kept, and what to do about it (5 Sep 2026).
 *
 * WHY THIS REPLACES TWO DISABLED BUTTONS. /trip has always ended with an
 * inert "Save as a tour" and the line "Saving and emailing are coming
 * soon". Saving has arrived - a signed-in visitor's trip syncs to their
 * account continuously - so that sentence became untrue the moment
 * accounts shipped, and the page was telling people the opposite of
 * what it does.
 *
 * THERE IS NO SAVE BUTTON, AND THAT IS THE DESIGN. The trip saves
 * itself. A button implies work the visitor must remember to do, and
 * the failure mode of forgetting it is losing the thing the account
 * exists to protect. What was missing was not a button but a statement:
 * this is kept, or this is not kept and here is how.
 *
 * This is also the save prompt's natural home (plan section 4.2). A
 * visitor reading their finished trip has just done the work that makes
 * an account worth having, which is a better moment to ask than any
 * threshold counted mid-build.
 *
 * Signed out, nothing is blocked - the page still works, the trip still
 * lives in this browser, and the invitation is an offer.
 */
export default function TripSaveState() {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      setChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Render nothing until we know. A flash of "sign in to keep this" at
  // someone who is already signed in is worse than a beat of nothing.
  if (!checked) return null;

  if (email) {
    return (
      <div className="trip-save-state trip-save-state-on">
        <p className="trip-save-line">
          <strong>Saved to your account.</strong> This trip is on every device
          you sign in to as {email}.
        </p>
        <p className="trip-actions-note">
          Emailing your trip to yourself is still to come.
        </p>
      </div>
    );
  }

  return (
    <div className="trip-save-state">
      <p className="trip-save-line">
        <strong>This trip lives in this browser.</strong> Clear your history and
        it&rsquo;s gone, and it isn&rsquo;t on your phone when you&rsquo;re
        standing on Islay.
      </p>
      {/* Carries the current page so signing in returns here rather than
          dumping someone on the homepage having lost their place. */}
      <Link
        href={`/login?next=${encodeURIComponent(pathname || "/trip")}`}
        className="trip-btn trip-btn-primary trip-save-cta"
      >
        Keep this trip
      </Link>
      <p className="trip-actions-note">
        No password &mdash; we&rsquo;ll email you a link. Your trip stays exactly
        as it is.
      </p>
    </div>
  );
}
