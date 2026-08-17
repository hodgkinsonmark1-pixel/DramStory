import type { ItineraryStop } from "@/lib/types";
import { parseAvgVisitMinutes, parseFeatureDurationMinutes, parseTourDurationMinutes } from "@/lib/drive-time";

// ─────────────────────────────────────────────────────────────────────────
// Small helpers so the rest of the app doesn't need an if/else on
// stop.kind every time it wants an id, name, or coordinates - a stop is
// either a distillery (with an optional tour) or a Natural Feature.
// ─────────────────────────────────────────────────────────────────────────

/** A quick stop at a beach/walk/bike route/local gem doesn't have a
 *  defined "visit" length the way a distillery tour does - this is the
 *  default estimate before any visitor adjustment via the +/- toggle. */
export const DEFAULT_FEATURE_VISIT_MINUTES = 25;

const VISIT_STEP_MINUTES = 15;
const MIN_VISIT_MINUTES = 15;

/** A stable identifier for a stop, regardless of kind - used for
 *  add/remove/dedupe logic. */
export function stopId(stop: ItineraryStop): string {
  return stop.kind === "distillery" ? stop.distillery.slug : stop.feature.id;
}

export function stopCoords(stop: ItineraryStop): { lat: number; lng: number } {
  return stop.kind === "distillery"
    ? { lat: stop.distillery.lat, lng: stop.distillery.lng }
    : { lat: stop.feature.lat, lng: stop.feature.lng };
}

export function stopName(stop: ItineraryStop): string {
  return stop.kind === "distillery" ? stop.distillery.name : stop.feature.name;
}

/** The visit duration to use for this stop in minutes - the visitor's
 *  custom override if they've adjusted it via +/-, otherwise the default
 *  estimate, most specific source first:
 *
 *    distillery + a chosen tour -> that TOUR's own Duration
 *    distillery, no tour (or an unparseable one) -> the distillery's Avg Visit
 *    feature with a duration field (walks/bike routes) -> that duration
 *    anything else -> the flat feature estimate
 *
 *  FIXED 17 Aug 2026: this used to size every distillery stop by the
 *  distillery's Avg Visit even when the Day Stop named a specific tour,
 *  so the chosen tour's real length was ignored and every clock time
 *  after that stop inherited the error. Two verified examples: the
 *  "Laphroaig Experience" is 1.5 hrs but scheduled as 75m (Laphroaig's
 *  Avg Visit is 1.25 hrs), and Bunnahabhain's "Production Tour" is
 *  50 min but scheduled as 90m (Avg Visit 1.5 hrs).
 *
 *  Avg Visit remains the fallback rather than being retired: a Day Stop
 *  need not name a tour at all (Jura's doesn't), and several Port Ellen
 *  tours state "Unconfirmed - not publicly listed" for their duration,
 *  which parseTourDurationMinutes deliberately returns null for rather
 *  than inventing a number. */
export function stopVisitMinutes(stop: ItineraryStop): number {
  if (stop.customMinutes != null) return stop.customMinutes;
  if (stop.kind === "distillery") {
    return parseTourDurationMinutes(stop.tour?.duration) ?? parseAvgVisitMinutes(stop.distillery.avgVisit);
  }
  return parseFeatureDurationMinutes(stop.feature.duration) ?? DEFAULT_FEATURE_VISIT_MINUTES;
}

export function incrementVisitMinutes(stop: ItineraryStop, direction: 1 | -1): number {
  const current = stopVisitMinutes(stop);
  return Math.max(MIN_VISIT_MINUTES, current + direction * VISIT_STEP_MINUTES);
}
