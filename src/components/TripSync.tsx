"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTrip } from "@/lib/trip-context";

/**
 * Keeps a signed-in visitor's trip in their account (4 Sep 2026).
 *
 * Renders nothing. Mounted once inside TripProvider in the root layout.
 *
 * DESIGN RULE THAT DRIVES EVERYTHING BELOW: signed out, nothing changes.
 * localStorage remains the store, the planner behaves exactly as it does
 * today, and this component does nothing at all. An account adds sync;
 * it is never a condition of using the site.
 *
 * THE MIGRATION IS THE PART MOST LIKELY TO GO WRONG (plan §4.3).
 * Somebody plans for ten minutes, then signs in. That work must survive,
 * or the account has cost them the thing it was meant to protect. So on
 * first sign-in:
 *
 *   - account has no trip  -> adopt whatever is in this browser, silently
 *   - account has a trip   -> it wins, and is loaded into state
 *
 * No dialogue either way. Asking "import your trip?" at the moment of
 * signing in makes someone decide about something they already believe
 * is theirs.
 *
 * localStorage is never cleared. It stays as the signed-out fallback, so
 * signing out does not look like losing everything.
 */

const SAVE_DEBOUNCE_MS = 1500;

export default function TripSync() {
  const trip = useTrip();
  /* useState's lazy initialiser rather than useRef: the client must be
     created once and stay stable across renders, and reading a ref
     during render is not allowed (react-hooks/refs). */
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState<string | null>(null);
  /** The row we own. Null until loaded or created. */
  const tripRowId = useRef<string | null>(null);
  /** Blocks the save effect until the account's own trip has been loaded
   *  or adopted. Without it, the first render after sign-in would push
   *  this browser's trip over the account's. */
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Who is signed in, now and whenever that changes.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user?.id ?? null;
      setUserId((prev) => {
        // Signing out resets everything so a second visitor on the same
        // browser cannot inherit the first one's row id.
        if (prev !== nextId) {
          loaded.current = false;
          tripRowId.current = null;
        }
        return nextId;
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // On sign-in: load the account's trip, or adopt this browser's.
  useEffect(() => {
    if (!userId || !trip.ready || loaded.current) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, payload")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (error) {
        // Offline, or RLS refused. Leave the trip exactly as it is and
        // try again on the next sign-in - never destroy local work
        // because a fetch failed.
        return;
      }

      if (data && data.length > 0) {
        tripRowId.current = data[0].id;
        const payload = data[0].payload as Record<string, unknown> | null;
        // An empty payload is not a trip. Adopting it would wipe the
        // browser's work on the strength of an empty row.
        if (payload && Object.keys(payload).length > 0) {
          // Cast through unknown: what comes back from jsonb is
          // genuinely untyped, and replaceTrip already defaults every
          // missing field rather than trusting the shape.
          trip.replaceTrip(payload as unknown as Parameters<typeof trip.replaceTrip>[0]);
        }
      } else {
        const { data: created, error: insertError } = await supabase
          .from("trips")
          .insert({ user_id: userId, payload: trip.snapshot })
          .select("id")
          .single();
        if (!cancelled && !insertError && created) tripRowId.current = created.id;
      }

      if (!cancelled) loaded.current = true;
    })();

    return () => {
      cancelled = true;
    };
    // trip.snapshot deliberately excluded: this runs once per sign-in,
    // and including it would re-fetch on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trip.ready, supabase]);

  // Save changes, debounced. Somebody dragging a stop around should not
  // send a write per frame.
  useEffect(() => {
    if (!userId || !loaded.current || !tripRowId.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from("trips")
        .update({ payload: trip.snapshot })
        .eq("id", tripRowId.current)
        .then(() => {
          // Failures are deliberately silent. localStorage still holds
          // the trip, so nothing is lost, and an error toast for a
          // background save would be noise the visitor cannot act on.
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [trip.snapshot, userId, supabase]);

  return null;
}
