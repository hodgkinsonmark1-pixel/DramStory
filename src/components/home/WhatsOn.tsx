import Link from "next/link";
import type { LocalEvent } from "@/lib/types";

/**
 * "What's on" - its own section since 01 Sep 2026 (Mark's final design,
 * desktop page 6). It was the right-hand column of When to go, four
 * events stacked in a narrow aside beside the shape of the year.
 *
 * WHY IT MOVED. The two were answering different questions in one
 * layout. When to go is about the shape of the year - which months are
 * open, busy, dark. What's on is about specific dates, and a reader with
 * fixed dates wants it full width and scannable, not squeezed into a
 * third of the page beside a month bar.
 *
 * As rows it can carry what the column could not: the venue and the
 * ticketing note beside the name, and the dates set right where a reader
 * scanning for "is anything on while I'm there" actually looks.
 */

/** The date, as one line, right-aligned.
 *
 *  Three shapes, because one cannot carry all three cases:
 *    13 SEP           a single day
 *    11-13 SEP        inside one month
 *    28 MAY - 6 JUN   across two
 *
 *  The version this replaces appended the end day to the start day and
 *  then printed the start month after it, rendering Fèis Ìle as
 *  "28- 6 JUNMAY". Confirmed events only; a provisional row has no day
 *  worth printing and says so instead. */
function dateLabel(event: LocalEvent): string {
  const d = new Date(event.date);
  const mon = (x: Date) => x.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const startMonth = mon(d);
  if (!event.endDate || event.endDate === event.date) {
    return `${d.getDate()} ${startMonth}`;
  }
  const e = new Date(event.endDate);
  const endMonth = mon(e);
  if (endMonth === startMonth) {
    return `${d.getDate()}–${e.getDate()} ${startMonth}`;
  }
  return `${d.getDate()} ${startMonth} – ${e.getDate()} ${endMonth}`;
}

/** What a provisional event shows instead of a date: the month and year
 *  it usually falls in, which is as far as this can honestly go until
 *  somebody announces it. */
function provisionalLabel(event: LocalEvent): string {
  return new Date(event.date)
    .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    .toUpperCase();
}

export default function WhatsOn({ localEvents }: { localEvents: LocalEvent[] }) {
  const today = new Date();

  /* Upcoming only, soonest first. An event that has been and gone is not
     upcoming, and a multi-day event counts as on until its last day - so
     the comparison is against endDate where there is one. */
  const upcoming = [...localEvents]
    .filter((e) => new Date(e.endDate || e.date).getTime() >= today.getTime() - 86_400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) return null;

  return (
    <section className="won-section" id="whats-on">
      <div className="sec-head">
        <div className="sec-head-text">
          <div className="how-eyebrow">If your dates are flexible</div>
          <h2 className="how-title">What&rsquo;s on</h2>
        </div>
        <div className="sec-head-aside">
          <Link className="won-all" href="/local-features">
            All year &rarr;
          </Link>
        </div>
      </div>

      <ul className="won-list">
        {upcoming.slice(0, 6).map((event) => (
          <li className="won-row" key={event.id}>
            <div className="won-name">
              {event.link ? (
                <a href={event.link} target="_blank" rel="noopener noreferrer">
                  {event.name}
                </a>
              ) : (
                event.name
              )}
            </div>
            <div className="won-meta">
              {event.location}
              {/* Price only where the dates are settled. Quoting a ticket
                  price against a date nobody has announced invites
                  someone to budget for a thing that may not happen. */}
              {event.datesConfirmed && event.price ? ` · ${event.price}` : ""}
            </div>
            <div className={event.datesConfirmed ? "won-date" : "won-date won-date-tbc"}>
              {event.datesConfirmed ? (
                dateLabel(event)
              ) : (
                <>
                  {provisionalLabel(event)}
                  <span className="won-tbc-note">
                    {event.provisionalTiming ?? "dates"} &mdash; not yet announced
                  </span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
