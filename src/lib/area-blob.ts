/**
 * Procedurally generates an irregular, organic "blob" polygon around an
 * Area's centre point, for the map's per-Area highlight overlay (see the
 * blob-drawing effect in MapCanvas.tsx). There's no real boundary/polygon
 * data for these areas anywhere in Airtable or the rest of the codebase -
 * Areas only ever have a single Lat/Long point - so rather than sourcing
 * real boundary data (a much bigger, separate effort), this fakes a
 * hand-drawn-looking irregular shape instead of the plain, always-
 * perfectly-circular L.circle it replaces (08 Aug 2026, per Mark's
 * reference screenshot: an asymmetric, bumpy red splash drawn freehand
 * over a village on an OSM view - not a neat geometric shape).
 *
 * Deterministic per area - seeded off the area's own slug/name, never
 * Math.random() - so the exact same blob outline comes back on every
 * call. This matters because MapCanvas computes these once via useMemo
 * and then only toggles visibility on hover/click; a non-deterministic
 * generator would either have to regenerate (and visibly jitter) the
 * shape on every hover, or awkwardly cache instances some other way.
 */

const POINT_COUNT = 12;
const BASE_RADIUS_M = 550;
const RADIUS_VARIANCE = 0.4; // +/-40%
const SMOOTHING_PASSES = 2;

/** Tiny deterministic string -> 32-bit seed hash (FNV-1a variant) - not
 *  cryptographic, just needs to spread different area slugs apart well
 *  enough that Port Ellen/Bowmore/Port Charlotte don't end up with
 *  visually similar-looking blobs. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 - a small, fast, fully deterministic PRNG from a 32-bit
 *  seed. Not cryptographic and not meant to be; just needs to be stable
 *  and dependency-free (no new package for one random sequence). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One pass of Chaikin's corner-cutting algorithm over a CLOSED loop of
 *  points: each edge (p0 -> p1) is replaced by two new points 1/4 and 3/4
 *  of the way along it, which rounds off every corner. Run over the raw
 *  randomized point ring below, this is what turns a jagged star outline
 *  into a soft, organic blob - deliberately used instead of pulling in a
 *  real geometry/spline library for one shape. */
function chaikinSmooth(points: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % n];
    out.push([p0[0] + (p1[0] - p0[0]) * 0.25, p0[1] + (p1[1] - p0[1]) * 0.25]);
    out.push([p0[0] + (p1[0] - p0[0]) * 0.75, p0[1] + (p1[1] - p0[1]) * 0.75]);
  }
  return out;
}

/**
 * Builds a closed [lat, lng][] polygon outline (ready to hand straight to
 * Leaflet's L.polygon) around (lat, lng): POINT_COUNT points at even
 * angular steps, each with its radius randomly varied by
 * +/-RADIUS_VARIANCE around BASE_RADIUS_M (seeded off `seedKey`, so
 * stable across calls), then softened with SMOOTHING_PASSES of Chaikin
 * smoothing. Some bulges reach out toward BASE_RADIUS_M * (1 +
 * RADIUS_VARIANCE) (~770m) before smoothing pulls them in slightly, so
 * the overall shape reads at roughly the 800m-1.2km-across scale of
 * Mark's reference screenshot, not a tidy 550m-radius circle.
 */
export function generateAreaBlob(lat: number, lng: number, seedKey: string): [number, number][] {
  const rand = mulberry32(hashSeed(seedKey));
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);

  let points: [number, number][] = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    const angle = (i / POINT_COUNT) * Math.PI * 2;
    const variance = 1 + (rand() * 2 - 1) * RADIUS_VARIANCE;
    const radius = BASE_RADIUS_M * variance;
    const dLat = (radius * Math.sin(angle)) / metersPerDegLat;
    const dLng = (radius * Math.cos(angle)) / metersPerDegLng;
    points.push([lat + dLat, lng + dLng]);
  }

  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
    points = chaikinSmooth(points);
  }

  return points;
}
