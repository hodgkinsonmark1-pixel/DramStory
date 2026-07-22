// ─────────────────────────────────────────────────────────────────────────
// Estimated drive time between two points, based on straight-line
// (haversine) distance and an assumed average speed for Islay's rural
// single-track roads. Not routed via a real roads API — that's a
// reasonable future upgrade (e.g. a driving-directions API) once traffic
// justifies the cost, but this gets close enough for trip planning today
// (verified against the approved mockup's Ardbeg -> Bowmore estimate).
// ─────────────────────────────────────────────────────────────────────────

const AVERAGE_SPEED_KMH = 40;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimated drive time in whole minutes, rounded to the nearest 5. */
export function estimatedDriveMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const km = haversineKm(a, b);
  const minutes = (km / AVERAGE_SPEED_KMH) * 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Formats minutes as "25m" or "1h 40m", matching the approved mockup. */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Parses a distillery's "avgVisit" string (e.g. "1.5 hours", "90 min")
 *  into minutes. Falls back to 90 minutes if the format is unrecognized. */
export function parseAvgVisitMinutes(avgVisit: string): number {
  const hourMatch = avgVisit.match(/([\d.]+)\s*h/i);
  const minMatch = avgVisit.match(/([\d.]+)\s*m/i);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));
  return 90;
}

const DURATION_UNIT_RE = "(hours?|hrs?|h|mins?|minutes?|m)";

function durationUnitToMinutes(value: number, unit: string): number {
  return /^h/i.test(unit) ? value * 60 : value;
}

/** Parses a Local Feature's "duration" string (walks/bike routes only -
 *  e.g. "30-45 min", "45 min - 1 hour", "1.5-2 hours", "1 hour") into the
 *  UPPER end of the range, in minutes. Used so a walk's default itinerary
 *  visit length matches what its own narrative/Explore page already say
 *  (22 July 2026 - "Rubha Mor Headland" showed a flat 25-minute default
 *  in the itinerary while its own duration field, and the Bunnahabhain Day
 *  narrative, both say "30-45 min"). Returns null if duration is missing
 *  or doesn't match a recognizable format - callers should fall back to a
 *  flat default, same as before this existed. */
export function parseFeatureDurationMinutes(duration: string | undefined): number | null {
  if (!duration) return null;

  // Two explicit units either side of the range, e.g. "45 min - 1 hour".
  const twoUnits = duration.match(
    new RegExp(`([\\d.]+)\\s*${DURATION_UNIT_RE}\\b\\s*-\\s*([\\d.]+)\\s*${DURATION_UNIT_RE}\\b`, "i")
  );
  if (twoUnits) {
    const a = durationUnitToMinutes(parseFloat(twoUnits[1]), twoUnits[2]);
    const b = durationUnitToMinutes(parseFloat(twoUnits[3]), twoUnits[4]);
    return Math.round(Math.max(a, b));
  }

  // A range sharing one trailing unit, e.g. "30-45 min", "1.5-2 hours".
  const sharedUnit = duration.match(new RegExp(`([\\d.]+)\\s*-\\s*([\\d.]+)\\s*${DURATION_UNIT_RE}\\b`, "i"));
  if (sharedUnit) {
    return Math.round(durationUnitToMinutes(parseFloat(sharedUnit[2]), sharedUnit[3]));
  }

  // A single value, e.g. "1 hour".
  const single = duration.match(new RegExp(`([\\d.]+)\\s*${DURATION_UNIT_RE}\\b`, "i"));
  if (single) {
    return Math.round(durationUnitToMinutes(parseFloat(single[1]), single[2]));
  }

  return null;
}
