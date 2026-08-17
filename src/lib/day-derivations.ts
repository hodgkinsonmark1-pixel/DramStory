import type { Distillery, HubDay, ItineraryDay, ItineraryStop, LocalFeature, Tour, TravelMode, TripDates } from "@/lib/types";
import { estimatedDriveMinutes, estimatedTravelMinutes } from "@/lib/drive-time";
import { stopCoords, stopId, stopName, stopVisitMinutes } from "@/lib/itinerary-stop";

/**
 * Derived values for a HubDay against the visitor's current TripAnswers
 * (base/nights/picks) - Days/Trip flow Phase 2 (docs/days-trip-flow-
 * handoff.md §2.2 "Per-day derived values", §4.1-§4.3). All computed
 * here, never stored - per the design doc: "Computed, never stored."
 */

/**
 * A HubDay is treated as needing a ferry if it includes the Isle of Jura
 * distillery - the one distillery on the island that genuinely needs a
 * crossing to reach.
 *
 * JUDGEMENT CALL: there's no dedicated "is this a ferry day" flag
 * anywhere in the data model (the design doc's own Airtable additions -
 * `anchor` and `closedDays` - are both Phase 4, out of scope here), so
 * this reuses the reasoning already established in journey-options.ts's
 * TODAY_EXCLUDED_DISTILLERY_SLUGS comment: "Jura needs a ferry crossing
 * from Islay... none of that math accounts for a ferry." Same idea
 * applied here: any HubDay whose stops include isle-of-jura is a ferry
 * day. Grepped the codebase first (per the task brief) rather than
 * inventing new detection - this is the only existing ferry-adjacent
 * signal tied to a specific distillery slug.
 */
export function isFerryDay(day: HubDay): boolean {
  return day.stops.some((s) => s.distillery.slug === "isle-of-jura");
}

// ─────────────────────────────────────────────────────────────────────────
// Travel between stops (17 Aug 2026). Every leg on a published Day is now
// routed ONCE, offline, and stored on its Day Stop record (`Leg Minutes`,
// see scripts/compute-day-stop-legs.mjs) - so a rendered day shows real
// road/path times instead of drive-time.ts's straight-line haversine
// estimate, without any page view calling a routing service. OSRM's public
// demo server is explicitly non-commercial with no SLA, which is exactly
// why the site does not call it at render time; the live planner
// (Workspace.tsx) still does, deliberately, because someone actively
// dragging stops around needs an answer for an order nobody precomputed.
//
// The stored value is already mode-correct - a Walk day's legs were routed
// on a foot profile, with the walking duration derived from that routed
// distance at the script's own WALKING_SPEED_KMH (3.75km/h, an editorial
// pace set by the site owner).
//
// FIXED 17 Aug 2026: the blank-leg FALLBACK used to be mode-blind - the
// 40km/h haversine drive estimate whatever the day's Travel Mode. On a
// walking day that is not a rough answer, it is the wrong question, and
// it is wrong in the direction that gets someone caught out: a two-mile
// leg came back as five minutes. Every fallback below now asks for the
// relevant mode and estimates at walking pace when that mode is walk
// (drive-time.ts's estimatedTravelMinutes). Nothing about a STORED leg
// changed - it was already right.
//
// AND MODE IS NOW PER LEG, NOT PER DAY (17 Aug 2026). A day is not
// uniformly driven or uniformly walked: several driving days park at a
// distillery and walk the last stretch to a beach, a ruin or a
// viewpoint. That fact is authored on the stop, as Day Stops' `Arrive
// By`, and reaches here as ItineraryStop.arriveBy - see legModeFor. The
// precompute script reads exactly the same field to choose exactly the
// same profile, which is what stops a stored leg and an estimated one
// describing the same walk in different units of optimism.
// ─────────────────────────────────────────────────────────────────────────

/** How the leg INTO this stop is made. The stop's own `Arrive By` when
 *  it has one, otherwise the day's Travel Mode, otherwise undefined
 *  (= nobody said, which has always meant driving).
 *
 *  The same precedence as scripts/compute-day-stop-legs.mjs, and
 *  deliberately so: that script picks the routing profile a stored `Leg
 *  Minutes` was measured on, and this picks the pace of the estimate
 *  that stands in when there isn't one. If the two disagreed, a day
 *  would change its mind about how far it walks the moment one leg
 *  failed to route. */
export function legModeFor(stop: ItineraryStop, dayMode: TravelMode | undefined): TravelMode | undefined {
  return stop.arriveBy ?? dayMode;
}

/** Travel minutes for one leg: the precomputed routed value if this stop
 *  has one, otherwise the straight-line estimate for that leg alone, at
 *  the pace this leg is actually made at. A blank `Leg Minutes` is a
 *  normal state (the first stop of a day, a stop the visitor added
 *  themselves, a leg whose routing failed), not an error - it just means
 *  falling back, per leg, exactly as before.
 *
 *  `mode` is how THIS leg is made - legModeFor(stop, day.travelMode),
 *  not the day's mode raw. Undefined means nobody said, which has always
 *  meant driving. */
export function legTravelMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  storedMinutes: number | undefined,
  mode?: TravelMode
): number {
  return storedMinutes ?? estimatedTravelMinutes(from, to, mode);
}

/**
 * Where the visitor sleeps, for the day being rendered - the thing that
 * turns "travel between the stops" into "the whole day, door to door".
 *
 * Two independent sources, in this order of trust:
 *  - `fromBaseMinutes`/`toBaseMinutes` - REAL routed legs, precomputed by
 *    scripts/compute-journey-base-legs.mjs and stored on the Journey Days
 *    junction. Out and back are stored separately and neither is derived
 *    from the other.
 *  - `lat`/`lng` - the base's own coordinates, used only to fall back to
 *    drive-time.ts's straight-line estimate for a leg that has no routed
 *    figure. Same fallback, per leg, as legTravelMinutes does between
 *    stops.
 *
 * With neither, there is no honest leg to add and none is added. A base
 * is never invented: a Day read cold on /days/[slug], with no journey and
 * no trip behind it, still has no base and still starts its clock at the
 * first stop.
 */
export interface DayBase {
  name: string;
  lat?: number;
  lng?: number;
  fromBaseMinutes?: number;
  toBaseMinutes?: number;
  /** How the two legs above are actually made - the JOURNEY's own
   *  `Transfer Mode`, not the Day's `Travel Mode`. Undefined where the
   *  base isn't a journey's (a trip's own chosen accommodation), which
   *  means "we don't know how you'd get there" and stops the walking
   *  line below claiming either way. */
  transferMode?: TravelMode;
  /** Whether each of those legs was actually WALKED, per leg, as routed
   *  and recorded by scripts/compute-journey-base-legs.mjs. Distinct
   *  from `transferMode` because a transfer under 600m is walked even on
   *  a Drive journey - The Islay Grand Tour drives everywhere except its
   *  day 5, which is Port Ellen distillery from a base in Port Ellen and
   *  was reading as a one-minute drive. Undefined means the leg predates
   *  that rule, and the mode above stands in. */
  fromBaseWalked?: boolean;
  toBaseWalked?: boolean;
  /** What the two legs above were actually measured FROM, when that is
   *  not simply `name` - "the pathway start by Port Ellen Primary
   *  School" for The South Coast Walk, whose transfers run from where the
   *  Three Distilleries Pathway begins rather than from Port Ellen's
   *  centroid (Journey.transferOriginLabel, authored in Airtable).
   *
   *  Every sentence below that prints one of these figures names this
   *  when it is set. That is the whole reason the override is allowed to
   *  exist: a reader must never have to guess which of two points a
   *  transfer time runs from. Undefined - every other journey, and every
   *  trip's own accommodation - keeps the "from {name}" phrasing, which
   *  is accurate there. */
  transferOriginLabel?: string;
}

/** Was each transfer leg walked? The stored per-leg fact where there is
 *  one, otherwise the Journey's Transfer Mode. The 600m threshold itself
 *  lives in exactly one place - SHORT_TRANSFER_WALK_METRES in
 *  scripts/lib/routing.mjs - and is deliberately NOT re-implemented here:
 *  the site has no routed distance to apply it to, only the minutes, and
 *  a second copy of the rule would be a second thing to get wrong. */
export function transferLegsWalked(base: DayBase | undefined): { out: boolean; back: boolean } {
  const fallback = base?.transferMode === "walk";
  return { out: base?.fromBaseWalked ?? fallback, back: base?.toBaseWalked ?? fallback };
}

