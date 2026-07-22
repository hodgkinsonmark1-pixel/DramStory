"use client";

import { useEffect, useState } from "react";
import { fetchRouteSegments, type LatLng, type RouteSegment } from "./route-geometry";

/** Fetches real road routes for each consecutive pair in `stops`, re-running
 *  whenever the stop list changes (add/remove/reorder). A null entry in
 *  `segments` means that pair's routing failed - degrade to a straight
 *  line / estimated time for just that segment, not the whole route. */
export function useRouteSegments(stops: LatLng[]) {
  // Stored alongside the key it was fetched FOR, not just the segments
  // themselves - see the derivation below for why.
  const [state, setState] = useState<{ key: string; segments: (RouteSegment | null)[] }>({
    key: "",
    segments: [],
  });
  const [loading, setLoading] = useState(false);

  // Stable key so the effect only re-runs when the actual coordinates
  // change, not on every render (stops.map(...) creates a new array
  // reference each time even with identical content).
  const key = stops.map((s) => `${s.lat},${s.lng}`).join(";");

  useEffect(() => {
    if (stops.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key, segments: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchRouteSegments(stops).then((result) => {
      if (!cancelled) {
        setState({ key, segments: result });
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Only ever return segments that actually correspond to the CURRENT
  // key, derived synchronously during render rather than waiting for the
  // effect above to catch up (22 July 2026 fix, replacing an earlier
  // attempt that cleared segments inside the effect instead - that left
  // a one-render gap, right after the stop list changes, where this hook
  // would still return the PREVIOUS day's segments zipped against the
  // NEW day's coordinates by MapCanvas's routeStops builder. That stale-
  // for-one-render value was enough to throw off MapCanvas's day-switch
  // fitBounds, which fires - and marks itself done - on the very next
  // render after a day change: it would fit to a transient, wrong shape
  // and never get another chance to correct itself once real segments
  // arrived. Deriving this way guarantees what's returned is always
  // either the real answer for `stops` or a clean "not yet known" -
  // never a stale one, no matter how the effect above is timed.
  const segments = state.key === key ? state.segments : [];
  return { segments, loading };
}
