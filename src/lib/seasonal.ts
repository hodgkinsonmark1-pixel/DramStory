import type { SeasonalWindow, TripDates } from "@/lib/types";

/**
 * WHEN A SEASONAL NOTE IS WORTH SHOWING - the whole of the rule, in one
 * place, so the day page and the journey day cards can't drift apart on
 * it.
 *
 * Several Islay distilleries pause production for part of the year and
 * the tour a visitor actually gets changes with it: Laphroaig's silent
 * season turns the Laphroaig Experience into a tutored tasting - five
 * drams rather than three, no floor maltings, fully accessible where the
 * usual route has stairs, and 18+ where the usual tour admits 12- to
 * 17-year-olds. That is worth interrupting someone for. It is worth
 * interrupting exactly the people it applies to.
 *
 * So, in priority order:
 *   1. Visitor has confirmed trip dates -> show only if those dates
 *      overlap the window, and lead with the fact that they do.
 *   2. No trip dates -> show only if TODAY is inside the window.
 *   3. Otherwise render nothing at all.
 *
 * Not "always show, greyed out". A notice about September shown to
 * someone travelling in May is noise, and noise is how people learn to
 * skim past the warning that did apply to them. This is the same
 * principle as docs/days-trip-flow-handoff.md §8 open question 2: a
 * wrong closure warning is worse than none.
 */

export interface SeasonalNotice {
  /** Present only in the trip-dates case (rule 1). Says, in the
   *  visitor's own terms, that this window covers the days they told us
   *  they're here - because that, not the note's content, is what makes
   *  it worth reading now. */
  lead?: string;
  /** The Airtable note, verbatim. */
  note: string;
}

/** Resolves confirmed trip dates to an inclusive [start, end] ISO pair,
 *  or null when the visitor hasn't actually answered. A month answer
 *  ("2026-07") becomes that whole calendar month - the honest reading of
 *  "I'm coming in July", and the same expansion the planner already does
 *  for Local Events (see Workspace.tsx's selectedRange). */
export function tripDateRange(tripDates: TripDates | null | undefined): [string, string] | null {
  if (!tripDates || !tripDates.confirmed) return null;
  if (tripDates.mode === "month") {
    if (!tripDates.month) return null;
    return [`${tripDates.month}-01`, lastDayOfMonth(tripDates.month)];
  }
  if (!tripDates.startDate) return null;
  // An open-ended range (a start picked, no end yet) is treated as that
  // single day rather than as "forever" - the second is how a June note
  // ends up in front of a September visitor.
  return [tripDates.startDate, tripDates.endDate || tripDates.startDate];
}

function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return `${yearMonth}-28`;
  const d = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day of this one
  return d.toISOString().slice(0, 10);
}

/** ISO dates sort as strings, which is the whole reason this file never
 *  builds a Date to compare two days. */
function overlaps(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

/**
 * The one function that answers "does this visitor need to know about
 * this?". Returns null - render nothing - far more often than not, and
 * that is the point.
 *
 * `todayIso` is passed in rather than read from the clock here so the
 * caller decides which clock it is. Callers are client components that
 * only ask once the trip has hydrated, which keeps the answer out of the
 * server-rendered HTML and so out of hydration mismatch territory.
 */
export function seasonalNoticeFor(
  seasonal: SeasonalWindow | undefined,
  tripDates: TripDates | null | undefined,
  todayIso: string
): SeasonalNotice | null {
  if (!seasonal) return null;
  const { from, to, note } = seasonal;
  // A window that isn't two real, ordered ISO days can't be tested, and
  // a warning that can't be tested is one this codebase doesn't print.
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) return null;

  const range = tripDateRange(tripDates);
  if (range) {
    if (!overlaps(range[0], range[1], from, to)) return null;
    return { lead: leadFor(range, from, to), note };
  }

  if (todayIso < from || todayIso > to) return null;
  return { note };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today as an ISO day in the READER'S OWN timezone, not UTC. On the
 *  first night of a window, a visitor in Islay's summer BST would be an
 *  hour into the day the note starts while UTC still says yesterday -
 *  a small thing, except that being right on the boundary day is most of
 *  what this notice is for. */
export function todayIsoLocal(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "Your dates fall inside this" is the fact that earns the visitor's
 *  attention, so it goes first and the window itself follows it. Where
 *  only part of the trip is affected the sentence says so rather than
 *  overclaiming - someone arriving on the 11th for a fortnight is being
 *  told about their first three days, not their holiday. */
function leadFor(range: [string, string], from: string, to: string): string {
  // The year is spelled out only on a window that crosses one, where
  // "8 December to 13 January" would otherwise be genuinely ambiguous.
  const spansYears = from.slice(0, 4) !== to.slice(0, 4);
  const window = `${formatDay(from, spansYears)} to ${formatDay(to, spansYears)}`;
  const wholeTrip = from <= range[0] && to >= range[1];
  return wholeTrip
    ? `Your dates fall inside this period (${window}).`
    : `Part of your trip falls inside this period (${window}).`;
}

/** "8 July", or "8 December 2026" when the caller needs the year. */
function formatDay(iso: string, withYear: boolean): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    ...(withYear ? { year: "numeric" } : {}),
  });
}