/** The two base legs in minutes, each undefined when neither a routed
 *  figure nor coordinates exist for it. `first`/`last` are the day's own
 *  first and last stop coordinates.
 *
 *  The ESTIMATED fallback is paced by the base's own `transferMode` (the
 *  JOURNEY's Transfer Mode, not the Day's Travel Mode - a car journey
 *  drives to a day that is walked once you arrive), for the same reason
 *  legTravelMinutes takes a mode. A trip's own accommodation carries no
 *  transfer mode, so it keeps the drive estimate it has always had. */
export function resolveBaseLegs(
  base: DayBase | undefined,
  first: { lat: number; lng: number } | undefined,
  last: { lat: number; lng: number } | undefined
): { out?: number; back?: number } {
  if (!base || !first || !last) return {};
  const point = base.lat !== undefined && base.lng !== undefined ? { lat: base.lat, lng: base.lng } : undefined;
  return {
    out: base.fromBaseMinutes ?? (point ? estimatedTravelMinutes(point, first, base.transferMode) : undefined),
    back: base.toBaseMinutes ?? (point ? estimatedTravelMinutes(last, point, base.transferMode) : undefined),
  };
}

/** A trip day's own accommodation, expressed as a DayBase - the visitor
 *  really has said where they're sleeping, so this is a base. No routed
 *  minutes: a stored leg describes a journey's authored Base, and the
 *  visitor's chosen hotel isn't that, so these legs stay estimates. */
function accommodationBase(day: ItineraryDay): DayBase | undefined {
  const acc = day.accommodation;
  return acc ? { name: acc.name, lat: acc.lat, lng: acc.lng } : undefined;
}

/** Mode-aware wording for the "≈40m ___" figures on a day card and the
 *  day page. Deliberately only swaps the verb - it makes no new claim
 *  about the walk (distance, difficulty, surface), it just stops calling
 *  walking "driving". */
export function travelCopy(mode: TravelMode | undefined): { betweenStops: string; wholeDay: string } {
  return mode === "walk"
    ? { betweenStops: "walking between stops", wholeDay: "on foot" }
    : { betweenStops: "driving between stops", wholeDay: "on the road" };
}

// ─────────────────────────────────────────────────────────────────────────
// Saying the walking out loud (17 Aug 2026). A Walk day currently
// advertises a mileage ("4 miles") and a pacing tag, and nothing else -
// so "Ardbeg, on Foot" inside The South Coast Walk reads like a gentle
// morning when it is really three hours on your feet, most of it getting
// there and back. This turns the legs that were routed anyway into one
// plain sentence.
//
// EVERY minute in it is a stored, routed figure. Nothing is estimated
// here and nothing is converted from a mileage:
//   - within-day legs come from Day Stops' `Leg Minutes`, routed on a
//     real foot profile at the editorial WALKING_SPEED_KMH;
//   - the transfer, when it is walked, comes from Journey Days' `Leg
//     From/To Base Minutes`, routed the same way.
// If any leg needed is missing, this returns undefined and the page keeps
// its existing clearly-labelled estimate rather than printing a confident
// wrong number. It deliberately does NOT fall back to
// estimatedDriveMinutes: that is a 40km/h haversine, and a driving
// estimate dressed up as walking minutes is the exact error this whole
// precompute exists to remove.
//
// THAT GAP IS NOW CLOSED (17 Aug 2026). Feature stops are real Day Stop
// records with their own `Order` and their own routed `Leg Minutes`, so
// the cafe, the beach and the ruin are all in this total, in the place
// the narrative puts them. "Ardbeg, on Foot" used to state 2h50 counting
// only the walk out from the trailhead and back, with nothing for the
// three feature stops its own narrative spends a paragraph on.
//
// What replaced it is the OPTIONAL split. A Day Stop the narrative
// hedges ("if you have the energy... it's worth continuing") is marked
// `Optional`, and the two are stated as two numbers rather than one
// average that describes neither day. The detour is counted THERE AND
// BACK: the day still returns to base from its last non-optional stop,
// so carrying on and coming back is exactly twice those legs. Nothing is
// invented - it is the same routed legs, counted both ways, which is
// what "and back" means.
//
// AND IT IS NO LONGER ONLY WALKING DAYS (17 Aug 2026). Once a stop could
// say how you arrive at it, most days became mixed: you drive to
// Bunnahabhain and then walk an hour to Rubha Bhachlaig and back, you
// drive to Kilchoman and then walk to Machir Bay. Gating the sentence on
// the DAY's Travel Mode hid every one of those. The gate is now the sum
// of the legs whose OWN mode is Walk, and a threshold under which the
// day says nothing - see MINIMUM_WALKING_LINE_MINUTES.
// ─────────────────────────────────────────────────────────────────────────

/** Minutes as prose - "50 minutes", "1 hour", "2 hours 25 minutes".
 *  Deliberately not drive-time.ts's formatDuration ("50m", "2h 25m"),
 *  which is a meta-row abbreviation: "About 50m on foot" reads as fifty
 *  metres in the middle of a sentence. */
function spellMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hours = `${h} ${h === 1 ? "hour" : "hours"}`;
  const mins = `${m} ${m === 1 ? "minute" : "minutes"}`;
  if (h === 0) return mins;
  return m === 0 ? hours : `${hours} ${mins}`;
}

/** The same minutes, shorter, for a line that has to fit on a phone -
 *  "45 minutes", "1 hour", "2 hours 10". Under an hour it keeps the unit
 *  (a bare "45" says nothing); above one, the trailing minutes ride on
 *  the hours the way anyone saying it out loud would say it.
 *
 *  Separate from spellMinutes rather than replacing it: that one still
 *  spells a schedule gap out in full ("1 hour 30 minutes before Ardbeg"),
 *  where there is room for it and where the sentence has no second
 *  figure to be confused with. Also not drive-time.ts's formatDuration
 *  ("2h 25m"), which is a meta-row abbreviation, not prose. */
