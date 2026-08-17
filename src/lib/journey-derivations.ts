import type { HubDay, Journey } from "@/lib/types";
import { isFerryDay, type DayBase } from "@/lib/day-derivations";

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
  const dayCount = journey.days.length;
  if (journeyFullyWalkable(journey)) {
    const totalMiles = journey.days.reduce((sum, d) => sum + (parseMiles(d.distanceOnFoot) ?? 0), 0);
    if (totalMiles > 0) {
      return {
        value: `${totalMiles}`,
        label: `${totalMiles === 1 ? "mile" : "miles"} on foot across ${dayCount} ${
          dayCount === 1 ? "day" : "days"
        }`,
      };
    }
  }
  // Not fully walkable: a mileage here would have to be invented, so the
  // stat becomes the day count instead, qualified by the real pacing mix
  // already on each Day record.
  const pacing = journeyPacingSummary(journey);
  return {
    value: `${dayCount}`,
    label: pacing ? `${dayCount === 1 ? "day" : "days"}, ${pacing}` : dayCount === 1 ? "day" : "days",
  };
}

/** Plain-English summary of the pacing mix across a Journey's Days, from
 *  each Day's own Pacing field - "all relaxed" when they agree, otherwise
 *  the span ("relaxed to packed"). Empty string when no Day has a pacing
 *  set, so callers can drop the clause rather than print an empty one. */
export function journeyPacingSummary(journey: Journey): string {
  const ORDER = ["Relaxed", "Moderate", "Packed"];
  const present = ORDER.filter((p) => journey.days.some((d) => d.pacing === p));
  const unknown = journey.days.some((d) => !ORDER.includes(d.pacing));
  if (present.length === 0) return "";
  if (present.length === 1) return unknown ? present[0].toLowerCase() : `all ${present[0].toLowerCase()}`;
  return `${present[0].toLowerCase()} to ${present[present.length - 1].toLowerCase()}`;
}

/** Claim-band stat 1's two-line label. Two nights in one place is worth
 *  saying out loud ("both in Port Ellen"); three or more isn't. */
export function journeyNightsStatLabel(journey: Journey): string {
  const noun = journey.nights === 1 ? "night" : "nights";
  if (!journey.base) return noun;
  if (journey.nights === 2) return `nights, both in ${journey.base}`;
  return `${noun} in ${journey.base}`;
}

/** Claim-band stat 2's two-line label - "all within walking" is only ever
 *  claimed when every single Day has a real Distance on Foot. */
export function journeyDistilleryStatLabel(journey: Journey): string {
  const noun = journeyDistilleryCount(journey) === 1 ? "distillery" : "distilleries";
  return journeyFullyWalkable(journey) ? `${noun}, all within walking` : `${noun} across the route`;
}

/** Sum of a single Day's linked Tour prices - the "£Npp in tours" half of
 *  a day card's meta line. Zero when nothing on the day is priced, in
 *  which case the card omits the clause rather than printing "£0pp". */
export function dayTourTotal(day: HubDay): number {
  return day.stops.reduce((sum, stop) => sum + (stop.tour?.price ?? 0), 0);
}

/** "NIGHT ONE"/"NIGHT TWO" - the night connector spells its ordinal out
 *  rather than showing a numeral. Falls back to the numeral past ten,
 *  which no real Journey reaches (the longest is 6 nights). */
export function ordinalWord(n: number): string {
  const WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"];
  return WORDS[n - 1] ?? `${n}`;
}

/** Splits a night note so its final sentence can be rendered bold, per
 *  the design - the emphasis is the last actionable beat ("Book it when
 *  you book the room."). Returns the whole note as `lead` with no `last`
 *  when there's only one sentence, so nothing is emphasised by default. */
export function splitFinalSentence(note: string): { lead: string; last: string } {
  const trimmed = note.trim();
  const matches = [...trimmed.matchAll(/[^.!?]+[.!?]+(\s|$)/g)];
  if (matches.length < 2) return { lead: trimmed, last: "" };
  const lastMatch = matches[matches.length - 1];
  const start = lastMatch.index ?? 0;
  return { lead: trimmed.slice(0, start), last: trimmed.slice(start).trim() };
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

// ─────────────────────────────────────────────────────────────────────────
// Base legs (17 Aug 2026). A Journey states where the visitor sleeps, so
// inside a Journey a day genuinely does start and end at a bed - and the
// travel to and from it is real travel that used to go uncounted. The
// routed figures come from the Journey Days junction (see
// scripts/compute-journey-base-legs.mjs); this is just the lookup that
// hands the right pair to the day-derivations schedule.
//
// Nothing here invents a base. /days/[slug] read cold - no journey, no
// trip - still gets undefined, and still honestly says "driving between
// stops" with the clock starting at the first stop.
// ─────────────────────────────────────────────────────────────────────────

/** The base to compute day `dayIndex` of this Journey against, or
 *  undefined when the Journey names no Base at all.
 *
 *  `coords` is the Base's own position, used only as the per-leg fallback
 *  when a routed figure is missing - the caller supplies it because
 *  resolving a Base name to a record needs the Areas/Featured Stays
 *  tables, which this pure derivation deliberately doesn't fetch. With no
 *  coords and no routed leg there is simply no leg, which is the honest
 *  outcome rather than a guessed one. */
export function journeyBaseFor(
  journey: Journey,
  dayIndex: number,
  coords?: { lat: number; lng: number }
): DayBase | undefined {
  if (!journey.base) return undefined;
  const legs = journey.dayBaseLegs[dayIndex];
  return {
    name: journey.base,
    lat: coords?.lat,
    lng: coords?.lng,
    fromBaseMinutes: legs?.fromBaseMinutes,
    toBaseMinutes: legs?.toBaseMinutes,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// "Take this journey" cost breakdown (17 Aug 2026). Every figure below is
// indicative and computed from a real Airtable value - there is no
// default rate, no derived rate, and nothing is ever borrowed from
// another Journey. A missing rate produces a pending state, which is the
// site's standing rule (docs/project-conventions.md: unsourced numbers
// get a pending state rather than a guess).
// ─────────────────────────────────────────────────────────────────────────

/** Accommodation for the whole stay as an honest RANGE - off-season rate
 *  × nights to peak rate × nights. Undefined unless BOTH ends are real
 *  and there is at least one night: half a range is not a range, and a
 *  single number here would read as "the price" for something that
 *  genuinely doubles between February and the Islay Festival. */
export function journeyAccommodationRange(
  journey: Journey
): { low: number; high: number; nights: number } | undefined {
  const { accommodationFromPerNight: from, accommodationPeakPerNight: peak, nights } = journey;
  if (from === undefined || peak === undefined || nights <= 0) return undefined;
  return { low: from * nights, high: peak * nights, nights };
}

/** Car hire, which has THREE states, not two - and the difference between
 *  the last two matters:
 *   - priced:     a real per-day rate × this journey's days
 *   - not-needed: no rate AND every day walkable end to end. The South
 *                 Coast Walk needs no car, and saying so is a feature.
 *   - pending:    no rate, and the journey does involve driving. We don't
 *                 know what it costs, so we say that instead of implying
 *                 a car isn't needed. */
export function journeyCarHire(journey: Journey): { kind: "priced"; total: number } | { kind: "not-needed" } | { kind: "pending" } {
  const perDay = journey.carHirePerDay;
  if (perDay !== undefined && journey.days.length > 0) {
    return { kind: "priced", total: perDay * journey.days.length };
  }
  if (perDay === undefined && journeyFullyWalkable(journey)) return { kind: "not-needed" };
  return { kind: "pending" };
}
