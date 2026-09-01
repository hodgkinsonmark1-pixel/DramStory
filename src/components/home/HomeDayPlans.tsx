"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { HubDay } from "@/lib/types";
import { paceKey } from "@/lib/journey-derivations";
import { dayTourTotal, formatTourPrice, spellCount } from "@/lib/journey-derivations";

/**
 * "Or take one day at a time" - the homepage's day-plans section, new on
 * 30 Aug 2026 to the site owner's mockup. Before this, the entire
 * day-plan presence on the homepage was one line of text at the foot of
 * Classic Journeys ("Prefer to plan day by day? Browse all Pre-Designed
 * Days"). That line stays; this section is what it was standing in for.
 *
 * WHAT THE MOCKUP ASKED FOR AND DOES NOT GET, all on the owner's own
 * call (30 Aug 2026) rather than as a shortcut:
 *
 *   - NO DAY COUNT in the heading. The mockup said "Fifteen days"; there
 *     are sixteen. Rather than correct a number that goes stale the next
 *     time a Day is published, the heading carries none - so nothing here
 *     has to be kept in sync by hand.
 *   - NO DRIVING TIME on the cards, and no "under an hour's driving"
 *     filter. The mockup's figures are drive time; the only per-day
 *     durations on record (Duration from Port Ellen/Bowmore) are
 *     WHOLE-DAY lengths, and Day Stops' Leg Minutes are incomplete. A
 *     time here would be either the wrong measure or a guess.
 *   - NO "DRIVER KEEPS N DRAMS" pill. Dropped outright by the owner. It
 *     reads as a count of distilleries but CLAIMS a miniatures policy -
 *     that each one hands a driver a dram to take away - and no record
 *     holds that. See the standing note atop journey-derivations.ts.
 *   - NO STRUCTURED TRANSPORT FIELD, and no bus route numbers. Also
 *     dropped by the owner, and this is the interesting one: instead of
 *     copying a route number onto a card where it would quietly rot, a
 *     day whose transport clause mentions a bus links OUT to the council
 *     that actually sets the timetable. The site then never states a
 *     departure it would have to maintain. See BUS_TIMETABLE_URL.
 */

/**
 * Argyll and Bute Council's Bus Travel page, anchored at its Islay and
 * Jura section - the transport authority that sets the timetable, not an
 * aggregator, per docs/content-sourcing-standards.md.
 *
 * DELIBERATELY THIS PAGE AND NOT THE PDF. The council publishes the
 * actual 450/451 timetable as a dated file
 * (.../2026-05/Islay FEB 2026 onwards.pdf) whose URL changes every time
 * they reissue it; this section always points at whatever the current
 * one is. Linking the PDF would be the exact staleness the owner asked
 * to design out.
 *
 * The doubled `/roads-and-travel/roads-and-travel/` segment is not a
 * typo - it is what the council's own navigation serves and what
 * resolves. Verified 30 Aug 2026: this URL loads and carries the
 * "450/451 Isle of Islay Portnahaven/Port Askaig - Bowmore - Port Ellen
 * - Ardbeg" link; the tidier un-doubled path 404s, and the older
 * /public-transport/timetables-directory/... deep link now 403s.
 */
const BUS_TIMETABLE_URL =
  "https://www.argyll-bute.gov.uk/roads-and-travel/roads-and-travel/public-transport-timetables/bus-travel#islay-and-jura";

type FilterId = "all" | "relaxed" | "no-car" | "under-50";

/** The price a day has to come in under to count as the cheap way in.
 *  Splits the sixteen days 4/12 today, which is what makes it worth a
 *  chip - a threshold that caught fourteen of them would filter nothing.
 *  Named rather than inlined so the number is in one place when the
 *  tour prices move it. */
const CHEAP_DAY_CEILING = 50;

/** How many day cards are VISIBLE at once. Every matching day is now
 *  rendered - the row scrolls sideways (31 Aug 2026, Mark's item 2)
 *  rather than being cut to the first three as it was on 30 Aug.
 *
 *  That change is what makes the chips honest. They have always counted
 *  the whole matching set, so "Relaxed 9" used to sit above three cards
 *  and quietly rely on "Browse all sixteen" to explain the other six.
 *  Now the nine are all there and the count is a promise the section
 *  keeps by itself. The hub link stays for the full view with sorting. */