function spellMinutesShort(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} ${m === 1 ? "minute" : "minutes"}`;
  const hours = `${h} ${h === 1 ? "hour" : "hours"}`;
  return m === 0 ? hours : `${hours} ${m}`;
}

/**
 * One sentence stating how much of a day is actually spent on foot, or
 * undefined when the stored legs can't answer it, or when the answer is
 * too small to be worth a sentence.
 *
 * NOT just walking days (17 Aug 2026). It used to return early unless
 * the DAY's Travel Mode was Walk, which meant a driving day containing a
 * real walk printed nothing at all: "Bunnahabhain, Back from Silence"
 * drives out and then walks 34 minutes each way to Rubha Bhachlaig,
 * because there is no road, and the page said nothing about it. What
 * counts now is each LEG's own resolved mode - legModeFor, the stop's
 * `Arrive By` falling back to the day's Travel Mode - which is the same
 * question the router was asked when the leg was measured.
 *
 * Undefined in four honest cases, all of which leave the existing
 * mileage/duration copy in place:
 *  - nothing on this day is walked at all;
 *  - a leg it would need was walked but never routed;
 *  - every stop is optional, so there is no plan to state;
 *  - the plan AND any optional detour are both at or under
 *    MINIMUM_WALKING_LINE_MINUTES - see there, and see the optional-only
 *    line below for the case where only the plan is.
 *
 * SHORT ENOUGH TO READ (17 Aug 2026). Every variant here is written to
 * land under WALKING_LINE_MAX_CHARS - one line on a phone. That is what
 * retired the `Distance on Foot` brackets this used to append (the
 * mileage still renders in the day's meta row, where it always has) and
 * what moved the authored transfer origin out of the sentence and onto
 * the page once - see walkingOriginNote.
 */
/** Under this - the site owner's line, in minutes - the day says nothing
 *  about walking rather than printing a figure too small to plan around.
 *  Deliberate, not a rounding artefact: "Bowmore, Unhurried" computes
 *  seven minutes because only three of the village stops are modelled,
 *  and "About 5 minutes on foot" reads as a precise claim about a day
 *  that is genuinely spent wandering. Days below the line keep their
 *  mileage and pacing copy, which promise less and are true. */
const MINIMUM_WALKING_LINE_MINUTES = 20;

/** A detour worth its own clause. Below this the two figures round to
 *  almost the same sentence, and "or 15 minutes if you carry on" is
 *  noise where the whole point is a decision someone has to make. */
const MEANINGFUL_DETOUR_MINUTES = 15;

/** The site owner's line, in characters, for how long a walking line may
 *  be (17 Aug 2026). The old wording ran to 125 characters and wrapped to
 *  three lines on a phone, which is how a sentence meant to warn someone
 *  about two hours on their feet ends up being skipped. Every variant
 *  below is written to land under this; the two places that can still
 *  blow it - a long authored origin label, and a day's own name inside a
 *  clause - are measured against it rather than trusted. */
const WALKING_LINE_MAX_CHARS = 60;

/** Connectors that start the "and where is that, exactly" half of an
 *  authored transfer origin - "the pathway start BY Port Ellen Primary
 *  School". Cutting there leaves the head phrase, which is still the
 *  visitor's own words and still true; it is only less precise, and the
 *  full label is stated once on the page (see walkingOriginNote) so the
 *  precision is never actually lost. Deliberately conservative: anything
 *  not in this list is left whole and simply dropped if it won't fit. */
const ORIGIN_HEAD_RE = /,|\s+(?:by|next to|beside|outside|opposite|behind|near)\s+/i;

/** The longest form of `label` that leaves the finished line under
 *  WALKING_LINE_MAX_CHARS - the label itself, else its head phrase, else
 *  nothing at all, in which case the caller says the sentence without an
 *  origin and the page's own note carries it. */
function fittedOrigin(label: string | undefined, before: string, after: string): string | undefined {
  if (!label) return undefined;
  const head = label.split(ORIGIN_HEAD_RE)[0].trim();
  for (const candidate of [label, head]) {
    if (candidate && (before + candidate + after).length <= WALKING_LINE_MAX_CHARS) return candidate;
  }
  return undefined;
}

export function walkingLineFor(day: HubDay, base?: DayBase): string | undefined {
  // The Day's whole authored order, features included - the same list the
  // schedule and the map are built from, so the three cannot disagree.
  const stops = itineraryDayFromHubDay(day).stops;

  // Is the WHOLE day walked, or is this a driving day with walking in
  // it? Only the wording turns on this; the figure is the same sum
  // either way.
  const wholeDayWalked = day.travelMode === "walk";

  // Everything after the LAST stop that is part of the plan is the
  // optional tail. Deliberately "after the last", not "every optional
  // stop": an optional stop with real stops after it is something the
  // day comes back through, so it belongs in the core figure, and only a
  // trailing detour can honestly be counted there-and-back.
  let lastCore = -1;
  stops.forEach((stop, i) => {
    if (!stop.optional) lastCore = i;
  });
  if (lastCore < 0) return undefined; // every stop optional: no plan to state

  // Stop 0 has nothing before it, so it never carries a leg. Every LATER
  // leg that is made on foot must have a stored figure, or there is no
  // honest total to state; a leg made in the car is simply not part of
  // this sentence and a missing figure for it costs nothing.
  let minutes = 0;
  for (const stop of stops.slice(1, lastCore + 1)) {
    if (legModeFor(stop, day.travelMode) !== "walk") continue;
    if (stop.legMinutes === undefined) return undefined;
    minutes += stop.legMinutes;
  }

  // The detour, out and back, and on foot only - same rule as above.
  // Missing a leg here loses only the second sentence; the plan's own
  // figure is still true and still printed.
  const tailOnFoot = stops
    .slice(lastCore + 1)
    .filter((s) => legModeFor(s, day.travelMode) === "walk");
  const detourOneWay = tailOnFoot.every((s) => s.legMinutes !== undefined)
    ? tailOnFoot.reduce((sum, s) => sum + (s.legMinutes as number), 0)
    : undefined;

  // The transfer counts only on a day that is walked end to end. Per
  // leg, not per journey: a Drive journey can still have a walked
  // transfer once the 600m rule has been applied to it.
  //
  // On a DRIVING day it is deliberately left out even when the stored
  // leg says it was walked. The figure that day prints is what you walk
  // once the car is parked, and a transfer - by definition - happens
  // before that. Adding it would put the sentence's own "once you're
  // there" out by however long the transfer took.
  const walked = wholeDayWalked ? transferLegsWalked(base) : { out: false, back: false };
  if (walked.out) {
    if (base?.fromBaseMinutes === undefined) return undefined;
    minutes += base.fromBaseMinutes;
  }
  if (walked.back) {
    if (base?.toBaseMinutes === undefined) return undefined;
    minutes += base.toBaseMinutes;
  }
  // Rounded to the nearest five so "about" means it. The underlying
  // figures are routed to the minute, but a walking pace is an editorial
  // 3.75km/h and printing "about 46 minutes" claims a precision the pace
  // itself doesn't have.
  const rounded = Math.round(minutes / 5) * 5;
  const withDetour =
    detourOneWay !== undefined && detourOneWay > 0
      ? Math.round((minutes + detourOneWay * 2) / 5) * 5
      : undefined;

  // OPTIONAL WALKING ON ITS OWN (17 Aug 2026). The threshold used to end
  // the sentence here whatever the detour was, so "Bruichladdich, by the
  // Loch" - two minutes of core walking, and an optional Museum of Islay
  // Life leg of 51 minutes each way - printed nothing at all. Anyone who
  // took the leg the narrative offers walked the best part of two hours
  // on a page that had said nothing about walking.
  //
  // So: a core under the line and a detour over it says the detour, and
  // says it as the detour - "Little on foot", because that is exactly
  // what the plan itself is. Both under the line still says nothing,
  // unchanged. The figure quoted is the same one the two-figure variant
  // below quotes (core plus the detour there and back), so "with the
  // detour" means the same thing wherever a reader meets it.
  if (minutes <= MINIMUM_WALKING_LINE_MINUTES) {
    if (withDetour === undefined || (detourOneWay as number) * 2 <= MINIMUM_WALKING_LINE_MINUTES) {
      return undefined;
    }
    return `Little on foot — ${spellMinutesShort(withDetour)} with the detour.`;
  }

  // A detour worth a decision takes the whole sentence: two figures and
  // nothing else. What the first figure is measured from is said once on
  // the page (walkingOriginNote) rather than in a line that has to carry
  // two numbers as well.
  //
  // "the detour" and not the stops' own names, deliberately: the names
  // are right there in the day's own stop list, and dropping them into
  // this clause needs an article ("the Museum of Islay Life", but not
  // "the Kildalton Cross") that no rule can pick correctly for every
  // name a Local Feature might have.
  if (withDetour !== undefined && withDetour - rounded >= MEANINGFUL_DETOUR_MINUTES) {
    return `${spellMinutesShort(rounded)} on foot — ${spellMinutesShort(withDetour)} with the detour.`;
  }

  const lead = `About ${spellMinutesShort(rounded)} on foot`;

  // A driving day with walking in it. The walking happens after you
  // park, so the sentence says so and names no transfer at all - the
  // drive out and back is the day's travel time, stated elsewhere, and
  // folding it in here would describe neither.
  if (!wholeDayWalked) {
    return `${lead} once you've parked.`;
  }

  if (walked.out && walked.back) {
    // Where the transfers were measured from, said in the visitor's
    // words and only as far as the line has room for - see
    // fittedOrigin. Without an authored origin this says nothing about
    // where it started: the Base is what a reader assumes anyway, and
    // naming it costs characters that buy nothing.
    const before = `${spellMinutesShort(rounded)} on foot from `;
    const origin = fittedOrigin(base?.transferOriginLabel, before, ", there and back.");
    return origin ? `${before}${origin}, there and back.` : `${lead}, there and back.`;
  }
  // One end walked and the other not. No published journey does this
  // today, but the two legs are stored and routed independently and
  // nothing stops it, so it says what it counted rather than rounding
  // the sentence up to a round trip.
  if (walked.out || walked.back) {
    const before = `${lead}, one way ${walked.out ? "from " : "back to "}`;
    const origin = fittedOrigin(base?.transferOriginLabel ?? base?.name, before, ".");
    return origin ? `${before}${origin}.` : `${lead}, counted one way.`;
  }
  // The transfer is driven, so this is the walking once the car is
  // parked - the same thing a driving day's figure describes, said the
  // same way.
  if (base?.transferMode === "drive") {
    return `${lead} once you've parked.`;
  }
  // No base at all: nothing has been said about getting there, so this
  // is only what the day walks between its own stops. The mileage that
  // used to ride along in brackets stays in the day's meta row, where it
  // already renders - it bought characters this line no longer has.
  return `${lead} between the stops.`;
}

