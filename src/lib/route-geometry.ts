// ─────────────────────────────────────────────────────────────────────────
// Real road routing via OSRM's free public demo server - no API key, no
// billing account, unlike Google Directions. Returns actual road geometry
// and drive time, not a straight line (which was the bug: a straight line
// between e.g. Bruichladdich and Bowmore cuts straight across Loch Indaal,
// which obviously isn't drivable).
//
// Caveat worth knowing: OSRM's public demo is explicitly for "reasonable,
// non-commercial use" with no uptime guarantee - fine for now at low
// traffic, but self-hosting OSRM (still free, just needs a small server)
// or a paid routing API would be the right call once real traffic justifies
// it. Every call here degrades gracefully to a straight line if the
// service is ever slow/unavailable, so a routing outage never breaks the
// map, it just temporarily looks like it used to.
// ─────────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  points: LatLng[];
  durationMinutes: number;
  distanceKm: number;
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

// In-memory only (per browser session) - avoids re-fetching the same pair
// repeatedly as someone flips between days or re-adds a stop.
const segmentCache = new Map<string, RouteSegment | null>();

function segmentKey(a: LatLng, b: LatLng): string {
  return `${a.lat.toFixed(5)},${a.lng.toFixed(5)}|${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
}

async function fetchOneSegment(a: LatLng, b: LatLng): Promise<RouteSegment | null> {
  const key = segmentKey(a, b);
  if (segmentCache.has(key)) return segmentCache.get(key) ?? null;

  try {
    const url = `${OSRM_BASE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) {
      segmentCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) {
      segmentCache.set(key, null);
      return null;
    }
    const points: LatLng[] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    const result: RouteSegment = {
      points,
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      distanceKm: route.distance / 1000,
    };
    segmentCache.set(key, result);
    return result;
  } catch {
    segmentCache.set(key, null);
    return null;
  }
}

/** Fetches the real road route for each consecutive pair of stops. A null
 *  entry means that specific segment's routing failed - callers should
 *  fall back to a straight line / estimated time for just that segment
 *  rather than failing the whole route. */
export async function fetchRouteSegments(stops: LatLng[]): Promise<(RouteSegment | null)[]> {
  const pairs: [LatLng, LatLng][] = [];
  for (let i = 0; i < stops.length - 1; i++) pairs.push([stops[i], stops[i + 1]]);
  return Promise.all(pairs.map(([a, b]) => fetchOneSegment(a, b)));
}
