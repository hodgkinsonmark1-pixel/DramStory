import type { Distillery, HubDay, ItineraryDay, ItineraryStop, LocalFeature, Tour } from "@/lib/types";
import { estimatedDriveMinutes } from "@/lib/drive-time";
import { stopCoords, stopId } from "@/lib/itinerary-stop";

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

/**
 * Drive time for the whole day: base -> stop 1 -> ... -> stop N -> base
 * (§2.2). Per the task brief, stop coordinates come from HubDay's own
 * mapDistilleries/mapFeatures fields - distilleries first, in their
 * curated stop order (mapDistilleries preserves `stops` order), then
 * feature stops in the order the narrative happens to link them
 * (mapFeatures has no independent route-order field). There's no single
 * combined "visiting order" spanning both in the current data model, so
 * this is an approximation - consistent with drive-time.ts's own
 * haversine estimate already being indicative rather than exact.
 */
export function driveMinutesForDay(day: HubDay, base: { lat: number; lng: number }): number {
  const points = [...(day.mapDistilleries ?? []), ...(day.mapFeatures ?? [])];
  if (points.length === 0) return 0;
  let total = estimatedDriveMinutes(base, points[0]);
  for (let i = 1; i < points.length; i++) {
    total += estimatedDriveMinutes(points[i - 1], points[i]);
  }
  total += estimatedDriveMinutes(points[points.length - 1], base);
  return total;
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
export function deriveHook(narrative: string): string {
  const plain = narrative.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  const match = plain.match(/^.*?[.!?](?=\s|$)/);
  let hook = match ? match[0] : plain;
  if (hook.length > 150) hook = `${hook.slice(0, 147).trimEnd()}…`;
  return hook.trim();
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
export function driveMinutesForItineraryDay(day: ItineraryDay): number {
  const stopPoints = day.stops.map(stopCoords);
  if (stopPoints.length === 0) return 0;
  const acc = day.accommodation;
  const points = acc ? [{ lat: acc.lat, lng: acc.lng }, ...stopPoints, { lat: acc.lat, lng: acc.lng }] : stopPoints;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += estimatedDriveMinutes(points[i], points[i + 1]);
  }
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
  const original = [...hub.stops.map((s) => s.distillery.slug), ...hub.featureStops.map((f) => f.id)];
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
    addStop: (dayIndex: number, distillery: Distillery) => void;
    addFeatureStop: (dayIndex: number, feature: LocalFeature) => void;
    setTourForStop: (dayIndex: number, distillery: Distillery, tour: Tour | undefined) => void;
  }
): void {
  currentStops.map(stopId).forEach((id) => actions.removeStop(dayIndex, id));
  hub.stops.forEach((s) => {
    actions.addStop(dayIndex, s.distillery);
    if (s.tour) actions.setTourForStop(dayIndex, s.distillery, s.tour);
  });
  hub.featureStops.forEach((f) => actions.addFeatureStop(dayIndex, f));
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
  for (const s of hub.stops) {
    if (!current.has(s.distillery.slug)) {
      dropped.push({ id: s.distillery.slug, name: s.distillery.name, kind: "distillery", distillery: s.distillery, tour: s.tour });
    }
  }
  for (const f of hub.featureStops) {
    if (!current.has(f.id)) {
      dropped.push({ id: f.id, name: f.name, kind: "feature", feature: f });
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
  const originalIds = new Set([...hub.stops.map((s) => s.distillery.slug), ...hub.featureStops.map((f) => f.id)]);
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
