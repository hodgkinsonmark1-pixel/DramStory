// ─────────────────────────────────────────────────────────────────────────
// routing.mjs — the ONE place this repo talks to a routing engine.
//
// Extracted 17 Aug 2026 from compute-day-stop-legs.mjs, unchanged in
// behaviour, when a second script (compute-journey-base-legs.mjs) needed
// exactly the same profiles, the same walking-pace rule and the same
// rate limiting. Two copies of the "OSRM's /foot/ profile is fake" note
// would be two copies to get wrong later.
//
// TRAVEL MODE / ROUTING PROFILES  (verified 17 Aug 2026, and re-verified
// the same day against Laphroaig's corrected coordinate — the figures
// below moved a few metres, the conclusion did not)
//   router.project-osrm.org DOES respond 200 to /route/v1/foot/... but it
//   does NOT actually have the foot profile loaded: the response is
//   byte-for-byte identical to the /driving/ response for the same
//   coordinates (verified on Laphroaig→Lagavulin: both return
//   duration 197.8s / distance 1979.0m, i.e. ~36km/h, which is not a
//   walking pace). Writing those numbers onto a walking day would be
//   exactly the silent error these scripts exist to remove.
//
//   So walking legs are routed against FOSSGIS's public OSRM instance,
//   routing.openstreetmap.de/routed-foot, which does have a real foot
//   profile (same leg: 1571.9s / 1971.7m, ~4.5km/h). If that host is ever
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
 *  store OSRM's own duration.
 *
 *  THE SITE HAS THE SAME NUMBER (17 Aug 2026): WALKING_SPEED_KMH in
 *  src/lib/drive-time.ts, used for the blank-leg fallback on a walking
 *  day, which until then was a 40km/h drive estimate whatever the mode.
 *  A deliberate second copy — this is plain Node ESM and that is
 *  TypeScript compiled by Next, with no build step joining them — and
 *  the two MUST stay equal. Change one, change the other. */
export const WALKING_SPEED_KMH = 3.75;

/** A TRANSFER leg shorter than this is walked whatever the Journey's
 *  `Transfer Mode` says, because nobody gets a car out for it.
 *
 *  The Islay Grand Tour's old day 5 is why this exists. It was based in
 *  Port Ellen and that day was Port Ellen distillery — the same village
 *  — so the journey's Drive transfer mode produced "a 1 minute drive"
 *  over a few hundred metres, which is both daft to read and wrong: you
 *  would find
 *  the car, reverse it out and park it again in less time than the walk
 *  takes. 600m is the site owner's line, chosen as comfortably under the
 *  shortest transfer anyone would sensibly drive and comfortably over the
 *  distance any of these village-centre legs actually run.
 *
 *  It applies ONLY to transfers (base → first stop, last stop → base).
 *  Within-day legs are left alone: a Drive day's stop-to-stop hops are
 *  authored as drives and a 500m hop between two stops on a driving day
 *  is still made in the car you are already sitting in.
 *
 *  The leg is then routed AGAIN on the foot profile, because a short
 *  drive and a short walk are not the same path — Port Ellen's is 547m
 *  by road and 252m on foot — and the walked figure has to describe the
 *  walk. Timed, like every walked leg here, at WALKING_SPEED_KMH. */
export const SHORT_TRANSFER_WALK_METRES = 600;

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

/** Walking minutes for an already-rounded distance in km. Derived from
 *  the STORED km rather than the raw metres so that a re-run, and anyone
 *  checking the arithmetic against the two numbers on the record, both
 *  get the same answer. */
export function walkMinutesForKm(km) {
  return Math.max(1, Math.round((km / WALKING_SPEED_KMH) * 60));
}

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
              walkMinutesForKm(km)
            : // Driving: OSRM's own duration. Matches route-geometry.ts's
              // rounding, so a stored leg and a live-planner leg for the
              // same pair read the same.
              Math.max(1, Math.round(route.duration / 60)),
        km,
        // The router's UNROUNDED distance in metres. `km` is what gets
        // stored and read; this is only ever compared against a metre
        // threshold (SHORT_TRANSFER_WALK_METRES), where rounding 0.58km
        // up to 0.6 would flip the answer.
        metres: route.distance,
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

/**
 * One routed TRANSFER leg — base → a day's first stop, or its last stop
 * → base — with the short-transfer rule applied. Returns
 * `{ minutes, km, walked }` or `{ error }`.
 *
 * `walked` is the fact the site needs and cannot re-derive: it is true
 * when the Journey's Transfer Mode is Walk, AND when the mode says Drive
 * but the leg came back under SHORT_TRANSFER_WALK_METRES. Stored
 * alongside the minutes (Journey Days' `Leg From/To Base Walked`) so the
 * verb printed over a figure and the figure itself are decided in one
 * place, here, rather than by a second copy of the threshold on the site.
 */
export async function routeTransferLeg(from, to, mode) {
  const routed = await routeLeg(from, to, mode);
  if (routed.error) return routed;
  if (mode === "walk") return { ...routed, walked: true };
  if (routed.metres >= SHORT_TRANSFER_WALK_METRES) return { ...routed, walked: false };

  // Short enough to walk. Re-route it on foot: the walking path is a
  // different path, and the stored km has to be the one that was walked.
  const onFoot = await routeLeg(from, to, "walk");
  if (!onFoot.error) return { ...onFoot, walked: true };

  // The foot router refused. Rather than fall back to printing a
  // one-minute drive — the exact thing this rule exists to stop — keep
  // the driven distance and time it at walking pace, and say so.
  return {
    minutes: walkMinutesForKm(routed.km),
    km: routed.km,
    metres: routed.metres,
    walked: true,
    note: `foot router failed (${onFoot.error}); timed the driven ${routed.km}km at walking pace`,
  };
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
