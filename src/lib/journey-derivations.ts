import type { Distillery, HubDay, Journey, Tour } from "@/lib/types";
import { isFerryDay, type DayBase } from "@/lib/day-derivations";
import { formatPrice, isPlaceholderTour } from "@/lib/pricing";

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
 *  saying out loud ("both in Port Ellen"); three or more isn't.
 *
 *  Counts PRICED nights only (`Nights`), never the authored Night Notes
 *  lines. Since 30 Aug 2026 no journey authors more lines than it
 *  prices, so the two agree everywhere today - the distinction is kept
 *  because it is the honest rule, not because a journey exercises it. */
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
  // The `${n} distilleries in one day` chip was dropped here (17 Aug
  // 2026, the site owner's call): the day card's pace tile now prints
  // that same count as its numeral, with the Day's own Tile Caption
  // beside it, so the chip was saying a second time what the tile
  // already says. Everything else a chip can say is something the tile
  // does not - what the day needs (no car), what it involves (a ferry),
  // how it feels (no rush) - and stays.
  if (chips.length < 2 && day.stops.length === 1 && day.pacing === "Relaxed") {
    chips.push("One distillery, no rush");
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

/** One night's slot in the spine - its 1-indexed number, and whether it
 *  is a night the visitor may simply not take (and is not charged for). */
export type NightSlot = { night: number; optional: boolean };

/** How many nights a journey RENDERS, and how many of them it PRICES.
 *
 *  `Nights` on the Journeys table is the number of PRICED nights (17 Aug
 *  2026 - the site owner's own definition). `Night Notes` is one line per
 *  night the journey actually offers, which can be one longer: the Grand
 *  Tour prices five and offers six, the sixth being a genuine choice
 *  ("the ferry runs after the Port Ellen tour if you want it").
 *
 *  So the spine renders one night per authored line, and everything past
 *  `priced` is optional. Where there are FEWER lines than priced nights
 *  the count still comes from `Nights` and nightNoteFor repeats the last
 *  line, which is that field's own documented fallback - a journey never
 *  renders fewer beds than it charges for. */
export function journeyNightCounts(journey: Journey): { total: number; priced: number } {
  const priced = Math.max(0, journey.nights);
  return { total: Math.max(priced, journey.nightNotesLines.length), priced };
}

/**
 * WHERE THE NIGHTS GO (rewritten 17 Aug 2026, to the site owner's own
 * structure). The order is not a guess any more, and the two functions
 * below are the whole of it:
 *
 *   night one  -> BEFORE day one. It is the arrival night: you land,
 *                 you eat, tomorrow starts early. Every journey's first
 *                 Night Notes line is now written that way.
 *   night n+1  -> after day n, for every day EXCEPT the last.
 *   any more   -> after the last day, and only where the journey has
 *                 more nights than that structure needs. Those are the
 *                 optional ones: the ferry goes after the last tour if
 *                 you want it.
 *
 * OPTIONAL is a PRICING fact, not a positional one (17 Aug 2026): a slot
 * is optional when its number is past `Nights`, the count of priced
 * nights - which is also what the sidebar's accommodation range and the
 * claim band's nights stat are built from, so a night nobody has to take
 * is never billed and never counted. Placement is separate, and comes
 * from the day count above.
 *
 * All four real journeys line up: Grand Tour 4 days, 5 authored nights,
 * 5 priced - the Port Ellen day was unlinked on 30 Aug 2026 and the day
 * after the last one became the sail home from Port Askaig, so there is
 * no optional night on any journey any more; Kildalton Road 2/2/2;
 * Rhinns Trail 3/3/3; Hidden Coast 2/2/2.
 *
 * What this replaces, and why: the first version packed the nights into
 * the gaps BETWEEN day cards and then appended whatever was left over
 * after the last one. On the Grand Tour that put nights five AND six
 * after day five, and since nightNoteFor repeats the last authored line
 * once it runs out, both printed the same sentence. There was no arrival
 * night at all, so every note sat one day later than the copy it was
 * written for. The pass after that fixed the order but drove the count
 * from `Nights` alone, which - now that `Nights` means priced nights -
 * dropped the Grand Tour's sixth note off the page entirely.
 *
 * Deliberately tolerant of numbers no journey currently has: fewer
 * nights than days simply runs out of connectors (a day with no night
 * after it renders none), and more than dayCount + 1 renders each
 * surplus night as its own card after the last day rather than silently
 * dropping copy that was written for it.
 */

/** Nights rendered BEFORE the day card at `dayIndex`. Only day one ever
 *  has one, and it is night one - the night you arrive. */
export function nightsBeforeDay(
  dayIndex: number,
  dayCount: number,
  nights: { total: number; priced: number }
): NightSlot[] {
  if (dayIndex !== 0 || dayCount < 1 || nights.total < 1) return [];
  return [{ night: 1, optional: 1 > nights.priced }];
}

/** Nights rendered AFTER the day card at `dayIndex`. */
export function nightsAfterDay(
  dayIndex: number,
  dayCount: number,
  nights: { total: number; priced: number }
): NightSlot[] {
  if (dayCount < 1) return [];
  if (dayIndex < dayCount - 1) {
    // Day one is followed by night two, day two by night three, and so
    // on - night one having already been spent before day one.
    const night = dayIndex + 2;
    return night <= nights.total ? [{ night, optional: night > nights.priced }] : [];
  }
  // The last day. There is no night after it in the plan; anything the
  // journey still has left is the choice between one more night and the
  // boat home, and is marked as such rather than presented as a step.
  const slots: NightSlot[] = [];
  for (let night = dayCount + 1; night <= nights.total; night++) {
    slots.push({ night, optional: night > nights.priced });
  }
  return slots;
}

/* splitTileCaption lived here from 17-18 Aug 2026 and is DELETED with
   paceTileTone, for the same reason: it broke a Day's `Tile Caption`
   across the two lines of a pace tile that no longer exists. The
   Airtable field and HubDay.tileCaption both stay - the copy in them is
   real, and nothing about removing a layout justifies dropping authored
   content from the data layer. */

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
    fromBaseWalked: legs?.fromBaseWalked,
    toBaseWalked: legs?.toBaseWalked,
    // The JOURNEY's transfer mode, never the Day's travel mode - see
    // Journey.transferMode. It is what those two stored legs were routed
    // with, so it is the only mode that describes them.
    transferMode: journey.transferMode,
    // The authored origin these legs were routed from, where the journey
    // has one - so every sentence built on them can say what it measured
    // rather than letting the reader assume the Base. Undefined for the
    // three journeys with no override, which keeps their existing copy.
    transferOriginLabel: journey.transferOriginLabel,
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
 *  genuinely doubles between February and the Islay Festival.
 *
 *  `nights` here is the Journey's `Nights`, which is the count of PRICED
 *  nights and deliberately not the number of nights the spine renders
 *  (17 Aug 2026). No journey offers more than it prices today - the
 *  Grand Tour's optional sixth went with the Port Ellen day on 30 Aug
 *  2026 - so this quotes the same number the spine renders. The rule
 *  stands for the next journey that needs it: charging for a night the
 *  page itself calls optional would be the sort of quiet padding this
 *  sidebar exists to avoid. */
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
 *   - not-needed: no rate AND every day walkable end to end. The
 *                 Kildalton Road needs no car, and saying so is a
 *                 feature.
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

// ─────────────────────────────────────────────────────────────────────────
// THE FLOOR, AND WHAT IT COSTS (18 Aug 2026, to the site owner's build
// spec for /journeys/[slug]).
//
// One rule governs everything below: no money figure on that page is ever
// typed. The claim band's "from £N", every day card's "starts at", the
// proportion bar and all four summary figures are computed from the same
// two inputs - the tour each Day Stop actually books, and the cheapest
// publishable tour at that distillery (Journey.standardTourFloor, built
// in the data layer against isPublishableTour so a Placeholder row can
// never become a lower bound).
//
// The spec's own worked example said "from £395". These functions return
// £435.50 for the same journey off today's records. That is not a bug to
// paper over with a constant: it is the arithmetic the page now shows its
// working for, and it moves the moment a tour price does.
// ─────────────────────────────────────────────────────────────────────────

/** Every distillery this journey visits, by slug, in first-visit order
 *  and without repeats - the set the floor is summed over, and the same
 *  set journeyDistilleryCount counts. */
export function journeyDistillerySlugs(journey: Journey): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const day of journey.days) {
    for (const stop of day.stops) {
      if (seen.has(stop.distillery.slug)) continue;
      seen.add(stop.distillery.slug);
      slugs.push(stop.distillery.slug);
    }
  }
  return slugs;
}

