import type { ItineraryStop } from "@/lib/types";
import { parseAvgVisitMinutes } from "@/lib/drive-time";

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
 *  estimate (distillery avgVisit, or the flat feature estimate). */
export function stopVisitMinutes(stop: ItineraryStop): number {
  if (stop.customMinutes != null) return stop.customMinutes;
  return stop.kind === "distillery" ? parseAvgVisitMinutes(stop.distillery.avgVisit) : DEFAULT_FEATURE_VISIT_MINUTES;
}

export function incrementVisitMinutes(stop: ItineraryStop, direction: 1 | -1): number {
  const current = stopVisitMinutes(stop);
  return Math.max(MIN_VISIT_MINUTES, current + direction * VISIT_STEP_MINUTES);
}
