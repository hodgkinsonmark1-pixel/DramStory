// ─────────────────────────────────────────────────────────────────────────
// routing.mjs — the ONE place this repo talks to a routing engine.
//
// Extracted 17 Aug 2026 from compute-day-stop-legs.mjs, unchanged in
// behaviour, when a second script (compute-journey-base-legs.mjs) needed
// exactly the same profiles, the same walking-pace rule and the same
// rate limiting. Two copies of the "OSRM's /foot/ profile is fake" note
// would be two copies to get wrong later.
//
// TRAVEL MODE / ROUTING PROFILES  (verified 17 Aug 2026)
//   router.project-osrm.org DOES respond 200 to /route/v1/foot/... but it
//   does NOT actually have the foot profile loaded: the response is
//   byte-for-byte identical to the /driving/ response for the same
//   coordinates (verified on Laphroaig→Lagavulin: both return
//   duration 189.8s / distance 1971.9m, i.e. ~37km/h, which is not a
//   walking pace). Writing those numbers onto a walking day would be
//   exactly the silent error these scripts exist to remove.
//
//   So walking legs are routed against FOSSGIS's public OSRM instance,
//   routing.openstreetmap.de/routed-foot, which does have a real foot
//   profile (same leg: 1566.3s / 1964.7m, ~4.5km/h). If that host is ever
//   unavailable, the leg fails and is left blank — nothing here quietly
//   substitutes a driving time. Self-hosting OSRM with both profiles is
//   the right answer once this matters commercially.
//
//   We keep the foot router's DISTANCE (it follows the real path, which
//   is the whole reason for routing at all) but not its duration: walking
//   minutes are computed here at WALKING_SPEED_KMH instead. See that
//   constant for why. Driving legs use OSRM's own duration.
// ─────────────────────────────────────────────────────────────────────────

export const PROFILES = {
  drive: "https://router.project-osrm.org/route/v1/driving",
  // See the note above — NOT router.project-osrm.org/foot, which
  // silently answers with car routing.
  walk: "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
};

/** Walking pace, km/h, used to turn a routed foot DISTANCE into a
 *  duration. An editorial choice by the site owner, NOT a routing-engine
 *  figure: this is a whisky trip and people dawdle, so the foot router's
 *  own ~4.5km/h is a brisk pace that would under-promise how long a
 *  walking day really takes. Driving legs are untouched — they still
 *  store OSRM's own duration. */
export const WALKING_SPEED_KMH = 3.75;

/** Space requests out. Both hosts are free public services asking for
 *  reasonable use; ~1 request/sec is well inside that and a whole run is
 *  a handful of requests. */
export const REQUEST_SPACING_MS = 1100;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every leg routed in this process, keyed by from/to/mode. Two Days can
 *  genuinely need the same leg (Port Ellen → Laphroaig opens both "Three
 *  Legends, One Road" and "Two Miles Apart"), and asking a free public
 *  service the same question twice is both slower and ruder than
 *  remembering the answer. Purely an in-process cache — nothing is
 *  persisted, so a re-run still routes everything fresh. */
const legCache = new Map();

/** How many requests this process has actually sent. Exposed for the
 *  scripts' own end-of-run summary. */
let requestCount = 0;
export const requestsSent = () => requestCount;

/**
 * One routed leg: `{ minutes, km }`, or `{ error }`. An error means "we
 * do not know" — callers leave the field alone rather than inventing a
 * figure. Never returns a driving time for a walking leg, or vice versa.
 */
export async function routeLeg(from, to, mode) {
  const key = `${mode}|${from.lng},${from.lat}|${to.lng},${to.lat}`;
  const cached = legCache.get(key);
  if (cached) return cached;

  // Rate limit only real requests, and only between them (never before
  // the first one, and never for a cache hit).
  if (requestCount > 0) await sleep(REQUEST_SPACING_MS);
  requestCount++;

  const base = PROFILES[mode] ?? PROFILES.drive;
  const url = `${base}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  const result = await (async () => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "DramStory/1.0 (one-off leg precompute)" } });
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const data = await res.json();
      const route = data?.routes?.[0];
      if (data?.code !== "Ok" || !route) return { error: `OSRM code ${data?.code ?? "none"}` };
      // Always the router's own distance: it follows the real road/path,
      // which is the entire point of routing rather than measuring a
      // straight line.
      const km = Math.round((route.distance / 1000) * 10) / 10;
      return {
        minutes:
          mode === "walk"
            ? // Walking: our own pace applied to the km we are about to
              // store, so the two stored fields can never contradict each
              // other (2.0km → 32 min, not 31, which is what a re-run has
              // to agree with).
              Math.max(1, Math.round((km / WALKING_SPEED_KMH) * 60))
            : // Driving: OSRM's own duration. Matches route-geometry.ts's
              // rounding, so a stored leg and a live-planner leg for the
              // same pair read the same.
              Math.max(1, Math.round(route.duration / 60)),
        km,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  })();

  // Failures are cached too: a host that just refused this leg will
  // refuse it again inside the same run, and re-asking helps nobody.
  legCache.set(key, result);
  return result;
}

/** A Drive/Walk singleSelect cell → a profile key. Blank is Drive, which
 *  is what every record was implicitly assumed to be before either field
 *  existed (see TravelMode in src/lib/types.ts).
 *
 *  Two DIFFERENT fields feed this, and which one a caller passes is the
 *  whole point rather than an implementation detail:
 *    - a Day's `Travel Mode` picks the profile for its WITHIN-DAY legs
 *      (stop → stop), in compute-day-stop-legs.mjs;
 *    - a Journey's `Transfer Mode` picks the profile for its TRANSFER
 *      legs (base → first stop, last stop → base), in
 *      compute-journey-base-legs.mjs.
 *  A car-based journey drives its transfers even to a day that is walked
 *  once you arrive, so neither field can stand in for the other. */
export function modeFor(modeCell) {
  return modeCell === "Walk" ? "walk" : "drive";
}