/** A floor is only a floor if every distillery under it has one. `total`
 *  is the sum of the cheapest publishable tour at each distillery in the
 *  journey; `complete` is false the moment one of them has no publishable
 *  priced tour at all, in which case the total is a sum of SOME of them
 *  and callers must not print "from" against it - they show nothing,
 *  which is the site's standing rule for an unsourced number.
 *
 *  Deliberately per-DISTILLERY, not per-stop: a journey that visited the
 *  same distillery twice would only ever pay its floor once here, and no
 *  claim band should imply otherwise. */
export function journeyTourFloor(journey: Journey): { total: number; complete: boolean } {
  const slugs = journeyDistillerySlugs(journey);
  let total = 0;
  let complete = slugs.length > 0;
  for (const slug of slugs) {
    const price = journey.standardTourFloor[slug];
    if (price === undefined) {
      complete = false;
      continue;
    }
    total += price;
  }
  return { total, complete };
}

/** The same sum for ONE day - what this day would cost if you booked the
 *  cheapest thing going at each of its distilleries instead of what the
 *  journey picked. Only distilleries the day actually books a tour at are
 *  counted, so a day that walks past a distillery without going in isn't
 *  charged a floor for it. */
export function dayTourFloor(day: HubDay, floors: Record<string, number>): { total: number; complete: boolean } {
  const slugs = new Set(day.stops.filter((s) => s.tour).map((s) => s.distillery.slug));
  let total = 0;
  let complete = slugs.size > 0;
  for (const slug of slugs) {
    const price = floors[slug];
    if (price === undefined) {
      complete = false;
      continue;
    }
    total += price;
  }
  return { total, complete };
}

