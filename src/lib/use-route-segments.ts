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
