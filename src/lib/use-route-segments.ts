"use client";

import { useEffect, useState } from "react";
import { fetchRouteSegments, type LatLng, type RouteSegment } from "./route-geometry";

/** Fetches real road routes for each consecutive pair in `stops`, re-running
 *  whenever the stop list changes (add/remove/reorder). A null entry in
 *  `segments` means that pair's routing failed - degrade to a straight
 *  line / estimated time for just that segment, not the whole route. */
export function useRouteSegments(stops: LatLng[]) {
  const [segments, setSegments] = useState<(RouteSegment | null)[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable key so the effect only re-runs when the actual coordinates
  // change, not on every render (stops.map(...) creates a new array
  // reference each time even with identical content).
  const key = stops.map((s) => `${s.lat},${s.lng}`).join(";");

  useEffect(() => {
    if (stops.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSegments([]);
      return;
    }
    let cancelled = false;
    // Clear out whatever was fetched for the PREVIOUS stop list immediately,
    // rather than leaving it in place until this fetch resolves (22 July
    // 2026 fix). Without this, MapCanvas's routeStops builder (which pairs
    // each new coordinate with `segments[i]`'s real road geometry) kept
    // reusing the old day's real route shape - visibly wrong once the new
    // day's endpoints don't match it, and stuck that way for as long as
    // OSRM's request takes (or forever, if it fails - it's a public demo
    // server with no uptime guarantee, see route-geometry.ts). Resetting
    // here makes MapCanvas fall back to a straight line between the
    // CURRENT day's actual stops right away, then upgrade to the real
    // route once this fetch comes back.
    setSegments([]);
    setLoading(true);
    fetchRouteSegments(stops).then((result) => {
      if (!cancelled) {
        setSegments(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { segments, loading };
}
