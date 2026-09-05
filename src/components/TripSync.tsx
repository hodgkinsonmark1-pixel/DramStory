"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTrip, TRIP_SYNCED_KEY } from "@/lib/trip-context";

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

/* The synced marker (5 Sep 2026). Its only consumer is SignOutButton,
   which clears the browser's trip on sign-out - but only when this says
   the account already has it.
   
   The asymmetry is deliberate and is the whole design: markUnsynced runs
   the instant anything changes, markSynced only after a write comes back
   clean. Failing to set it costs a stale local trip, which is invisible.
   Setting it wrongly destroys work. So every uncertain path leaves it
   unset. */
function markSynced() {
  try {
    window.localStorage.setItem(TRIP_SYNCED_KEY, "1");
  } catch {
    // Storage unavailable. Sign-out will keep the local trip, which is
    // the safe direction to fail in.
  }
}

function markUnsynced() {
  try {
    window.localStorage.removeItem(TRIP_SYNCED_KEY);
  } catch {
    // Nothing to remove.
  }
}

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
  /** Mirrors userId for the auth callback below, which must not read
   *  state it did not close over. */
  const knownUserId = useRef<string | null>(null);
  /* The auth subscription is set up once and must not be torn down and
     rebuilt on every render, so it reaches the current setter through a
     ref rather than closing over one that goes stale. */
  const setActiveTripRef = useRef(trip.setActiveTrip);
  useEffect(() => {
    setActiveTripRef.current = trip.setActiveTrip;
  });

  // Who is signed in, now and whenever that changes.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      knownUserId.current = data.user?.id ?? null;
      setUserId(knownUserId.current);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user?.id ?? null;
      /* Compared against a ref rather than inside a setState updater.
         Updaters must be pure - this branch clears refs and can call
         another component's setter, neither of which belongs in one. */
      if (knownUserId.current !== nextId) {
        // Signing out resets everything so a second visitor on the same
        // browser cannot inherit the first one's row id.
        loaded.current = false;
        tripRowId.current = null;
        if (!nextId) {
          // Signed out. Nothing is syncing any more, so neither the
          // marker nor the pointer may linger and claim otherwise.
          markUnsynced();
          setActiveTripRef.current(null);
        }
        knownUserId.current = nextId;
      }
      setUserId(nextId);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  /* On sign-in, and whenever the visitor chooses a different trip: make
     the trip on screen be the trip the account holds.

     THE SWITCH CASE IS WHY THIS EFFECT WATCHES activeTripId (5 Sep 2026).
     It used to run once per sign-in and read the active id straight from
     localStorage. Opening a different trip from the account page wrote
     that key and navigated - which moved a pointer nobody re-read. The
     previous trip stayed on screen, tripRowId still addressed the
     previous row, and the next edit was saved back over it. The library
     listed trips you could not actually switch between. */
  useEffect(() => {
    if (!userId || !trip.ready) return;

    const activeId = trip.activeTripId;
    /* A deliberate switch: we have already settled on a row, and the
       visitor has now pointed us at a different one. Distinct from the
       first load after sign-in, and it matters below - a switch must
       never push this browser's trip into the row being opened. */
    const isSwitch = loaded.current && activeId !== null && activeId !== tripRowId.current;
    if (loaded.current && !isSwitch) return;

    if (isSwitch) {
      /* Synchronously, before any await. Both refs gate the save effect,
         so until the new row's contents arrive there is no window in
         which the outgoing trip could be written into the incoming row. */
      loaded.current = false;
      tripRowId.current = null;
      markUnsynced();
    }

    let cancelled = false;

    (async () => {
      /* Reading the whole list rather than filtering server-side keeps
         one round trip and lets the fallback work without a second query
         when the remembered id has been deleted elsewhere. */
      const { data: allTrips, error } = await supabase
        .from("trips")
        .select("id, payload, updated_at")
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        // Offline, or RLS refused. Leave the trip exactly as it is and
        // try again on the next sign-in - never destroy local work
        // because a fetch failed.
        return;
      }

      const data = allTrips
        ? activeId
          ? allTrips.filter((t) => t.id === activeId).concat(allTrips).slice(0, 1)
          : allTrips.slice(0, 1)
        : null;

      let settledId: string | null = null;

      if (data && data.length > 0) {
        settledId = data[0].id;
        tripRowId.current = settledId;
        const payload = data[0].payload as Record<string, unknown> | null;
        const hasContent = payload !== null && Object.keys(payload).length > 0;

        if (isSwitch) {
          /* Take the row verbatim, empty included. Opening an empty trip
             should show an empty trip - the alternative is that the trip
             you just left follows you into it. Cast through unknown:
             jsonb is genuinely untyped, and replaceTrip defaults every
             missing field rather than trusting the shape. */
          trip.replaceTrip((payload ?? {}) as unknown as Parameters<typeof trip.replaceTrip>[0]);
          markSynced();
        } else if (hasContent) {
          trip.replaceTrip(payload as unknown as Parameters<typeof trip.replaceTrip>[0]);
          // Local is now a copy of the account's trip, so it is safe to
          // discard on sign-out.
          markSynced();
        } else {
          /* First load, and the row is empty - so the browser's trip is
             the real one and has never reached the account. Push it up
             now rather than waiting for the next edit, or somebody who
             signs in and straight back out would be relying on a save
             that was never scheduled. */
          const { error: seedError } = await supabase
            .from("trips")
            .update({ payload: trip.snapshot })
            .eq("id", settledId);
          if (!cancelled && !seedError) markSynced();
        }
      } else {
        const { data: created, error: insertError } = await supabase
          .from("trips")
          .insert({ user_id: userId, payload: trip.snapshot })
          .select("id")
          .single();
        if (!cancelled && !insertError && created) {
          settledId = created.id;
          tripRowId.current = settledId;
          // The insert carried trip.snapshot with it, so the account
          // already holds exactly what the browser holds.
          markSynced();
        }
      }

      if (cancelled) return;
      /* Order matters. loaded flips first so that the re-render caused by
         setActiveTrip below finds this effect already settled and returns
         at the guard, rather than starting the fetch again. */
      loaded.current = true;
      if (settledId && settledId !== activeId) trip.setActiveTrip(settledId);
    })();

    return () => {
      cancelled = true;
    };
    // trip.snapshot deliberately excluded: including it would re-fetch on
    // every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trip.ready, trip.activeTripId, supabase]);

  // Save changes, debounced. Somebody dragging a stop around should not
  // send a write per frame.
  useEffect(() => {
    if (!userId || !loaded.current || !tripRowId.current) return;

    /* Mark the trip unsynced the MOMENT it changes, before the debounce
       even starts. Anything else leaves a window where the marker says
       "saved" and the newest edit is not, which is precisely when
       sign-out would throw it away. */
    markUnsynced();

    if (saveTimer.current) clearTimeout(saveTimer.current);
    const rowId = tripRowId.current;
    saveTimer.current = setTimeout(() => {
      supabase
        .from("trips")
        .update({ payload: trip.snapshot })
        .eq("id", rowId)
        .then(({ error }) => {
          // Failures are deliberately silent in the UI - localStorage
          // still holds the trip, so nothing is lost, and a toast for a
          // background save is noise nobody can act on. But the marker
          // must NOT be set, or sign-out would discard the local copy of
          // something that never reached the account.
          if (error) return;
          markSynced();
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [trip.snapshot, userId, supabase]);

  return null;
}