/**
 * The one thing a walking line no longer has room to say: what its
 * figure was measured from, where that is not simply the Base.
 *
 * Every variant above is written to fit a phone, and the full authored
 * origin - "the pathway start by Port Ellen Primary School" - does not
 * fit inside any of them. It cannot just vanish: it exists so that a
 * reader cannot mistake a transfer measured from the pathway start for
 * one measured from the middle of Port Ellen, which is half a village
 * further on. So the page states it ONCE, next to the day's shape (or
 * once above a journey's days), and the lines themselves stay short.
 *
 * Undefined unless all of it is true at once: an authored origin exists,
 * this day actually prints a walking line, and that line's figure really
 * does include a walked transfer. On a driving day the figure is what
 * you walk once you have parked and the transfer is not in it, so the
 * note would be describing a number that isn't on the page.
 */
export function walkingOriginNote(day: HubDay, base?: DayBase): string | undefined {
  if (!base?.transferOriginLabel) return undefined;
  if (day.travelMode !== "walk") return undefined;
  const walked = transferLegsWalked(base);
  if (!walked.out && !walked.back) return undefined;
  if (!walkingLineFor(day, base)) return undefined;
  return `Times on foot are measured from ${base.transferOriginLabel}.`;
}

/**
 * Drive time for the whole day: base -> stop 1 -> ... -> stop N -> base
 * (§2.2), over the Day's own whole visiting order via
 * itineraryDayFromHubDay.
 *
 * It used to say, honestly, that this was an approximation: the data
 * model had no combined order spanning distilleries and features, so it
 * walked every distillery first and then every feature the narrative
 * linked. Day Stops now states one order for both (17 Aug 2026), so the
 * sequence here is the real one and the only remaining approximation is
 * the haversine fallback for any leg that has no stored routed figure.
 */
export function driveMinutesForDay(day: HubDay, base: { lat: number; lng: number }): number {
  return driveMinutesForItineraryDay(itineraryDayFromHubDay(day), {
    name: "your base",
    lat: base.lat,
    lng: base.lng,
  });
}

export type DayGroupId = "easy" | "mid" | "far" | "ferry";

export const GROUP_ORDER: DayGroupId[] = ["easy", "mid", "far", "ferry"];

/** §4.2's "base set" label set - the only variant needed here, since a
 *  base always defaults to FEATURED_STAYS[0] post-Phase-1 ("not a state
 *  that can occur" per the design doc). */
export const GROUP_LABELS: Record<DayGroupId, { title: string; sub: string }> = {
  easy: { title: "Close to your door", sub: "Little or no driving — the car can stay put" },
  mid: { title: "A short drive out", sub: "An hour or so on the road, all in" },
  far: { title: "Worth the drive", sub: "A proper day out — leave early" },
  ferry: { title: "Needs a ferry", sub: "The crossing sets your timings, not you" },
};

/** Buckets a day by drive time, per §4.2's table. */
export function dayGroupFor(day: HubDay, driveMinutes: number): DayGroupId {
  if (isFerryDay(day)) return "ferry";
  if (driveMinutes <= 30) return "easy";
  if (driveMinutes <= 70) return "mid";
  return "far";
}

/** Distilleries on this day the visitor said they'd like to see -
 *  ranking input only, per §4.1: "reorder... never remove a day." Names,
 *  not slugs, since that's what the card copy ("★ Includes Laphroaig")
 *  needs. */
export function pickHitsFor(day: HubDay, picks: string[]): string[] {
  if (picks.length === 0) return [];
  const hits: string[] = [];
  for (const stop of day.stops) {
    if (picks.includes(stop.distillery.slug) && !hits.includes(stop.distillery.name)) {
      hits.push(stop.distillery.name);
    }
  }
  return hits;
}

export function formatMoney(amount: number): string {
  return `£${(Math.round(amount * 100) / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/**
 * §4.3 pricing: never a bare number where a choice exists - `from £Npp`
 * when the cheapest available tour is the one currently on the day and a
 * dearer one exists, otherwise a flat `£Npp`.
 *
 * JUDGEMENT CALL / GAP FLAGGED: the spec's third state - `£130pp ·
 * upgraded` - means "the visitor has since changed this day away from
 * its default tour". That's inherently a per-visitor edit, and a HubDay
 * itself carries no such state (it's just "whatever tour Airtable's Day
 * Stop links" - there's no "original tour" to compare against once it's
 * been changed). Tracking "changed away from default" would need new
 * per-stop edit state on top of ItineraryStop, which is Phase-4-style
 * day-editing territory and out of scope here. Per the task brief's own
 * fallback instruction, this only ever computes the simpler from/flat
 * distinction - "upgraded" isn't reachable from this data model yet.
 */
export function dayPriceLabel(day: HubDay): string {
  const now = day.stops.reduce((sum, s) => sum + (s.tour?.price ?? 0), 0);
  if (now === 0) return "";
  const cheapest = day.stops.reduce((sum, s) => {
    const tours = s.distillery.tours;
    if (!tours || tours.length === 0) return sum;
    return sum + Math.min(...tours.map((t) => t.price));
  }, 0);
  const hasChoice = day.stops.some((s) => (s.distillery.tours?.length ?? 0) > 1);
  if (hasChoice && now === cheapest) return `from ${formatMoney(now)}pp`;
  return `${formatMoney(now)}pp`;
}

/**
 * One-line "hook" for a day card, per §3.2's card anatomy ("pace · drive
 * · price → title → route line → hook → one action").
 *
 * JUDGEMENT CALL: HubDay has no separate hook field of its own, only the
 * full `narrative` - the prototype's DAYS array has a distinct, hand-
 * written `hook` string per day, but the design doc's §2.2 "What is new"
 * list doesn't include a Hook field among the sanctioned Airtable
 * additions (only `anchor` and `closedDays`, both Phase 4 and explicitly
 * out of scope here). Adding one would be a schema change this task was
 * told not to make. So this derives a one-line hook from the first
 * sentence of the real, unedited narrative instead of fabricating new
 * copy - consistent with §1: "Nothing about the day narratives changes."
 */
function plainNarrative(narrative: string): string {
  return narrative.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

/** Fixed character budget for a card's teaser - see deriveHook's own
 *  comment for why this replaced a sentence-boundary cut. */
const HOOK_CHAR_LIMIT = 130;

export function deriveHook(narrative: string): string {
  const plain = plainNarrative(narrative);
  if (plain.length <= HOOK_CHAR_LIMIT) return plain;
  const cut = plain.slice(0, HOOK_CHAR_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > HOOK_CHAR_LIMIT * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}…`;
}

/** True when deriveHook() had to cut the narrative short - i.e. there's
 *  more of the same real narrative worth a "Read more" on the card.
 *  Added 10 Aug 2026 per Mark's feedback: cards were inconsistent -
 *  some Days open with a short, punchy first sentence ("Three legends,
 *  one road.") that read as the whole hook with nothing missing, others
 *  open with one very long first sentence (Laphroaig and the Mull of
 *  Oa's Bessie Williamson line) that got abruptly truncated with no way
 *  to see what was cut. Both cases actually have plenty more real
 *  narrative underneath - this + fullNarrativeText() let every card
 *  offer the same "Read more" affordance rather than only the ones that
 *  happened to get truncated by the old sentence-boundary logic. */
export function hasMoreNarrative(narrative: string): boolean {
  return plainNarrative(narrative).length > HOOK_CHAR_LIMIT;
}

/** Full plain-text narrative for a day card's expanded "Read more"
 *  state - same markdown-link-stripping as deriveHook so the teaser and
 *  the expansion read as one continuous piece of text, not two
 *  differently-rendered ones. */
export function fullNarrativeText(narrative: string): string {
  return plainNarrative(narrative);
}

/** §5 milestone copy, first match wins - verbatim from the copy deck. */
export function milestoneFor(opts: {
  dayCount: number;
  distilleryCount: number;
  nights: number;
  ferryDay: boolean;
}): string {
  const { dayCount, distilleryCount, nights, ferryDay } = opts;
  if (dayCount === 1) return "Day one. The rest is easier.";
  if (dayCount === nights) return `That is your ${nights} days filled — have a look at the shape of it.`;
  if (dayCount > nights) return `Day ${dayCount} — one more than you planned. No harm in options.`;
  if (distilleryCount >= 8) return `${distilleryCount} distilleries. More than most people manage in a week.`;
  if (distilleryCount >= 5) return `${distilleryCount} distilleries now — a proper spread of the island.`;
  if (ferryDay) return "A ferry day. That is a different island entirely.";
  return `Day ${dayCount} added — ${Math.max(0, nights - dayCount)} to go.`;
}

/** Trip bar summary line - "{n} days · {m} distilleries · {k} day(s)
 *  free", per §5/§10's copy deck. */
