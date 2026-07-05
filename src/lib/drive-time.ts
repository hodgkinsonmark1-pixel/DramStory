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