const CARDS_VISIBLE = 3;

/** Whether a day can be done without hiring a car.
 *
 *  Reuses the EXACT test journeyClaimStats already applies to the same
 *  field - a Transport Clause that starts with "car" means a car, and
 *  anything else does not ("No car - four miles on foot", "Doable by
 *  bus", "Bus, taxi, or two miles on foot"). Keeping one test rather
 *  than two stops the homepage and a journey page disagreeing about the
 *  same day.
 *
 *  It reads prose, which is brittle by nature, and the owner has
 *  declined a structured field for now (30 Aug 2026). Two consequences
 *  worth knowing: a day with no clause at all is NOT claimed as car-free
 *  (silence is not a promise), and "Car, or walk it from Port Ellen"
 *  counts as needing a car even though it is walkable - it leads with
 *  the car, so the conservative reading is the safe one. The chip shows
 *  a COMPUTED count, so if the wording changes the number moves with it
 *  rather than going quietly wrong. */
function isCarFree(day: HubDay): boolean {
  const clause = (day.transportClause ?? "").trim().toLowerCase();
  if (!clause) return false;
  return !clause.startsWith("car");
}

/** The transport pills that close a card, above the rule - the owner's
 *  mockup treatment (30 Aug 2026). Two at most, and only ever what a
 *  record says:
 *    - a green "Nobody has to drive" pill when the clause offers a way
 *      without a car, which is the one claim in this section worth
 *      colouring;
 *    - the Transport Clause itself, verbatim, in a quiet pill.
 *  Where the clause leans on a bus the pill carries the timetable link.
 *  Never a route number and never a departure - see BUS_TIMETABLE_URL. */
function TransportPills({ day }: { day: HubDay }) {
  const clause = day.transportClause?.trim();
  if (!clause) return null;
  const carFree = isCarFree(day);
  const mentionsBus = /\bbus(es)?\b/i.test(clause);
  return (
    <div className="hdp-pills">
      {carFree && (
        <span className="hdp-pill hdp-pill-good">
          <span className="hdp-dot" aria-hidden="true" />
          Nobody has to drive
        </span>
      )}
      <span className="hdp-pill">
        {clause}
        {mentionsBus && (
          <>
            {" "}
            <a href={BUS_TIMETABLE_URL} target="_blank" rel="noopener noreferrer">
              timetable &rarr;
            </a>
          </>
        )}
      </span>
    </div>
  );
}

function DayCard({ day }: { day: HubDay }) {
  const total = dayTourTotal(day);
  // paceKey, not paceTone: paceTone's Relaxed pair resolves to the navy
  // (--green-deep is not green - see the token block in
  // dramstory-legacy.css), which is why Relaxed and Packed did not read
  // as opposite ends of anything. The three colours are declared against
  // this class in home-extra.css instead, and Relaxed is the real green.
  // NOTE this makes the homepage's Relaxed differ from /days and the
  // journey spine, which still read paceTone. Flagged to the owner.
  const pace = paceKey(day.pacing);
  return (
    <article className="hdp-card">
      {/* Pacing as a coloured WORD beside the price rather than a filled
          pill, per the mockup - the pills at the foot of the card are
          the pill treatment, and two pill styles in one card fought each
          other. Colour still comes from paceTone, the same source
          PacingTag and the journey spine read, so the three cannot
          drift. PacingTag itself is untouched: it is shared with the
          hero column and the days hub. */}
      <div className="hdp-card-top">
        <span className={`hdp-pace hdp-pace-${pace}`}>{day.pacing}</span>
        {/* Same rule as the journey cards: a day nobody has priced says
            nothing about money rather than printing a zero. */}
        {total > 0 && <span className="hdp-price">{formatTourPrice(total)}pp in tours</span>}
      </div>
      <h3 className="hdp-name">
        <Link href={`/days/${day.slug}`}>{day.name}</Link>
      </h3>
      {day.hook && <p className="hdp-hook">{day.hook}</p>}
      <TransportPills day={day} />
    </article>
  );
}