export function tripSummaryText(dayCount: number, distilleryCount: number, nights: number): string {
  const bits = [
    `${dayCount} ${dayCount === 1 ? "day" : "days"}`,
    `${distilleryCount} ${distilleryCount === 1 ? "distillery" : "distilleries"}`,
  ];
  const free = Math.max(0, nights - dayCount);
  if (free > 0) bits.push(free === 1 ? "one day free" : `${free} days free`);
  return bits.join(" · ");
}


// ─────────────────────────────────────────────────────────────────────────
// Trip review (Days/Trip flow Phase 3, docs/days-trip-flow-handoff.md
// §3.3) - everything above this line derives values for a catalog
// HubDay (against the visitor's answers, for /days' own ranked list).
// Trip review works against the visitor's REAL, editable trip
// (ItineraryDay[] from trip-context.tsx) instead, which has a different
// shape (accommodation is per-day, stops are the real ItineraryStop
// union of distillery/feature, there's no `pacing`/`mapDistilleries`
// field) - so these are parallel, ItineraryDay-shaped equivalents of the
// functions above, not the same functions reused. Kept in this file
// rather than a new one so every "per-day derived value" stays in one
// place, per the file's own original intent.
// ─────────────────────────────────────────────────────────────────────────

/** ItineraryDay equivalent of isFerryDay - same reasoning (isle-of-jura
 *  is the one distillery slug that genuinely needs a ferry crossing). */
export function isFerryDayItinerary(day: ItineraryDay): boolean {
  return day.stops.some((s) => s.kind === "distillery" && s.distillery.slug === "isle-of-jura");
}

/**
 * ItineraryDay equivalent of driveMinutesForDay: accommodation -> stop 1
 * -> ... -> stop N -> accommodation, using the same haversine estimate.
 * Every day gets an accommodation the moment it's created (addDay's own
 * fallback to FEATURED_STAYS[0]), so in practice `day.accommodation` is
 * always set by the time a day reaches trip review - the undefined
 * branch below is just a defensive fallback (stop-to-stop only, no
 * loop) for the theoretical case it isn't.
 */
export function driveMinutesForItineraryDay(day: ItineraryDay, base?: DayBase): number {
  const stopPoints = day.stops.map(stopCoords);
  if (stopPoints.length === 0) return 0;

  // Stop-to-stop legs prefer the stored routed value (legTravelMinutes).
  // The base legs have their own stored values now too, on the Journey
  // Days junction - resolveBaseLegs prefers those and falls back to the
  // same straight-line estimate this always used. `base` defaults to the
  // day's own accommodation, so a trip day behaves exactly as before;
  // callers pass one explicitly for a Day being read inside a Journey,
  // where the base is the Journey's, not the visitor's.
  const legs = resolveBaseLegs(base ?? accommodationBase(day), stopPoints[0], stopPoints[stopPoints.length - 1]);
  let total = legs.out ?? 0;
  for (let i = 1; i < stopPoints.length; i++) {
    total += legTravelMinutes(
      stopPoints[i - 1],
      stopPoints[i],
      day.stops[i].legMinutes,
      legModeFor(day.stops[i], day.travelMode)
    );
  }
  total += legs.back ?? 0;
  return total;
}

/** Sum of chosen tour prices for a real trip day. */
export function itineraryDayCost(day: ItineraryDay): number {
  return day.stops.reduce((sum, s) => sum + (s.kind === "distillery" ? s.tour?.price ?? 0 : 0), 0);
}

/** ItineraryDay equivalent of dayPriceLabel - same §4.3 from/flat rule,
 *  against the visitor's own chosen tours rather than a HubDay's default
 *  ones. */
export function itineraryDayPriceLabel(day: ItineraryDay): string {
  const now = itineraryDayCost(day);
  if (now === 0) return "";
  const cheapest = day.stops.reduce((sum, s) => {
    if (s.kind !== "distillery") return sum;
    const tours = s.distillery.tours;
    if (!tours || tours.length === 0) return sum;
    return sum + Math.min(...tours.map((t) => t.price));
  }, 0);
  const hasChoice = day.stops.some((s) => s.kind === "distillery" && (s.distillery.tours?.length ?? 0) > 1);
  if (hasChoice && now === cheapest) return `from ${formatMoney(now)}pp`;
  return `${formatMoney(now)}pp`;
}

/**
 * A real trip day's pace (Relaxed/Moderate/Packed), for the "shape of
 * your trip" strip and the Days list's numbered badge (§3.3 items 2/4).
 *
 * JUDGEMENT CALL: ItineraryDay carries no `pacing` field of its own
 * (unlike HubDay - editing a day is exactly what turns it from "a
 * HubDay" into "the visitor's own itinerary"). Where a day still traces
 * back to a real HubDay (`sourceHubDaySlug`), this inherits that HubDay's
 * own authored pacing - the best available signal, even if the day's
 * stops have since been edited (that's what the "YOUR VERSION" tag is
 * for, not a reason to discard the pacing). For a day with no source (or
 * whose source no longer resolves - hubDaysBySlug should always be built
 * from the same getDays() call passed to /trip), falls back to a simple
 * stop-count heuristic, since distillery-stop count is the dominant
 * driver of how full a day actually feels and mirrors the effective
 * shape of the existing HubDay pacing without inventing a new drive-time
 * threshold of its own.
 */
export function paceForItineraryDay(
  day: ItineraryDay,
  hubDaysBySlug: Map<string, HubDay>
): "Relaxed" | "Moderate" | "Packed" {
  const source = day.sourceHubDaySlug ? hubDaysBySlug.get(day.sourceHubDaySlug) : undefined;
  if (source && (source.pacing === "Relaxed" || source.pacing === "Moderate" || source.pacing === "Packed")) {
    return source.pacing;
  }
  const distilleryStops = day.stops.filter((s) => s.kind === "distillery").length;
  if (distilleryStops >= 3) return "Packed";
  if (distilleryStops === 2) return "Moderate";
  return "Relaxed";
}

/** Background/foreground pair behind PacingTag's own pace pill
 *  (DaysHubGrid.tsx) - pulled out here so trip review's pace badges use
 *  literally the same mapping rather than a second hand-copied one. */
export function paceTone(pacing: string): { bg: string; fg: string } {
  if (pacing === "Relaxed") return { bg: "var(--green-light)", fg: "var(--green-deep)" };
  if (pacing === "Moderate") return { bg: "var(--amber-pale)", fg: "var(--copper)" };
  return { bg: "#F7E6E0", fg: "#B5502E" };
}

/** Solid pace colour for the shape strip's bars and the Days list's
 *  numbered day badge (§3.3 items 2/4 - "coloured by pace"). Matches
 *  paceTone's own `fg` above exactly (--green-deep/--copper/#B5502E),
 *  just exposed as a single value for places that want a solid fill
 *  rather than a bg/fg pill pair. */
export function paceAccentColour(pacing: string): string {
  return paceTone(pacing).fg;
}

/** §3.3 item 2's editorial read-out under the shape strip. Two
 *  consecutive Packed days wins UNLESS the trip's first day is a ferry
 *  day, which always takes precedence (matches the reference
 *  prototype's own ordering: the back-to-back check runs first, but the
 *  ferry-first check is applied after and overwrites it if true). */
export function tripShapeNote(paces: string[], firstDayIsFerry: boolean): string {
  let note = "A steady rhythm — nothing back to back.";
  for (let i = 1; i < paces.length; i++) {
    if (paces[i] === "Packed" && paces[i - 1] === "Packed") {
      note = "Two full days back to back — consider swapping one down the list.";
      break;
    }
  }
  if (firstDayIsFerry) note = "The ferry day is first — fine, but it is the one day weather can ruin.";
  return note;
}

/** §5 "Collection copy by count" table, verbatim. */
export function collectionNote(count: number, total: number): string {
  if (count <= 0) return "";
  if (count === 1) return "One down. Most visitors manage three or four in a long weekend.";
  if (count <= 3) return "A good start — three or four is a comfortable weekend.";
  if (count <= 5) return "More than most people fit into a week here.";
  if (count <= 8) return "That is serious ground covered. Pace yourself.";
  if (count < total) return "All but a couple. The last ones are the awkward ones.";
  return "Every distillery on Islay. Very few people manage that in one trip.";
}

