import type { ItineraryStop } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Small helpers so the rest of the app doesn't need an if/else on
// stop.kind every time it wants an id, name, or coordinates - a stop is
// either a distillery (with an optional tour) or a Natural Feature.
// ─────────────────────────────────────────────────────────────────────────

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