/** "£56", "£22.50" - whole pounds stay whole, a real half-pound price
 *  (Ardbeg's £22.50 Classic tour) keeps its pence. Same rule as
 *  pricing.ts's formatPrice, which this defers to; kept as a named
 *  re-export here purely so the page reads in one vocabulary. */
export { formatPrice as formatTourPrice } from "@/lib/pricing";

/** Small counts spelled out ("all three"), numerals past that. Used for
 *  "Standard tours at all three start at ..." and for the ways-out link
 *  that names how many Days the hub actually has. */
export function spellCount(n: number): string {
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  return WORDS[n] ?? `${n}`;
}

/** The tours a distillery runs with no price on them at all.
 *
 *  mapTour defaults a blank Price cell to 0, so £0 normally means "nobody
 *  has entered one" - but where the row says what it is in its own words
 *  (Port Ellen Open Days: "A free monthly open day ... No drams"), £0 is
 *  the price. Either way these stay OUT of the floor, and rightly so: the
 *  site owner's ruling (18 Aug 2026) is that a free, by-request, once-a-
 *  month, four-guest experience with no drams in it is not a cheaper
 *  version of a bookable tour, it is a different kind of thing.
 *
 *  What it is not is absent - which is exactly what "Nothing Port Ellen
 *  runs costs less" used to tell the reader, on a distillery that runs
 *  free open days every month. Excluding a row from the arithmetic is a
 *  judgement; excluding it from the sentence is a false claim.
 *
 *  Placeholder rows are excluded here too, for the same reason they are
 *  excluded from the floor: a row nobody stands behind should no more be
 *  NAMED on a day card than priced from. See isPlaceholderTour, which is
 *  that half of isPublishableTour on its own. */
function freeToursAt(distillery: Distillery): Tour[] {
  return distillery.tours.filter((t) => t.price <= 0 && !isPlaceholderTour(t));
}

/** What a free tour's own description admits about itself, and the clause
 *  each admission earns.
 *
 *  Read off the record, never typed per distillery: every phrase matched
 *  below is in the Tours row it describes, so a claim on a day card can
 *  only exist while the evidence for it does, and editing that sentence
 *  in Airtable edits the day card with it. Nothing here knows the words
 *  "Port Ellen".
 *
 *  Deliberately a short, closed list. These are the three questions that
 *  decide whether a free experience is an alternative to a paid tour -
 *  can you book it, how many of you can go, and do you get a dram - and
 *  they are the same three the site owner answered by hand when ruling
 *  the Open Days out of the price comparison. A description that answers
 *  none of them makes no claims here at all; see freeTourNote. */
