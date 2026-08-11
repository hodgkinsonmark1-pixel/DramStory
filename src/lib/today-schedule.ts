import type { Distillery, LocalFeature } from "@/lib/types";
import { estimatedDriveMinutes, formatDuration, parseAvgVisitMinutes } from "@/lib/drive-time";
import { formatMoney, isAppointmentOnly, isDistilleryClosedOn, formatClockTime } from "@/lib/day-derivations";
import { TODAY_EXCLUDED_DISTILLERY_SLUGS } from "@/lib/journey-options";

/**
 * "On Islay today" - stops with arrival times (docs/hero-handoff.md
 * §4.2, Phase 4 of §9: "Read the clock; do not ask for it"). Everything
 * here is pure/derived, computed fresh against the current moment - none
 * of it is stored (§4.2: "Persists nowhere - it is a today thing"),
 * matching day-derivations.ts's own "computed, never stored" precedent
 * for the planning column.
 *
 * Reuses TODAY_EXCLUDED_DISTILLERY_SLUGS (Jura - a ferry crossing away,
 * already excluded from the /journey "today" flow for exactly this
 * reason) and isDistilleryClosedOn/isAppointmentOnly (day-derivations.ts)
 * rather than re-deriving any of that - a distillery that's shut today
 * or appointment-only has no business being suggested as a walk-in stop.
 */

/**
 * Approximate local-clock sunset for Islay (55.75N, 6.2W), by month
 * (0=January), already in whatever clock the visitor's own device shows
 * (BST/GMT self-corrects since this only needs to be roughly right, not
 * DST-exact down to the day the clocks change - the same "close enough
 * for trip planning" standard drive-time.ts's own haversine estimate
 * already uses, not a real astronomical calculation). Approximate
 * midpoints for each month, rounded to 5 minutes.
 */
const SUNSET_BY_MONTH: { hour: number; minute: number }[] = [
  { hour: 16, minute: 10 }, // Jan
  { hour: 17, minute: 15 }, // Feb
  { hour: 18, minute: 15 }, // Mar (BST starts late Mar - transitional)
  { hour: 20, minute: 15 }, // Apr
  { hour: 21, minute: 15 }, // May
  { hour: 22, minute: 15 }, // Jun
  { hour: 22, minute: 0 }, // Jul
  { hour: 21, minute: 0 }, // Aug
  { hour: 19, minute: 45 }, // Sep
  { hour: 18, minute: 0 }, // Oct (BST ends late Oct - transitional)
  { hour: 16, minute: 15 }, // Nov
  { hour: 15, minute: 45 }, // Dec
];

/** Minutes after midnight, for a given Date. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function sunsetMinutes(now: Date): number {
  const s = SUNSET_BY_MONTH[now.getMonth()];
  return s.hour * 60 + s.minute;
}

export { formatClockTime };

/** The tour to actually show for a same-day, walk-in visit: the
 *  SHORTEST option (most likely to still run and to fit a today plan -
 *  a 3-hour specialist tasting isn't the realistic pick for someone
 *  deciding this afternoon), price shown as "from £N" using the
 *  cheapest price among every tour of that same distillery (matches
 *  dayPriceLabel's own from/flat distinction elsewhere, simplified -
 *  this only ever needs the cheap case since it's always picking the
 *  shortest, most accessible tour). Undefined if the distillery has no
 *  tours listed at all. */
function representativeTour(distillery: Distillery): { minutes: number; label: string } | undefined {
  if (!distillery.tours || distillery.tours.length === 0) return undefined;
  const withMinutes = distillery.tours.map((t) => ({ tour: t, minutes: parseAvgVisitMinutes(t.duration) }));
  const shortest = withMinutes.reduce((a, b) => (b.minutes < a.minutes ? b : a));
  const cheapest = Math.min(...distillery.tours.map((t) => t.price));
  const priceLabel = distillery.tours.length > 1 ? `from ${formatMoney(cheapest)}` : formatMoney(cheapest);
  return { minutes: shortest.minutes, label: `${shortest.tour.name} runs ${formatDuration(shortest.minutes)}, ${priceLabel}` };
}

export type TodayStopKind = "distillery" | "feature";

export interface TodayStop {
  kind: TodayStopKind;
  distillery?: Distillery;
  feature?: LocalFeature;
  name: string;
  slug: string;
  href: string;
  /** "if you go now" / "after {previous stop}" / "if there's light". */
  label: string;
  arriveMinutes: number;
  driveMinutes: number;
  /** "12 min from you · Classic tour runs 60 min, from £22.50" /
   *  "12 min further east · free, no booking · a quiet end". */
  meta: string;
}

export interface TodaySchedule {
  stops: TodayStop[];
  nowMinutes: number;
  sunsetMinutes: number;
}

