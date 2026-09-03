"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { HubDay } from "@/lib/types";
import { paceKey } from "@/lib/journey-derivations";
import { soleAreaFor } from "@/lib/area-membership";
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
/** The gap between slides, in px - must match .hdp-track's gap in
 *  home-extra.css. Used to turn a scroll offset back into a slide index
 *  when the track is swiped rather than driven by the arrows. */
const CAROUSEL_GAP = 20;

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


/** One slide of the carousel. The whole card is a link to the day - the
 *  design's own "+ Add to your trip" button became "See the day" on
 *  Mark's call (01 Sep 2026): nothing on the homepage can add to a trip
 *  yet, and a button that says it does and doesn't is worse than one
 *  that says where it goes. */
function DaySlide({ day, area }: { day: HubDay; area?: string }) {
  const total = dayTourTotal(day);
  const pace = paceKey(day.pacing);
  const carFree = isCarFree(day);
  const clause = day.transportClause?.trim();
  const mentionsBus = clause ? /\bbus(es)?\b/i.test(clause) : false;

  return (
    <article className="hdp-slide" aria-roledescription="slide">
      <div className="hdp-slide-main">
        <div className="hdp-slide-eyebrow">
          <span className={`hdp-pace hdp-pace-${pace}`}>{day.pacing}</span>
          {/* Derived from the day's own distilleries, not typed - and
              absent entirely on a day that crosses two areas rather than
              picking one of them. See soleAreaFor. */}
          {area && <span className="hdp-slide-area">{area}</span>}
        </div>
        <h3 className="hdp-slide-name">{day.name}</h3>
        {day.hook && <p className="hdp-slide-hook">{day.hook}</p>}
      </div>

      <div className="hdp-slide-aside">
        {/* A day nobody has priced says nothing about money rather than
            printing a zero. */}
        {total > 0 && (
          <div className="hdp-slide-money">
            <div className="hdp-slide-money-label">Tours, per person</div>
            <div className="hdp-slide-money-figure">{formatTourPrice(total)}</div>
          </div>
        )}
        {carFree && <div className="hdp-slide-good">Nobody has to drive</div>}
        {clause && (
          <div className="hdp-slide-clause">
            {clause}
            {mentionsBus && (
              <>
                {" "}
                <a href={BUS_TIMETABLE_URL} target="_blank" rel="noopener noreferrer">
                  timetable &rarr;
                </a>
              </>
            )}
          </div>
        )}
        <Link className="hdp-slide-cta" href={`/days/${day.slug}`}>
          See the day &rarr;
        </Link>
      </div>
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


  /* THE CAROUSEL. One day at a time, with the index held in state
     rather than read off scroll position: the design's dots need to know
     which day is showing, and a scroll-derived index on a snap container
     is fragile mid-swipe.

     On a phone the arrows are hidden and the track is swiped instead
     (mobile design, panel 1), so the track is a real scroll container
     and the index follows it via onScroll. Arrows and swipe therefore
     drive the same state rather than two competing ones. */
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((next: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(next, el.children.length - 1));
    const slide = el.children[clamped] as HTMLElement | undefined;
    if (slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: "smooth" });
    setIndex(clamped);
  }, []);

  /* Swipe keeps the index honest. Rounded to the nearest slide so a
     half-swipe that springs back does not leave the dots one ahead. */
  const onTrackScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + CAROUSEL_GAP : el.clientWidth;
    setIndex(Math.round(el.scrollLeft / step));
  }, []);

  /* Changing the filter changes the set, so the carousel has to go back
     to the start or the index can point past the end of the new list.
     Done in the click handler rather than an effect on `filter`: this is
     a user action with a known outcome, and resetting from an effect
     would run a second render every time and trip
     react-hooks/set-state-in-effect. */
  const chooseFilter = useCallback((id: FilterId) => {
    setFilter(id);
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
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
      <div className="sec-head">
        <div className="sec-head-text">
          <div className="how-eyebrow">Or take one day at a time</div>
          {/* No count here, deliberately - see the file comment. */}
          <h2 className="how-title">Days, ready to drop into a trip</h2>
          <div className="sec-head-note">
            Built from what you said upstairs. Flick through, or open the full list.
          </div>
        </div>
        <div className="sec-head-aside">
          {/* Counted, never typed - publish a seventeenth Day and this
              says seventeen on the next build. */}
          <Link className="hdp-browse" href="/days">
            Browse and filter all {spellCount(days.length)} &rarr;
          </Link>
          {/* Reads the live carousel position, and counts the FILTERED
              set - "Day 3 of 9" while Relaxed is on, not "of 16". */}
          <div className="sec-head-sub hdp-counter">
            Day {Math.min(index + 1, matching.length)} of {matching.length}
          </div>
        </div>
      </div>

      <div className="hdp-carousel">
        <button
          type="button"
          className="hdp-arrow"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          aria-label="Previous day"
        >
          <span aria-hidden="true">&#8592;</span>
        </button>

        <div
          className="hdp-track"
          ref={trackRef}
          onScroll={onTrackScroll}
          tabIndex={0}
          role="group"
          aria-label={`${matching.length} day plans`}
        >
          {matching.map((day) => (
            <DaySlide
              key={day.slug}
              day={day}
              area={soleAreaFor(day.stops.map((s) => s.distillery))?.name}
            />
          ))}
        </div>

        <button
          type="button"
          className="hdp-arrow"
          onClick={() => goTo(index + 1)}
          disabled={index >= matching.length - 1}
          aria-label="Next day"
        >
          <span aria-hidden="true">&#8594;</span>
        </button>
      </div>

      {/* Dots, one per day in the filtered set. Buttons rather than
          decoration so the carousel can be driven without a swipe or a
          reachable arrow. */}
      {matching.length > 1 && (
        <div className="hdp-dots" role="tablist" aria-label="Choose a day">
          {matching.map((day, i) => (
            <button
              key={day.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={day.name}
              className={i === index ? "hdp-dot is-on" : "hdp-dot"}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}

      {/* The filters sit BELOW the carousel in the final design, as a
          shortcut past it rather than a gate in front of it. */}
      <div className="hdp-filters" role="group" aria-label="Filter days">
        <span className="hdp-filters-label">Or straight to</span>
        {chips
          .filter((chip) => chip.count > 0)
          .map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={filter === chip.id ? "hdp-chip hdp-chip-on" : "hdp-chip"}
              aria-pressed={filter === chip.id}
              onClick={() => chooseFilter(chip.id)}
            >
              {chip.label} <span className="hdp-chip-count">{chip.count}</span>
            </button>
          ))}
      </div>
    </section>
  );
}
