"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HubDay } from "@/lib/types";
import { PacingTag } from "@/components/PacingTag";
import { dayTourTotal, formatTourPrice } from "@/lib/journey-derivations";

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

type FilterId = "all" | "relaxed" | "no-car";

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

/** The clause, plus a link to the timetable when it leans on a bus.
 *  Never a route number, never a departure - the council's page holds
 *  both, and holds them current. */
function TransportLine({ day }: { day: HubDay }) {
  const clause = day.transportClause?.trim();
  if (!clause) return null;
  const mentionsBus = /\bbus(es)?\b/i.test(clause);
  return (
    <p className="hdp-transport">
      <span className={isCarFree(day) ? "hdp-transport-free" : undefined}>{clause}</span>
      {mentionsBus && (
        <>
          {" "}
          <a href={BUS_TIMETABLE_URL} target="_blank" rel="noopener noreferrer">
            Check the timetable &rarr;
          </a>
        </>
      )}
    </p>
  );
}

function DayCard({ day }: { day: HubDay }) {
  const total = dayTourTotal(day);
  return (
    <article className="hdp-card">
      <div className="hdp-card-top">
        <PacingTag pacing={day.pacing} />
        {/* Same rule as the journey cards: a day nobody has priced says
            nothing about money rather than printing a zero. */}
        {total > 0 && <span className="hdp-price">{formatTourPrice(total)}pp in tours</span>}
      </div>
      <h3 className="hdp-name">
        <Link href={`/days/${day.slug}`}>{day.name}</Link>
      </h3>
      {day.hook && <p className="hdp-hook">{day.hook}</p>}
      <TransportLine day={day} />
    </article>
  );
}

export default function HomeDayPlans({ days }: { days: HubDay[] }) {
  const [filter, setFilter] = useState<FilterId>("all");

  const relaxed = useMemo(() => days.filter((d) => d.pacing === "Relaxed"), [days]);
  const carFree = useMemo(() => days.filter(isCarFree), [days]);

  const shown = filter === "relaxed" ? relaxed : filter === "no-car" ? carFree : days;

  if (days.length === 0) return null;

  // Counts are rendered, never typed - a chip that offers a filter says
  // how many it will leave you with, and is hidden entirely when it
  // would leave you with none.
  const chips: { id: FilterId; label: string; count: number }[] = [
    { id: "all", label: "All days", count: days.length },
    { id: "relaxed", label: "Relaxed", count: relaxed.length },
    { id: "no-car", label: "Nobody has to drive", count: carFree.length },
  ];

  return (
    <section className="hdp-section" id="day-plans">
      <div className="hdp-head">
        <div>
          <div className="how-eyebrow">Or take one day at a time</div>
          {/* No count here, deliberately - see the file comment. */}
          <h2 className="how-title">Days, ready to drop into a trip</h2>
        </div>
        <Link className="hdp-browse" href="/days">
          Browse them all &rarr;
        </Link>
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

      <div className="hdp-grid">
        {shown.map((day) => (
          <DayCard key={day.slug} day={day} />
        ))}
      </div>
    </section>
  );
}
