import type { Distillery, Tour } from "@/lib/types";
import { DAY_NAMES, isAppointmentOnly, isDistilleryClosedOn } from "@/lib/day-derivations";

/**
 * CAN THIS STOP ACTUALLY HAPPEN ON THIS DAY - the whole of the rule, in
 * one place, so the day screen and the trip review can't drift apart on
 * it (the same reason seasonal.ts exists, and deliberately the same
 * shape).
 *
 * The failure this prevents is real and specific. Ardbeg's Classic
 * Distillery Experience runs Monday to Friday; "Three Legends, One Road"
 * is built around it. Set that day to a Saturday and nothing on the site
 * said a word until the booking page did. The site's promise is a real
 * booking decision in under two minutes, so this is the exact failure it
 * exists to prevent.
 *
 * TWO INPUTS, IN THIS ORDER, AND NOTHING ELSE:
 *   1. The distillery's `Closed Days`. If the distillery is shut that
 *      weekday, every tour there is off - so this is checked first and
 *      the message says "every tour", because swapping tours won't help.
 *   2. The tour's `Runs On Days`. If it is populated and the chosen
 *      weekday isn't in it, that one tour is off. Blank is the normal
 *      case and means "no tour-specific restriction", NOT "unknown".
 * Blank on both is available. Availability is never inferred from
 * anything else - not from Hours prose, not from a tour's name, not from
 * how many days its distillery is open.
 *
 * WHY BLANK HAS TO MEAN "NO RESTRICTION": Ardbeg's Roaming Dram and
 * Warehouse 3 Tasting run Mon-Fri in April and October but seven days
 * from May to September. There is no field that can hold "half the
 * year", so `Runs On Days` is deliberately left blank on both and the
 * prose carries it. Encoding half of that rule would produce a
 * confidently wrong warning, which is worse than none - see
 * docs/days-trip-flow-handoff.md section 8, open question 2.
 */

export type UnavailableReason = "distillery-closed" | "tour-does-not-run";

export interface AvailabilityWarning {
  reason: UnavailableReason;
  /** 0 = Sunday .. 6 = Saturday - the day the visitor's own dates put
   *  this stop on. */
  weekday: number;
  /** Beside the stop, where its name is already on screen. */
  stopMessage: string;
  /** Standalone and fully named, for a list that isn't next to the stop
   *  (the trip review's "Still to sort"). */
  message: string;
}

/**
 * The one function that answers "can they do this on that day?".
 *
 * `date` is the real calendar date of the trip day, or null. NULL IS THE
 * COMMON CASE AND RETURNS NOTHING: callers pass dateForDayIndex, which
 * is null until the visitor has confirmed an actual date range. A month
 * answer ("September") doesn't pin down a weekday either, and so is also
 * null and also silent.
 *
 * This is where the rule departs from seasonalNoticeFor, on purpose.
 * That one falls back to "is TODAY inside the window" when there are no
 * trip dates, because a dated window either is or isn't happening now. A
 * weekday isn't like that: it recurs every seven days, so "today is a
 * Saturday" tells a visitor planning next June exactly nothing. Shown
 * anyway it would be a standing warning on a stop that is fine on the
 * day they actually go - and noise is how people learn to skim past the
 * warning that did apply to them.
 */
export function stopAvailabilityWarning(
  distillery: Distillery | undefined,
  tour: Tour | undefined,
  date: Date | null | undefined
): AvailabilityWarning | null {
  if (!distillery || !date) return null;
  const weekday = date.getDay();
  const dayPlural = `${DAY_NAMES[weekday]}s`;

  // RULE 1 - the distillery itself. Skipped for an appointment-only
  // distillery: Port Ellen's closedDays is blank for a structurally
  // different reason (no weekly pattern at all, monthly open days), so
  // reading it here would be reading "unknown" as "open every day". Its
  // own note already says so on the stop. See isAppointmentOnly.
  if (!isAppointmentOnly(distillery) && isDistilleryClosedOn(distillery, date)) {
    const openLabel = weekdayListLabel(allWeekdaysExcept(distillery.closedDays));
    return {
      reason: "distillery-closed",
      weekday,
      stopMessage: `Closed on ${dayPlural} — every tour here, not just this one. Open ${openLabel}: move this day, or swap the stop.`,
      message: `${distillery.name} is closed on ${dayPlural} — every tour there, not just this one. It's open ${openLabel}: move this day, or swap the stop.`,
    };
  }

  // RULE 2 - this one tour. Blank runsOnDays means no tour-specific
  // restriction, so there is nothing here to test and nothing to say.
  if (!tour || tour.runsOnDays.length === 0) return null;
  if (tour.runsOnDays.includes(weekday)) return null;

  const runsLabel = weekdayListLabel(tour.runsOnDays);
  // Only a tour that SAYS it runs that weekday is offered as the way
  // out. A sibling tour with a blank Runs On Days is not evidence that
  // it runs - blank means nobody encoded a restriction, which is exactly
  // the state Ardbeg's two seasonal tours are deliberately left in. So
  // the fallback is the date fix, which is always true.
  const alternatives = distillery.tours
    .filter((t) => t.name !== tour.name && t.runsOnDays.includes(weekday))
    .map((t) => t.name)
    .slice(0, 2);
  const altLabel = joinWithOr(alternatives);
  const altVerb = alternatives.length > 1 ? "do" : "does";

  return {
    reason: "tour-does-not-run",
    weekday,
    stopMessage: altLabel
      ? `This tour doesn't run on ${dayPlural}. ${altLabel} ${altVerb}, or move this day to ${runsLabel}.`
      : `This tour doesn't run on ${dayPlural} — it runs ${runsLabel}. Move this day, or pick another tour.`,
    message: altLabel
      ? `${distillery.name}'s ${tour.name} doesn't run on ${dayPlural}. ${altLabel} ${altVerb}, or move this day to ${runsLabel}.`
      : `${distillery.name}'s ${tour.name} doesn't run on ${dayPlural} — it runs ${runsLabel}. Move this day, or pick another tour.`,
  };
}

function allWeekdaysExcept(closed: number[]): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !closed.includes(d));
}

/** "Monday to Friday", "Sunday to Thursday", "Saturday or Sunday".
 *
 *  The run is tested CYCLICALLY, not from Monday: Caol Ila is open
 *  Sunday to Thursday, which is one unbroken stretch of the week and is
 *  how Caol Ila's own hours put it, but reads as a broken Mon/Tue/Wed/
 *  Thu/Sun list if you insist the week starts on a Monday. Two days or
 *  fewer are always listed rather than turned into a range, because
 *  "Saturday to Sunday" is a stilted way of saying "the weekend". */
export function weekdayListLabel(days: number[]): string {
  const set = Array.from(new Set(days)).filter((d) => d >= 0 && d <= 6);
  if (set.length === 0) return "no days";
  if (set.length === 7) return "any day";
  if (set.length >= 3) {
    for (let start = 0; start < 7; start++) {
      const run = Array.from({ length: set.length }, (_, i) => (start + i) % 7);
      if (run.every((d) => set.includes(d))) {
        return `${DAY_NAMES[start]} to ${DAY_NAMES[run[run.length - 1]]}`;
      }
    }
  }
  // Monday-first, because a list that opens on Sunday reads as a
  // fortnight's worth of week to a British visitor.
  const ordered = [...set].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  return joinWithOr(ordered.map((d) => DAY_NAMES[d]));
}

function joinWithOr(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}
