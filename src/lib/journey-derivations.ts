import type { HubDay, Journey } from "@/lib/types";
import { isFerryDay } from "@/lib/day-derivations";

/**
 * Derived values for the rebuilt /journeys/[slug] page (13 Aug 2026) - the
 * claim band's stats, the day spine's tag chips, and the night-connector
 * placement/text. Kept in its own file (rather than folded into the much
 * larger day-derivations.ts) since these are Journey-shaped, not HubDay/
 * ItineraryDay-shaped, and this rebuild is a self-contained pass.
 *
 * JUDGEMENT CALL, flagged: the task brief asked for the day-card tag
 * chips to reuse "the existing chip-generation logic already in
 * DaysHubGrid.tsx (things like 'Nobody has to drive', 'Driver keeps N
 * dram(s)', 'No bus route')". That logic does not exist anywhere in this
 * codebase - grepped DaysHubGrid.tsx, day-derivations.ts, every other
 * component under src/components/journeys, and every doc under docs/ for
 * those exact phrases and for "chip" generally; DaysHubGrid.tsx's own
 * comment block (lines 38-46) says it deliberately DROPPED a chip row
 * entirely when this file was last rebuilt. Rather than block on a
 * premise that doesn't hold, dayChips() below derives 1-2 honest chips
 * from real per-day fields only (Distance on Foot, ferry status, stop
 * count) - never fabricated copy like "Driver keeps N drams" or "No bus
 * route", which would need data (miniatures policy, bus timetables) that
 * doesn't exist on any record.
 */

/** Unique distilleries visited across every Day in a Journey, counted
 *  from the Days' own resolved Day Stops (never hardcoded) - the claim
 *  band's "distilleries" stat. */
export function journeyDistilleryCount(journey: Journey): number {
  const slugs = new Set<string>();
  for (const day of journey.days) {
    for (const stop of day.stops) slugs.add(stop.distillery.slug);
  }
  return slugs.size;
}

/** True only when every Day in the Journey has a genuine Distance on Foot
 *  value - the gate for both the claim band's "miles on foot" stat and
 *  the sidebar's "Car hire: Not needed" line. */
export function journeyFullyWalkable(journey: Journey): boolean {
  return journey.days.length > 0 && journey.days.every((d) => !!d.distanceOnFoot);
}

/** First number found in a "Distance on Foot" string, e.g. "2 miles" -> 2.
 *  Undefined if nothing numeric is found - callers should already be
 *  gating on journeyFullyWalkable before summing, so this is a defensive
 *  fallback rather than the primary check. */
function parseMiles(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const match = text.match(/[\d.]+/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

/** The claim band's third stat. Real, summed mileage ("6 miles on foot")
 *  when every Day has Distance on Foot set - never a fabricated figure
 *  otherwise. Falls back to a plain day count when the journey isn't
 *  fully walkable (some days are driving days), per the task brief's own
 *  "fall back to something sensible like day count" instruction. */
export function journeyThirdStat(journey: Journey): { value: string; label: string } {
  if (journeyFullyWalkable(journey)) {
    const totalMiles = journey.days.reduce((sum, d) => sum + (parseMiles(d.distanceOnFoot) ?? 0), 0);
    if (totalMiles > 0) {
      return { value: `${totalMiles}`, label: totalMiles === 1 ? "mile on foot" : "miles on foot" };
    }
  }
  const dayCount = journey.days.length;
  return { value: `${dayCount}`, label: dayCount === 1 ? "day on the road" : "days on the road" };
}

/** Sum of every Day Stop's linked Tour price, across every Day in the
 *  Journey - the sidebar's "Take this Journey" total and the claim band's
 *  indicative cost. Real, computed from the Days' own resolved stops. */
export function journeyTourTotal(journey: Journey): number {
  return journey.days.reduce(
    (sum, day) => sum + day.stops.reduce((s, stop) => s + (stop.tour?.price ?? 0), 0),
    0
  );
}

/** 1-2 honest, data-derived tag chips for a spine day card. See this
 *  file's own doc comment above for why this isn't the "Driver keeps N
 *  drams"-style copy the task brief described - that logic doesn't exist
 *  in this codebase, and there's no data (miniatures policy, bus
 *  timetables) to fabricate it from. */
export function dayChips(day: HubDay): string[] {
  const chips: string[] = [];
  if (day.distanceOnFoot) chips.push("No car needed");
  if (isFerryDay(day)) chips.push("Ferry crossing");
  if (chips.length < 2) {
    if (day.stops.length > 1) chips.push(`${day.stops.length} distilleries in one day`);
    else if (day.stops.length === 1 && day.pacing === "Relaxed") chips.push("One distillery, no rush");
  }
  return chips.slice(0, 2);
}

/** One line of accommodation copy for night number `n` (1-indexed) -
 *  Night Notes' own line n, repeating the last line if there are fewer
 *  lines than Nights (per the Airtable field's documented fallback rule),
 *  or the Journey's Accommodation Note (repeated every night) if Night
 *  Notes is blank entirely. */
export function nightNoteFor(journey: Journey, n: number): string {
  const lines = journey.nightNotesLines;
  if (lines.length > 0) {
    const idx = Math.min(n - 1, lines.length - 1);
    return lines[idx];
  }
  return journey.accommodationNote;
}

/** Which night numbers (1-indexed) should be shown as a connector AFTER
 *  the day card at `dayIndex` (0-indexed), for a Journey with `dayCount`
 *  days and `nights` total nights.
 *
 *  JUDGEMENT CALL, flagged: the task brief says connectors go "between
 *  day cards, for each night" but Nights is an independent editorial
 *  number that doesn't always equal dayCount - 1 (e.g. The Islay Grand
 *  Tour: 5 days, 6 nights; The South Coast Walk: 2 days, 2 nights - both
 *  confirmed against the real Airtable records, not assumed). A purely
 *  literal "one connector per gap" reading would silently drop real,
 *  already-written Night Notes content (South Coast Walk's second line,
 *  "Same bed both nights...", has nowhere to go if only 1 gap is
 *  rendered for its 2 nights). This fills each of the (dayCount - 1) gaps
 *  between cards first (Night 1, 2, ...), then appends any remaining
 *  nights after the LAST day card - read as the trailing night(s) before
 *  departure, which is the one placement that doesn't require inventing
 *  an unstated arrival night before Day 1. */
export function nightSlotsForDay(dayIndex: number, dayCount: number, nights: number): number[] {
  const gaps = Math.max(dayCount - 1, 0);
  const slots: number[][] = Array.from({ length: dayCount }, () => []);
  let n = 1;
  for (let g = 0; g < gaps && n <= nights; g++, n++) {
    slots[g].push(n);
  }
  while (n <= nights) {
    slots[dayCount - 1].push(n);
    n++;
  }
  return slots[dayIndex] ?? [];
}