const FREE_TOUR_CAVEATS: {
  pattern: RegExp;
  clause: (match: RegExpMatchArray, plural: boolean) => string;
}[] = [
  {
    pattern: /\bby request\b/i,
    clause: (_m, plural) => (plural ? "are by request" : "is by request"),
  },
  {
    // "one to four guests", "1–4 guests" - the upper bound is captured,
    // never assumed, so a distillery that took ten would say ten.
    pattern: /\b(?:1|one)\s*(?:to|-|–|—)\s*(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+guests\b/i,
    clause: (m, plural) => `${plural ? "take" : "takes"} ${guestCountWord(m[1])} people at most`,
  },
  {
    pattern: /\bno drams?\b/i,
    clause: (_m, plural) => (plural ? "include no drams" : "includes no drams"),
  },
];

/** "4" and "four" both come out as "four" - the descriptions use both,
 *  and a sentence should not. Same spelled-count rule as everywhere else
 *  on the page. */
function guestCountWord(raw: string): string {
  const n = Number(raw);
  return Number.isNaN(n) ? raw.toLowerCase() : spellCount(n);
}

/** "a, b, and c" - Oxford comma, matching the rest of the page's prose. */
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** The half-sentence that names a free tour and says why it isn't an
 *  alternative - "the free monthly Open Days are by request, take four
 *  people at most, and include no drams".
 *
 *  The tour's OWN name, minus its distillery's if it opens with it: the
 *  reader has just been told whose day this is, and "Port Ellen's free
 *  monthly Port Ellen Open Days" is not a sentence. `nameTheDistillery`
 *  puts it back for multi-distillery days, where "the free open days"
 *  alone would not say whose.
 *
 *  Plurality comes off the name because the names differ ("Open Days"
 *  takes "are", a singular "Open Day" would take "is") and a verb that
 *  disagrees with its subject reads like a bug in the data. */
function freeTourNote(tour: Tour, distilleryName: string, nameTheDistillery: boolean): string {
  const bare = tour.name.startsWith(`${distilleryName} `)
    ? tour.name.slice(distilleryName.length + 1)
    : tour.name;
  const plural = /s$/i.test(bare);
  const monthly = /\bmonthly\b/i.test(tour.description) ? " monthly" : "";
  const subject = nameTheDistillery
    ? `${distilleryName}'s free${monthly} ${bare}`
    : `the free${monthly} ${bare}`;
  const caveats = FREE_TOUR_CAVEATS.map((c) => {
    const match = tour.description.match(c.pattern);
    return match ? c.clause(match, plural) : undefined;
  }).filter((c): c is string => c !== undefined);
  // The row admits to no limits, so none are claimed. The reader still
  // gets the part that matters and that the old wording denied: the
  // cheaper thing exists, it is free, and it is not this.
  if (caveats.length === 0) return `${subject} ${plural ? "are" : "is"} a different thing entirely`;
  return `${subject} ${joinClauses(caveats)}`;
}

/**
 * The money note that sits on cream under a day card's hook. Four
 * genuinely different sentences, because four genuinely different things
 * can be true:
 *
 *  - The day books above the floor. Say what the standard would cost, so
 *    the reader can see the choice that was made on their behalf. This is
 *    the Grand Tour's day two: a £100 seated tasting where Bowmore's own
 *    standard tour is £20.
 *  - The day IS the floor. Saying "standard tours start at £56" under
 *    "today's tours cost £56" is noise; the honest line is that there is
 *    nothing cheaper.
 *  - The day is the floor, AND the distillery runs something free that
 *    the floor deliberately ignores. Then "nothing costs less" is simply
 *    untrue, and the note names the free thing and says why it is not an
 *    alternative - in its own name, and only in the terms its own record
 *    uses. Port Ellen is today's case: £250 for the one tour it sells at
 *    that price, and monthly open days that cost nothing because there
 *    is no whisky in them. Keeping it out of the ARITHMETIC is right;
 *    keeping it out of the SENTENCE was a claim the data never made.
 *  - Nobody has priced one of the distilleries. Then only the planned
 *    figure is stated, and no floor is implied at all.
 *
 * The wording never asserts a distillery runs only one tour - the records
 * show Port Ellen runs four, and both the original spec's draft of this
 * sentence and the 18 Aug 2026 rewrite brief said "the only bookable tour
 * Port Ellen runs", which its £450 and £900 experiences contradict. What
 * IS true, and what this says, is that nothing it SELLS costs less, and
 * that the one thing that costs nothing is not a tour you can substitute.
 */
export function dayMoneyNote(day: HubDay, floors: Record<string, number>): string | undefined {
  const planned = dayTourTotal(day);
  if (planned <= 0) return undefined;
  const tourStops = day.stops.filter((s) => s.tour);
  const single = tourStops.length === 1;
  const distilleryCount = new Set(tourStops.map((s) => s.distillery.slug)).size;
  const lead = single
    ? `Today's tour costs ${formatPrice(planned)}pp.`
    : `Today's tours cost ${formatPrice(planned)}pp.`;

  const floor = dayTourFloor(day, floors);
  if (!floor.complete) return lead;

  // "at all two" is not English. Two is "both"; three and up take the
  // spelled count. Nothing about this is a special case for a magic
  // number - it is the one place the language genuinely branches.
  const atClause = distilleryCount === 2 ? "at both" : `at all ${spellCount(distilleryCount)}`;

  if (floor.total < planned) {
    return single
      ? `${lead} ${tourStops[0].distillery.name}'s standard tour is ${formatPrice(floor.total)}pp.`
      : `${lead} Standard tours ${atClause} start at ${formatPrice(floor.total)}pp.`;
  }
  // Before telling the reader nothing is cheaper, look at what the floor
  // left out. Free tours are excluded from the arithmetic on purpose (see
  // freeToursAt) - this is where that exclusion is declared rather than
  // hidden. One entry per distillery, and the first free tour at each:
  // no distillery on the island runs two, and if one ever did, the point
  // would still be that a free option exists, not to catalogue them.
  const seen = new Set<string>();
  const freeAlternatives: { distilleryName: string; tour: Tour }[] = [];
  for (const stop of tourStops) {
    if (seen.has(stop.distillery.slug)) continue;
    seen.add(stop.distillery.slug);
    const [free] = freeToursAt(stop.distillery);
    if (free) freeAlternatives.push({ distilleryName: stop.distillery.name, tour: free });
  }

  if (freeAlternatives.length > 0) {
    // Semicolons between distilleries, since each note is already a
    // comma list of its own.
    const notes = freeAlternatives
      .map((f) => freeTourNote(f.tour, f.distilleryName, !single))
      .join("; ");
    return single
      ? `${lead} Nothing ${tourStops[0].distillery.name} sells costs less — ${notes}.`
      : `${lead} These are the standard tours ${atClause}, and nothing cheaper is on sale — ${notes}.`;
  }

  return single
    ? `${lead} Nothing ${tourStops[0].distillery.name} runs costs less — there is no cheaper way in.`
    : `${lead} These are the standard tours ${atClause} — there is no cheaper way round.`;
}

/** One row of the "What it costs, and where" proportion bar. `note` is
 *  computed on exactly the same three-way test as dayMoneyNote above, so
 *  a day can never explain its spend one way in the spine and another way
 *  in the breakdown. */
export interface CostRow {
  dayNumber: number;
  label: string;
  note: string;
  amount: number;
  pacing: string;
  share: number;
}

/** Every day that spends anything, sorted by spend descending - the whole
 *  point of the block. The case that proved it was Port Ellen at 47% of
 *  the Grand Tour's tour spend on a single day; that day was unlinked on
 *  30 Aug 2026, and Bowmore's £100 tasting now carries 36% of what is
 *  left. Numbers in day order never show that, and a bar sorted by day
 *  order doesn't either.
 *
 *  `share` is that day's fraction of the total, 0-1, computed rather than
 *  authored. Days that book nothing are dropped, not drawn at zero. */
export function journeyCostRows(journey: Journey): CostRow[] {
  const rows = journey.days
    .map((day, i) => ({ day, dayNumber: i + 1, amount: dayTourTotal(day) }))
    .filter((r) => r.amount > 0);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return rows
    .map(({ day, dayNumber, amount }) => {
      const tourStops = day.stops.filter((s) => s.tour);
      const floor = dayTourFloor(day, journey.standardTourFloor);
      let note: string;
      if (!floor.complete) {
        note = `Day ${dayNumber} · not every tour here is priced`;
      } else if (floor.total < amount) {
        note =
          tourStops.length === 1 && tourStops[0].tour
            ? `Day ${dayNumber} · ${tourStops[0].tour.name}. The standard tour is ${formatPrice(floor.total)}`
            : `Day ${dayNumber} · the standard tours would be ${formatPrice(floor.total)}`;
      } else {
        // Same test as dayMoneyNote's fourth case, for the same reason:
        // "no cheaper way in" is false at a distillery with a free open
        // day, and the spine and the breakdown must not disagree about
        // it. No room here to say why it isn't an alternative - the day
        // card above carries that - so this says only what it can stand
        // behind: nothing cheaper is for SALE.
        const hasFreeAlternative = tourStops.some((s) => freeToursAt(s.distillery).length > 0);
        note =
          tourStops.length === 1
            ? hasFreeAlternative
              ? `Day ${dayNumber} · one tour, and nothing cheaper on sale`
              : `Day ${dayNumber} · one tour, and no cheaper way in`
            : `Day ${dayNumber} · the standard tour at each`;
      }
      return {
        dayNumber,
        label: day.costLabel ?? day.areaNote ?? day.name,
        note,
        amount,
        pacing: day.pacing,
        share: total > 0 ? amount / total : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/** The claim band's three stats, each answering a DIFFERENT question -
 *  how much of the island you see, what the tours will take from you at
 *  the very least, and what shape the stay is. Never three readings of
 *  the same fact.
 *
 *  The middle stat disappears entirely rather than degrading when the
 *  floor is incomplete: "from" a number that isn't a floor is a claim
 *  this site can't make. */
export function journeyClaimStats(
  journey: Journey,
  /** How many distilleries on the island a visitor can actually get
   *  into, so a journey that takes in every one of them can say so. The
   *  caller supplies it because answering it needs the whole Distilleries
   *  table, which this pure derivation deliberately doesn't fetch - and
   *  because both halves of it ("on the island", and "open to visitors")
   *  are judgements that belong at the call site with a comment on them.
   *  Undefined simply skips the claim.
   *
   *  NOT the number of distilleries on Islay: Laggan Bay and Portintruan
   *  are producing and take no visitors, so they are real but absent from
   *  this count. Hence the label below claims only what this number can
   *  carry - every distillery you can VISIT, never "all of them". */
  visitableIslandDistilleryCount?: number
): { value: string; label: string }[] {
  const stats: { value: string; label: string }[] = [];

  const distilleries = journeyDistilleryCount(journey);
  if (distilleries > 0) {
    const noun = distilleries === 1 ? "distillery" : "distilleries";
    stats.push({
      value: `${distilleries}`,
      // Only ever claimed when it is arithmetically true, and today that
      // is exactly one journey: The Islay Grand Tour takes in every
      // distillery on Islay that opens its doors. It deliberately does
      // NOT say "all of them" - there are working distilleries on the
      // island beyond this count (see the parameter's doc comment), and a
      // reader who knows that would catch the site out on its flagship
      // journey. Nothing here spells a number out in prose, so publishing
      // another visitable distillery simply drops this branch (the
      // arithmetic stops matching) and the honest fallback takes over.
      label:
        visitableIslandDistilleryCount !== undefined &&
        distilleries === visitableIslandDistilleryCount
          ? distilleries === 1
            ? `${noun}, the only one you can visit`
            : `${noun}, every one you can visit`
          : journeyDistilleryStatLabel(journey),
    });
  }

  const floor = journeyTourFloor(journey);
  if (floor.complete && floor.total > 0) {
    stats.push({
      value: `from ${formatPrice(floor.total)}`,
      label: "per person in tours, booked separately",
    });
  }

  if (journey.nights > 0) {
    const noun = journey.nights === 1 ? "night" : "nights";
    // Two facts about the SHAPE of the stay, neither of them the night
    // count itself: one bed the whole way, and whether you need a car to
    // use it. Both come off records - the Base text field, and every
    // day's own Transport Clause.
    const bed = journey.base ? "one bed throughout" : "";
    const car = journey.days.some((d) => (d.transportClause ?? "").toLowerCase().startsWith("car"))
      ? "you'll need a car"
      : "";
    const clauses = [bed, car].filter(Boolean).join(", and ");
    stats.push({
      value: `${journey.nights} ${noun}`,
      label: clauses || `based in ${journey.base}`,
    });
  }

  return stats;
}

/** The Accommodation Note's opening sentence - the base row above night
 *  one is one line beside a village name, so the lead sentence is what
 *  fits in it.
 *
 *  30 AUG 2026, AND THIS IS THE POINT OF THE PAIR: everything after that
 *  sentence used to go nowhere. The claim in this comment that "the full
 *  note still has a home - it is what nightNoteFor falls back to" was
 *  FALSE for every journey that authors Night Notes, which is all four of
 *  them: nightNoteFor only reaches accommodationNote when nightNotesLines
 *  is empty. So on the Grand Tour, four authored sentences - including
 *  the only statement anywhere that the boat home leaves from Port Askaig
 *  and not the closed terminal in Port Ellen - were stored, reviewed, and
 *  silently discarded at render.
 *
 *  A field that quietly drops what an editor writes into it is worse than
 *  a field that renders it badly: the copy passes review, ships, and
 *  nobody can tell from the page that it is missing. So firstSentence now
 *  has a partner, and the caller renders both. */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  // A full stop only ends a sentence if whitespace or the end of the
  // string follows it. Without that test this split "A room is £22.50 a
  // night." after "£22.", handed "50 a night." back as the remainder,
  // and reported nothing wrong because assertNothingDropped counts
  // characters and none were lost - the page just rendered nonsense. No
  // Accommodation Note carries a decimal today; the tour prices all do,
  // and they are one edit away from one of these fields.
  //
  // Known limit, deliberately not solved: "e.g. " and "St. Andrews" still
  // split, because they are a full stop followed by a space and nothing
  // short of an abbreviation list can tell them from a sentence end. No
  // authored note contains either.
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return match ? match[0].trim() : trimmed;
}

/** Everything after the lead sentence firstSentence returns - empty when
 *  the note is a single sentence, in which case the caller renders
 *  nothing rather than an empty paragraph.
 *
 *  firstSentence(t) + " " + restAfterFirstSentence(t) reconstitutes the
 *  whole trimmed note, which is the property assertNothingDropped checks
 *  in development. Keep it that way: the two functions exist to be
 *  exhaustive together. */
export function restAfterFirstSentence(text: string): string {
  const trimmed = text.trim();
  return trimmed.slice(firstSentence(trimmed).length).trim();
}

/** Development-only tripwire for the bug above: shout when a field's
 *  authored content is not fully accounted for by the strings a page
 *  actually renders from it.
 *
 *  Deliberately a warning and not a throw - a missing sentence should
 *  never take a page down, and an editor mid-draft in Airtable should not
 *  break the dev server. Compares on non-whitespace characters so that
 *  re-wrapping, joining or re-punctuating between field and page is not
 *  reported, and only genuinely absent copy is.
 *
 *  No-ops in production: this is a signal for whoever is changing the
 *  template, not a runtime check on visitors' behalf. */
export function assertNothingDropped(label: string, authored: string, rendered: string[]): void {
  if (process.env.NODE_ENV === "production") return;
  const strip = (t: string) => t.replace(/\s+/g, "");
  const whole = strip(authored);
  if (!whole) return;
  const shown = strip(rendered.join(""));
  if (shown.length >= whole.length) return;
  console.warn(
    `[authored content] ${label}: ${whole.length - shown.length} of ${whole.length} characters ` +
      `are stored but never rendered. Either render them or stop asking an editor to write them.`
  );
}

/** relaxed | moderate | packed - the CSS suffix behind the 5px strip down
 *  a day card and the pace legend's swatches. Deliberately a class name
 *  rather than a colour: the three hues are declared once, in the jr-
 *  block's own custom properties, and no hex reaches this file.
 *
 *  Anything the Days table's Pacing singleSelect can't produce falls to
 *  "moderate" rather than throwing or drawing an uncoloured strip. */
export function paceKey(pacing: string): "relaxed" | "moderate" | "packed" {
  const p = pacing.trim().toLowerCase();
  if (p === "relaxed") return "relaxed";
  if (p === "packed") return "packed";
  return "moderate";
}
