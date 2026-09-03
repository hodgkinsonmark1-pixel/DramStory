import { AREAS } from "@/lib/areas";

/**
 * "Which of our areas is this visitor standing in?" - the one place that
 * question is answered (03 Sep 2026).
 *
 * Extracted because the same maths now runs in two places: the desktop
 * hero's "Use my location instead" button under the today note, and the
 * "Where on Islay are you?" sheet, which is the ONLY way a phone can set
 * todayNear at all. Two copies of a distance test that must agree about
 * which village you are in is exactly the kind of thing that drifts.
 *
 * NOT the same question as TodayLocationStep.tsx's, which resolves to the
 * nearest DISTILLERY for the /journey today flow. todayNear is an AREAS
 * slug (hero-handoff.md section 7), so this resolves to a village and the
 * two deliberately stay separate.
 */

/** Equirectangular approximation - squared degrees, no trig. Adequate at
 *  Islay's scale and latitude, where the three areas are tens of km apart
 *  and the runner-up is never close enough for the projection error to
 *  change the answer. */
export function nearestAreaSlug(lat: number, lng: number): string {
  let nearest = AREAS[0];
  let nearestDistSq = Infinity;
  for (const a of AREAS) {
    const distSq = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = a;
    }
  }
  return nearest.slug;
}

export type LocateFailure = "unsupported" | "failed";

/**
 * Ask the browser where we are and hand back the REAL point.
 *
 * Returns coordinates rather than the nearest area's slug (changed
 * 03 Sep 2026): buildTodaySchedule only ever wanted { lat, lng }, and
 * bucketing a genuine fix to one of three villages on a 25-mile island
 * threw away most of its accuracy. See TripAnswers.todayPoint.
 *
 * Never the only way to answer - every caller shows the village list
 * too, and every failure path here is silent and non-blocking, the same
 * contract TodayLocationStep.tsx's own version keeps. A visitor who
 * declines the permission prompt should land back on a list, not on an
 * error state.
 */
export function locateNearestArea(
  onFound: (point: { lat: number; lng: number }) => void,
  onFail: (reason: LocateFailure) => void
): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onFail("unsupported");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => onFound({ lat: position.coords.latitude, lng: position.coords.longitude }),
    () => onFail("failed"),
    { timeout: 8000 }
  );
}