/** How many distillery stops to suggest, driven by time of day alone -
 *  not by season/sunset (11 Aug 2026, Mark: the previous sunset-driven
 *  budget was suggesting 2 distilleries at 17:20 in midsummer, since
 *  sunset itself was still hours away - but tours run on their own
 *  fixed daily schedule regardless of how much daylight is left, so
 *  "plenty of daylight" isn't the same as "still taking today's
 *  walk-ins"). Restores the flat clock-hour tiers the site used before
 *  Phase 4's sunset-based rework: before 13:00, up to two; 13:00 up to
 *  16:00, one; from 16:00, none - "likely closed for tours", Mark's own
 *  wording. Same two cutoffs JourneyFlow.tsx's seedTodayDay already
 *  uses for /journey's own today seed, so the two independent "today"
 *  implementations agree rather than drifting to different numbers. */
function distilleryBudget(nowMinutes: number): number {
  if (nowMinutes < 13 * 60) return 2;
  if (nowMinutes < 16 * 60) return 1;
  return 0;
}

/** How much of a buffer to leave before sunset before ruling out the
 *  trailing Local Feature stop below - that one genuinely is a daylight
 *  activity (a beach/viewpoint/walk), unlike a distillery tour, so it
 *  keeps using sunset rather than the clock-hour tiers above. Hours data
 *  is a freeform string (Distillery.hours), not structured open/close
 *  times, so this can't know a real "last entry" time for that case
 *  either way; sunset itself (minus a flat buffer) is the honest,
 *  available proxy there. */
const PRE_SUNSET_BUFFER_MINUTES = 30;

/**
 * Builds today's stop list: nearest-first distilleries from `village`
 * (an AREAS entry's coordinates) that are open today and not
 * appointment-only, up to however many distilleryBudget(now) allows for
 * the current clock hour - then, if there's still daylight left after
 * those, one more free/no-booking Local Feature nearest the last stop,
 * as the reference screenshot's "if there's light" row shows (that part
 * still genuinely depends on sunset - see PRE_SUNSET_BUFFER_MINUTES).
 */
export function buildTodaySchedule(opts: {
  now: Date;
  village: { lat: number; lng: number };
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
}): TodaySchedule {
  const { now, village, distilleries, localFeatures } = opts;
  const nowM = minutesOfDay(now);
  const sunsetM = sunsetMinutes(now);
  const cutoff = sunsetM - PRE_SUNSET_BUFFER_MINUTES;
  const budget = distilleryBudget(nowM);

  const candidates = distilleries
    .filter(
      (d) =>
        !TODAY_EXCLUDED_DISTILLERY_SLUGS.includes(d.slug) &&
        !isAppointmentOnly(d) &&
        !isDistilleryClosedOn(d, now)
    )
    .map((d) => ({ distillery: d, driveMinutes: estimatedDriveMinutes(village, d), tour: representativeTour(d) }))
    .filter((c): c is { distillery: Distillery; driveMinutes: number; tour: NonNullable<typeof c.tour> } =>
      Boolean(c.tour)
    )
    .sort((a, b) => a.driveMinutes - b.driveMinutes);

  const stops: TodayStop[] = [];
  let clock = nowM;
  let lastPoint = village;
  let lastName: string | null = null;

  for (const c of candidates) {
    if (stops.length >= budget) break;
    const drive = estimatedDriveMinutes(lastPoint, c.distillery);
    const arrive = clock + drive;
    stops.push({
      kind: "distillery",
      distillery: c.distillery,
      name: c.distillery.name,
      slug: c.distillery.slug,
      href: `/distilleries/${c.distillery.slug}`,
      label: lastName ? `after ${lastName}` : "if you go now",
      arriveMinutes: arrive,
      driveMinutes: drive,
      meta: `${formatDuration(drive)} ${lastName ? "back along the road" : "from you"} · ${c.tour.label}`,
    });
    clock = arrive + c.tour.minutes;
    lastPoint = c.distillery;
    lastName = c.distillery.name;
  }

  // Trailing free/no-booking stop once the distillery day is done, same
  // "quiet end" shape as the reference screenshot - only the categories
  // that genuinely read as free-and-drop-in (a viewpoint/beach/gem/
  // historic site), never a pub/cafe/restaurant/golf/spa/transport
  // listing, which all imply a booking, a bill, or aren't a "stop" at
  // all in that sense.
  const FREE_CATEGORIES = new Set(["beach", "walk", "bike-route", "local-gem", "historic-site", "attraction-gem"]);
  if (clock < cutoff) {
    const feature = localFeatures
      .filter((f) => FREE_CATEGORIES.has(f.category))
      .map((f) => ({ feature: f, driveMinutes: estimatedDriveMinutes(lastPoint, f) }))
      .sort((a, b) => a.driveMinutes - b.driveMinutes)[0];
    if (feature) {
      const arrive = clock + feature.driveMinutes;
      stops.push({
        kind: "feature",
        feature: feature.feature,
        name: feature.feature.name,
        slug: feature.feature.slug,
        href: `/explore/${feature.feature.slug}`,
        label: "if there's light",
        arriveMinutes: arrive,
        driveMinutes: feature.driveMinutes,
        meta: `${formatDuration(feature.driveMinutes)} further on · free, no booking · a quiet end`,
      });
    }
  }

  return { stops, nowMinutes: nowM, sunsetMinutes: sunsetM };
}