export default function HomeDayPlans({ days }: { days: HubDay[] }) {
  const [filter, setFilter] = useState<FilterId>("all");

  const relaxed = useMemo(() => days.filter((d) => d.pacing === "Relaxed"), [days]);
  const carFree = useMemo(() => days.filter(isCarFree), [days]);
  // A day with no priced tour at all (Jura today) is NOT cheap, it is
  // unpriced - so it stays out rather than sorting to the top of a
  // price filter on a zero nobody entered.
  const cheap = useMemo(
    () => days.filter((d) => {
      const total = dayTourTotal(d);
      return total > 0 && total < CHEAP_DAY_CEILING;
    }),
    [days]
  );

  const matching =
    filter === "relaxed"
      ? relaxed
      : filter === "no-car"
        ? carFree
        : filter === "under-50"
          ? cheap
          : days;


  /* THE RAIL. Scroll position drives which arrows are live, so an arrow
     is never offered when there is nothing that way - including the
     common case where the filtered set is three or fewer and neither
     arrow applies. */
  const railRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // 2px of slack: sub-pixel widths mean scrollLeft rarely lands exactly
    // on the maximum, which would leave the next arrow enabled forever.
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  // Re-measure when the filter changes the number of cards, and on
  // resize, since how many fit is a function of width.
  useEffect(() => {
    const el = railRef.current;
    if (el) el.scrollTo({ left: 0 });
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [filter, updateArrows]);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // One card plus its gap, measured off the rail rather than assumed,
    // so this stays correct when the breakpoints change the card width.
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 16 : el.clientWidth / CARDS_VISIBLE;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  if (days.length === 0) return null;

  // Counts are rendered, never typed, and they count the whole matching
  // set - which is now also what the rail holds. A chip is hidden
  // entirely when it would match nothing.
  const chips: { id: FilterId; label: string; count: number }[] = [
    { id: "all", label: `All ${spellCount(days.length)}`, count: days.length },
    { id: "relaxed", label: "Relaxed", count: relaxed.length },
    { id: "no-car", label: "Nobody has to drive", count: carFree.length },
    { id: "under-50", label: `Under ${formatTourPrice(CHEAP_DAY_CEILING)}pp`, count: cheap.length },
  ];

  return (
    <section className="hdp-section" id="day-plans">
      <div className="hdp-head">
        <div className="hdp-head-text">
          <div className="how-eyebrow">Or take one day at a time</div>
          {/* No count here, deliberately - see the file comment. */}
          <h2 className="how-title">Days, ready to drop into a trip</h2>
          {/* Counted, never typed - publish a seventeenth Day and this
              says seventeen on the next build. Moved under the title on
              31 Aug 2026 when the heads centred; it was to the right of
              the heading, which no longer has a right. */}
          <Link className="hdp-browse" href="/days">
            Browse all {spellCount(days.length)} &rarr;
          </Link>
        </div>
      </div>

      <div className="hdp-filters" role="group" aria-label="Filter days">
        {chips
          .filter((chip) => chip.count > 0)
          .map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={filter === chip.id ? "hdp-chip hdp-chip-on" : "hdp-chip"}
              aria-pressed={filter === chip.id}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label} <span className="hdp-chip-count">{chip.count}</span>
            </button>
          ))}
      </div>

      <div className="hdp-rail-wrap">
        <button
          type="button"
          className="hdp-arrow hdp-arrow-prev"
          onClick={() => scrollByCard(-1)}
          disabled={!canPrev}
          aria-label="Show previous days"
        >
          <span aria-hidden="true">&#8592;</span>
        </button>

        {/* tabIndex makes the rail itself keyboard-scrollable, which is
            the only way to reach the off-screen cards without a mouse -
            the arrows are buttons, but arrow keys need a focused
            scroll container. */}
        <div
          className="hdp-rail"
          ref={railRef}
          onScroll={updateArrows}
          tabIndex={0}
          role="group"
          aria-label={`${matching.length} day plans, scrollable`}
        >
          {matching.map((day) => (
            <DayCard key={day.slug} day={day} />
          ))}
        </div>

        <button
          type="button"
          className="hdp-arrow hdp-arrow-next"
          onClick={() => scrollByCard(1)}
          disabled={!canNext}
          aria-label="Show more days"
        >
          <span aria-hidden="true">&#8594;</span>
        </button>
      </div>
    </section>
  );
}