// ─────────────────────────────────────────────────────────────────────────
// §4.5 "edited days" / Phase 5 planner seam (docs/days-trip-flow-handoff.md
// §3.5, §10 "Planner"). Originally lived only inside TripReview.tsx as a
// private isDayEdited/resetDay pair - pulled out here, unchanged in logic,
// so the planner's context bar (Workspace.tsx) can reuse the exact same
// "does this day still match its source HubDay" comparison instead of a
// second hand-copied version, per the Phase 5 task brief's explicit
// instruction to extract rather than reimplement.
// ─────────────────────────────────────────────────────────────────────────

/**
 * A day counts as the visitor's own once its stops no longer match what
 * its source Hub Day would produce fresh - see the original comment on
 * this function (now here) from TripReview.tsx (Phase 3).
 */
export function isDayEdited(day: ItineraryDay, hub: HubDay): boolean {
  const original = itineraryDayFromHubDay(hub).stops.map(stopId);
  const current = day.stops.map(stopId);
  if (original.length !== current.length) return true;
  return original.some((id, i) => id !== current[i]);
}

/** Restores a day's stops to exactly what its original HubDay specifies,
 *  discarding any edits (§4.5, "Reset to the original" per §10's copy
 *  deck). Shared by trip review's own reset action and the planner's
 *  "Reset to the original" control - both need the identical
 *  remove-everything-then-replay-the-HubDay sequence, so this takes the
 *  handful of TripContext mutators it needs as a plain object rather than
 *  importing useTrip's return type here (keeps this file free of the
 *  "use client" trip-context import). */
export function resetDayToHub(
  dayIndex: number,
  currentStops: ItineraryStop[],
  hub: HubDay,
  actions: {
    removeStop: (dayIndex: number, id: string) => void;
    addStop: (dayIndex: number, distillery: Distillery, anchor?: boolean) => void;
    addFeatureStop: (dayIndex: number, feature: LocalFeature) => void;
    setTourForStop: (dayIndex: number, distillery: Distillery, tour: Tour | undefined) => void;
  }
): void {
  currentStops.map(stopId).forEach((id) => actions.removeStop(dayIndex, id));
  // Replayed in the Day's own order, features included - the same list
  // itineraryDayFromHubDay builds, so "reset to the original" restores
  // the order the day is published in rather than an all-distilleries-
  // first approximation of it.
  itineraryDayFromHubDay(hub).stops.forEach((s) => {
    if (s.kind === "distillery") {
      actions.addStop(dayIndex, s.distillery, s.anchor);
      if (s.tour) actions.setTourForStop(dayIndex, s.distillery, s.tour);
    } else {
      actions.addFeatureStop(dayIndex, s.feature);
    }
  });
}

/** One entry per stop that was in the original HubDay but has since been
 *  dropped from the visitor's real day - the planner's "{name} was in
 *  this day plan - put it back?" line (§3.5, §10 "Planner"). Carries the
 *  real Distillery/Tour or LocalFeature record so the "put it back"
 *  action can call addStop/addFeatureStop (+ setTourForStop) directly,
 *  same objects DaysHubGrid's own "+ Add this day to my trip" already
 *  uses. */
export interface DroppedHubStop {
  id: string;
  name: string;
  kind: "distillery" | "feature";
  distillery?: Distillery;
  tour?: Tour;
  feature?: LocalFeature;
}

export function droppedHubStops(day: ItineraryDay, hub: HubDay): DroppedHubStop[] {
  const current = new Set(day.stops.map(stopId));
  const dropped: DroppedHubStop[] = [];
  for (const s of itineraryDayFromHubDay(hub).stops) {
    if (current.has(stopId(s))) continue;
    if (s.kind === "distillery") {
      dropped.push({ id: s.distillery.slug, name: s.distillery.name, kind: "distillery", distillery: s.distillery, tour: s.tour });
    } else {
      dropped.push({ id: s.feature.id, name: s.feature.name, kind: "feature", feature: s.feature });
    }
  }
  return dropped;
}

/** One-line "what changed" summary vs the original HubDay - the
 *  planner's `Day {n} saved. {what changed}` confirmation (§10 "Planner").
 *  Deliberately a simple added/removed count, not a full diff (reordering
 *  and tour swaps aren't mentioned) - honest about what it's counting
 *  rather than claiming to describe every possible edit. */
export function describeHubDayChanges(day: ItineraryDay, hub: HubDay): string {
  const originalIds = new Set(itineraryDayFromHubDay(hub).stops.map(stopId));
  const currentIds = day.stops.map(stopId);
  let added = 0;
  for (const id of currentIds) if (!originalIds.has(id)) added++;
  const removed = droppedHubStops(day, hub).length;
  if (added === 0 && removed === 0) return "No changes from the original.";
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} stop${added > 1 ? "s" : ""} added`);
  if (removed > 0) parts.push(`${removed} dropped`);
  return `${parts.join(", ")}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Day screen (Days/Trip flow Phase 4, docs/days-trip-flow-handoff.md
// §3.4/§4.4/§10 "Day"). Reused by both /trip (TripReview.tsx's day rows,
// which now link into the day screen) and /trip/day/[index]
// (DayScreen.tsx) - kept here, not duplicated, per this file's own
// "every per-day derived value in one place" intent.
// ─────────────────────────────────────────────────────────────────────────

/** Best-effort honest title for a trip day - moved here from
 *  TripReview.tsx (Phase 3) so the day screen can use the exact same
 *  fallback logic rather than a second hand-copied version. HubDay has an
 *  authored name ("Ardbeg, on Foot") - a day that still traces back to
 *  one uses it. A day with no source (built freehand in the planner, or
 *  whose Hub Day no longer resolves) has no editorial name in the current
 *  data model, so this falls back to the stop names themselves rather
 *  than fabricating one - consistent with the brand-voice "no fabricated
 *  specifics" rule. */
export function dayTitle(day: ItineraryDay, hub: HubDay | undefined): string {
  if (hub) return hub.name;
  if (day.stops.length > 0) return day.stops.map(stopName).join(" → ");
  return day.label;
}

// ---- small ISO-date helpers - moved here from TripReview.tsx so the day
// screen can compute the same per-day calendar date without a second
// hand-copied version. Deliberately plain string/Date arithmetic, no date
// library, same approach used throughout this codebase. ----
export function addDaysIso(iso: string, days: number): Date | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDayDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Real calendar date for trip day `index`, given tripDates - null if no
 *  specific range is confirmed. A "month" answer (e.g. "September 2026")
 *  doesn't pin down which day of the month Day 1 is, so that mode (and
 *  the unset default) both fall back to null, same as TripReview's own
 *  rangeStart check. */
export function dateForDayIndex(tripDates: TripDates, index: number): Date | null {
  if (tripDates.mode !== "range" || !tripDates.confirmed || !tripDates.startDate) return null;
  return addDaysIso(tripDates.startDate, index);
}

/** §2.2's "Per-day derived values" - schedule(day): start 09:30, alternate
 *  drive-leg + visit-duration per stop, ending with a `home` time. Legs
 *  use the same haversine estimate as driveMinutesForItineraryDay; visit
 *  length per stop comes from stopVisitMinutes (distillery avgVisit / a
 *  feature's own duration / the flat feature default, or a visitor's
 *  customMinutes override - itinerary-stop.ts's existing single source of
 *  truth for "how long is this stop", reused rather than re-derived). */
/** The 09:30 in §2.2/§3.4 - now only the FALLBACK, used for any Day whose
 *  Airtable `Start Time` is blank. §8 open question 4 ("Start time - the
 *  schedule assumes 09:30. Should that be adjustable?") is answered: yes,
 *  per Day, in Airtable. */
export const DEFAULT_SCHEDULE_START_MINUTES = 9 * 60 + 30;

/** Parses a Day's `Start Time` ("13:00", "9:30") into minutes after
 *  midnight. Anything unparseable or out of range falls back to 09:30
 *  rather than throwing or silently producing a nonsense clock - a bad
 *  cell in Airtable should degrade to the documented default, not break
 *  the page. */
export function parseStartTimeMinutes(startTime?: string): number {
  return parseClockMinutes(startTime) ?? DEFAULT_SCHEDULE_START_MINUTES;
}

/** The same parse, but saying "there isn't one" rather than substituting
 *  a default - which is what a Day Stop's `Scheduled Time` needs: blank
 *  (much the commoner case) means "this stop has no published time",
 *  not "assume one". A cell that isn't a clock time is treated the same
 *  as blank: the stop keeps the chained behaviour rather than the page
 *  breaking on a typo. */
