import type { HubDay } from "@/lib/types";
import { estimatedDriveMinutes } from "@/lib/drive-time";

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