export function parseClockMinutes(value?: string): number | undefined {
  if (!value) return undefined;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

export interface ScheduleRow {
  stop: ItineraryStop;
  index: number;
  arrive: number; // minutes after midnight
  leave: number;
  dur: number;
  /** Travel minutes counted immediately before `arrive` - the leg in
   *  from the previous stop, or from the base for the first row. */
  travel: number;
  /** Minutes between the end of that travel and `arrive`: time the day
   *  does not account for, because this stop is pinned to a published
   *  clock time later than the moment you could have got here. Zero on
   *  every chained stop, which is every stop with no `Scheduled Time`. */
  free: number;
  /** True when `arrive` IS the stop's own `Scheduled Time` rather than a
   *  computed arrival. False when it has none - and false when it had
   *  one that couldn't be reached, in which case see `warnings`. */
  fixed: boolean;
}

/** A gap only worth saying out loud once it's long enough to be part of
 *  the day rather than rounding error - twenty minutes, matching the
 *  brief's own "over ~20 minutes". Measured on the FREE minutes, not the
 *  whole gap: half an hour of it walking over is travel, and the day
 *  already accounts for travel. */
export const MEANINGFUL_GAP_MINUTES = 20;

/** A day-level problem with the day's own content, for someone to fix -
 *  not something the reader can act on. Today there is exactly one: a
 *  `Scheduled Time` the day physically cannot reach (see
 *  scheduleForItineraryDay). Kept structured, with the copy in
 *  scheduleWarningLine below, so every page that renders a schedule says
 *  the same sentence about it - the same one-source rule that retired
 *  the hand-written `Day Timeline` field. */
export interface ScheduleWarning {
  kind: "scheduled-time-unreachable";
  /** The stop the impossible time was authored on. */
  stopName: string;
  /** The authored time. Deliberately NOT rendered as this stop's clock
   *  time anywhere - the schedule shows `earliest` instead - but named
   *  in the warning, because "which cell is wrong" is the whole point. */
  scheduled: number;
  /** The computed arrival that is being shown instead. */
  earliest: number;
}

export interface DaySchedule {
  rows: ScheduleRow[];
  /** Minutes after midnight the visitor actually sets off. Normally the
   *  Day's own `Start Time`, but pulled EARLIER where the first stop is
   *  pinned to a published time that couldn't otherwise be made: a
   *  10 o'clock tour thirty-eight minutes' walk from the bed means
   *  leaving at 9:22, not missing it. Never pushed later - a Start Time
   *  earlier than it needs to be is a real, honest wait at the first
   *  stop, and it shows as one. */
  depart: number;
  /** Minutes after midnight the visitor is back at their base - with no
   *  base at all (a Day read cold on /days/[slug]) the clock simply stops
   *  after the last stop's visit, with no final leg added. */
  home: number;
  /** The base this schedule was actually computed against, and the two
   *  legs it contributed - present only when there IS a base and at
   *  least one of its legs resolved. Lets a caller say "leaving Port
   *  Ellen at 9:30, back by 17:20" without re-deriving any of it, and
   *  lets one that has no base say nothing at all rather than printing a
   *  door-to-door claim it can't support. */
  base?: { name: string; out: number; back: number; originLabel?: string };
  /** Content errors in this day worth showing on the page - empty for
   *  every day whose times are consistent, which is nearly all of them. */
  warnings: ScheduleWarning[];
}

/**
 * `startMinutes` is the moment the day BEGINS - i.e. when the visitor
 * leaves their base, exactly as the original fixed 09:30 constant meant.
 * With a base set, the first stop's arrival is therefore start + the leg
 * in from the base; with no base (a published Day being read by someone
 * who has neither added it to a trip nor reached it through a Journey, so
 * there is no honest "your door" to travel from), the first stop's
 * arrival IS the start time. Callers pass parseStartTimeMinutes(
 * hub.startTime) - see scheduleForHubDay below.
 *
 * A stop carrying a `Scheduled Time` breaks the chain: it starts at
 * exactly that clock time, because a distillery tour runs when it is
 * published to run and not when the previous stop happens to release
 * you. Everything before it still travels; what is left over is the
 * visitor's own time, carried on the row as `free` so the page can say
 * so rather than leaving an unexplained hole. Every stop without one is
 * unchanged - previous stop's finish plus the travel leg - so a day with
 * no scheduled times anywhere computes exactly as it did before.
 *
 * `base` defaults to the day's own accommodation, which is what a real
 * trip day has. A Day read inside a Journey has no accommodation but does
 * have the Journey's Base, with real routed legs behind it - that comes
 * in through this parameter (see journeyBaseFor in journey-derivations).
 */
export function scheduleForItineraryDay(
  day: ItineraryDay,
  startMinutes: number = DEFAULT_SCHEDULE_START_MINUTES,
  base?: DayBase
): DaySchedule {
  const resolved = base ?? accommodationBase(day);
  const stopPoints = day.stops.map(stopCoords);
  const legs = resolveBaseLegs(resolved, stopPoints[0], stopPoints[stopPoints.length - 1]);

  // Setting off. The Day's own Start Time, unless the first stop is
  // pinned to a time you'd have to leave earlier to make - see
  // DaySchedule.depart. With no base leg the two are the same number
  // anyway, which is why a Day read cold on /days/[slug] is unaffected.
  const firstScheduled = parseClockMinutes(day.stops[0]?.scheduledTime);
  const depart =
    firstScheduled !== undefined
      ? Math.min(startMinutes, firstScheduled - (legs.out ?? 0))
      : startMinutes;

  const warnings: ScheduleWarning[] = [];
  let t = depart;
  let prevPoint: { lat: number; lng: number } | undefined;
  const rows: ScheduleRow[] = day.stops.map((stop, index) => {
    const point = stopPoints[index];
    // Stop-to-stop legs use the precomputed routed value when there is
    // one; the leg in from the base is whatever resolveBaseLegs could
    // honestly establish, and zero when it could establish nothing.
    const leg =
      index === 0
        ? legs.out ?? 0
        : legTravelMinutes(prevPoint ?? point, point, stop.legMinutes, legModeFor(stop, day.travelMode));
    // The soonest you could be here: travelling the moment the last stop
    // let you go. That is the whole schedule for a stop with no
    // published time, and the floor for one that has.
    const earliest = t + leg;
    const scheduled = parseClockMinutes(stop.scheduledTime);
    // A published time EARLIER than that is not a schedule, it is a
    // mistake in the day's own content - two tours that can't both be
    // made. The computed time stands (it is the only one that could
    // actually happen) and the clash is surfaced rather than hidden;
    // silently printing the impossible time would have the visitor turn
    // up to a tour that had already started.
    const reachable = scheduled !== undefined && scheduled >= earliest;
    if (scheduled !== undefined && !reachable) {
      warnings.push({
        kind: "scheduled-time-unreachable",
        stopName: stopName(stop),
        scheduled,
        earliest,
      });
    }
    const arrive = reachable ? scheduled : earliest;
    const dur = stopVisitMinutes(stop);
    const row: ScheduleRow = {
      stop,
      index,
      arrive,
      leave: arrive + dur,
      dur,
      travel: leg,
      // Whatever is left over once the travel is done - the visitor's
      // own time, not dead time the schedule should squeeze out.
      free: arrive - earliest,
      fixed: reachable,
    };
    t = arrive + dur;
    prevPoint = point;
    return row;
  });

  const home = day.stops.length > 0 ? t + (legs.back ?? 0) : t;
  // Only claim a door-to-door day when both ends of it are real.
  const baseSummary =
    resolved && legs.out !== undefined && legs.back !== undefined
      ? {
          name: resolved.name,
          out: legs.out,
          back: legs.back,
          // Carried so that anything printing these two legs' clock times
          // can name the point they run from, rather than implying the
          // Base. See DayBase.transferOriginLabel.
          originLabel: resolved.transferOriginLabel,
        }
      : undefined;
  return { rows, depart, home, base: baseSummary, warnings };
}

/** A gap length as prose - "1 hour 30 minutes" - rounded to the nearest
 *  five minutes, the same "these are estimates, not promises" rounding
 *  formatClockTime already applies to the times either side of it. */
export function spellGapMinutes(minutes: number): string {
  return spellMinutes(Math.max(5, Math.round(minutes / 5) * 5));
}

/** The one sentence for a gap in front of a stop, or undefined when
 *  there isn't a gap worth a line (see MEANINGFUL_GAP_MINUTES).
 *
 *  Says what the day's own data supports and stops: how long, when to
 *  when, and how much of it is the travel that was routed anyway. It
 *  deliberately does NOT name an activity - the day's narrative may well
 *  describe lunch somewhere, but nothing in the schedule knows that, and
 *  a made-up "lunch and a wander" on a day whose author meant something
 *  else is exactly the fabricated specific the brand voice rules out. An
 *  honest empty hour reads fine; an invented one doesn't.
 *
 *  `mode` is the DAY's Travel Mode; the verb printed over the travel
 *  inside the gap is this leg's own (legModeFor), because the leg being
 *  described may be the walked approach on an otherwise driven day. */
export function scheduleGapLine(row: ScheduleRow, mode?: TravelMode): string | undefined {
  if (row.free < MEANINGFUL_GAP_MINUTES) return undefined;
  const from = row.arrive - row.free - row.travel;
  const total = spellGapMinutes(row.free + row.travel);
  const legMode = legModeFor(row.stop, mode);
  const travelPart =
    row.travel > 0
      ? ` — about ${spellGapMinutes(row.travel)} of it ${legMode === "walk" ? "walking" : "driving"} over`
      : "";
  return `${formatClockTime(from)}–${formatClockTime(row.arrive)} · ${total} before ${stopName(
    row.stop
  )}${travelPart}. Nothing booked in it.`;
}

/** The one sentence for a day-level schedule warning. Rendered wherever
 *  a schedule is - the day screen and the journey strip both - because
 *  it is a fault in the content, and the person who can fix it should
 *  meet it on whichever page they happen to be reading. */
export function scheduleWarningLine(warning: ScheduleWarning): string {
  return `${warning.stopName} is down for ${formatClockTime(
    warning.scheduled
  )}, but the day can't get there before ${formatClockTime(
    warning.earliest
  )} — that later time is the one shown.`;
}

/**
 * A published HubDay expressed in the ItineraryDay shape, so that ONE
 * schedule/drive/grouping implementation serves both "this day is in my
 * trip" and "I'm just reading this day". Deliberately no accommodation:
 * a Day nobody has added to a trip has no base to drive from or home to,
 * and inventing one (the default Machrie, say) would print a departure
 * time for a journey the visitor never said they were making.
 *
 * Stop ORDER is now simply the Day's own, whole, authored order -
 * `hub.orderedStops`, distilleries and Local Features interleaved
 * exactly as the Day Stops table's `Order` states. That closes the gap
 * this function used to carry and flag: it built "every distillery
 * first, then every feature the narrative happened to link", so "Ardbeg,
 * on Foot" put the Old Kiln Cafe - which its narrative reaches on the
 * way OUT - after Ardbeg, and none of those feature legs existed at all.
 *
 * Features the narrative links but no Day Stop covers are still appended
 * at the end, unchanged: they have no authored position, so the end is
 * the only honest place for them, and dropping them would lose the map
 * pin they already earn today.
 *
 * `anchor` and `optional` are carried straight through from the Day
 * Stop's own checkboxes.
 */
export function itineraryDayFromHubDay(hub: HubDay): ItineraryDay {
  const ordered = hub.orderedStops;
  const orderedIds = new Set(ordered.map(stopId));
  return {
    id: `hub-${hub.slug}`,
    label: hub.name,
    sourceHubDaySlug: hub.slug,
    travelMode: hub.travelMode,
    stops: [
      ...ordered,
      ...hub.featureStops
        .filter((f) => !orderedIds.has(f.id))
        .map((f): ItineraryStop => ({ kind: "feature", feature: f })),
    ],
  };
}

/**
 * The schedule for a published Day, computed from its own `Start Time`.
 * This is what both /days/[slug] (for a day not in the visitor's trip)
 * and the "THE DAY" strip on /journeys/[slug] render - one function, so
 * the two pages cannot print different times for the same day. That
 * disagreement is exactly what the retired, hand-written `Day Timeline`
 * Airtable field used to cause.
 */
export function scheduleForHubDay(hub: HubDay, base?: DayBase): DaySchedule {
  return scheduleForItineraryDay(itineraryDayFromHubDay(hub), parseStartTimeMinutes(hub.startTime), base);
}

/** Formats minutes-after-midnight as "9:30", "13:10" - rounded to the
 *  nearest 5 minutes, matching the reference prototype's own `clock()`
 *  (schedule times are estimates, not to-the-minute promises). */
export function formatClockTime(minutes: number): string {
  const rounded = Math.round(minutes / 5) * 5;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export type PartOfDay = "Morning" | "Afternoon" | "Evening";

/** MORNING/AFTERNOON/EVENING boundaries for grouping the day screen's
 *  stops (§3.4 item 4 - "reasonable boundaries... use your judgement, not
 *  precisely specified"). Matches the reference prototype's own
 *  partOfDay() exactly: before 12:00 is Morning, 12:00-17:00 is
 *  Afternoon, after 17:00 is Evening - a plain, defensible 3-way split of
 *  a schedule that starts at 09:30. */
export function partOfDay(arriveMinutes: number): PartOfDay {
  if (arriveMinutes < 12 * 60) return "Morning";
  if (arriveMinutes < 17 * 60) return "Afternoon";
  return "Evening";
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** §4.4 closure warning: is this distillery closed on the given calendar
 *  date? Port Ellen is deliberately excluded even though its closedDays
 *  is also empty (see isAppointmentOnly below) - both blank for different
 *  reasons, so this alone can't tell them apart; callers should check
 *  isAppointmentOnly first (see DayScreen.tsx) rather than relying on
 *  this returning false for Port Ellen as if it were "open as normal". */
export function isDistilleryClosedOn(distillery: Distillery, date: Date): boolean {
  return distillery.closedDays.includes(date.getDay());
}

/** JUDGEMENT CALL: there's no dedicated "appointment only, no weekly
 *  pattern" flag in the data model (Port Ellen's closedDays is left blank
 *  for a structurally different reason than every other distillery's
 *  blank closedDays - see types.ts's doc comment on Distillery.closedDays
 *  and the Airtable field's own description). Rather than hardcode
 *  "slug === 'port-ellen'" (the isFerryDay precedent elsewhere in this
 *  file), this reads the distillery's own Hours text for "by appointment"
 *  - Port Ellen's Hours field is literally "By appointment only - no
 *  drop-in hours" - so it stays correct automatically if another
 *  appointment-only distillery is ever added, rather than being a
 *  one-off special case tied to a specific slug. */
export function isAppointmentOnly(distillery: Distillery): boolean {
  return distillery.hours.toLowerCase().includes("appointment");
}

/**
 * "Nearby, not yet in your day" (Days/Trip flow Phase 6, docs/days-trip-
 * flow-handoff.md §3.5/§6) - the mobile planner sheet's full-height
 * section. JUDGEMENT CALL, flagged per the task brief: the task assumed
 * this logic might already live in this file - it doesn't. The one real
 * precedent is DayScreen.tsx's inline swapAlternatives (Phase 4, §3.4
 * item 5/§8 open question 7): Local Features only, never other
 * distilleries, nearest-first by the same haversine drive-time estimate,
 * excluding whatever's already in the day. DayScreen.tsx is explicitly
 * out of scope for Phase 6, so that inline logic is left untouched
 * rather than refactored out into here - this mirrors its approach
 * (LocalFeature candidates only, same exclusion/estimate/sort) rather
 * than importing from it, applied against every stop already in the day
 * (nearest of ANY of them, not one single swap target - matching the
 * reference prototype's own planner-screen `nearby()`, which is the
 * right precedent for THIS particular section, as opposed to the day
 * screen's swap sheet). A day with no stops yet falls back to distance
 * from the accommodation, if one is set, so the section still has
 * something to suggest from before a first stop is added; with neither,
 * there is nothing to measure "nearby" against, so it returns empty.
 */
export function nearbyFeaturesForDay(
  day: ItineraryDay,
  localFeatures: LocalFeature[],
  limit = 4
): { feature: LocalFeature; mins: number }[] {
  const stopIds = new Set(day.stops.map((s) => stopId(s)));
  const fromPoints = day.stops.length > 0
    ? day.stops.map((s) => stopCoords(s))
    : day.accommodation
      ? [{ lat: day.accommodation.lat, lng: day.accommodation.lng }]
      : [];
  if (fromPoints.length === 0) return [];
  return localFeatures
    .filter((f) => !stopIds.has(f.id))
    .map((f) => ({
      feature: f,
      mins: Math.min(...fromPoints.map((p) => estimatedDriveMinutes(p, { lat: f.lat, lng: f.lng }))),
    }))
    .sort((a, b) => a.mins - b.mins)
    .slice(0, limit);
}
