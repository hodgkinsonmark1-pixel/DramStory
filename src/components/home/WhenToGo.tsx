import Link from "next/link";
import type { JournalPost, LocalEvent, MonthBand, Season } from "@/lib/types";

/**
 * "When to go" - built 30 Aug 2026 to Mark's mockup, below the
 * distilleries. Takes the events over from FeaturedContent, which keeps
 * its own heading for what remains.
 *
 * TWO THINGS IT REFUSES TO INVENT.
 *
 * A provisional event never shows a date. Four of the nine events are
 * 2027 recurrences nobody has announced - their stored date is a SORT
 * ANCHOR so the row lands in the right place in the year, and this
 * renders `provisionalTiming` ("usually early July") in its place. The
 * gate is the Dates Confirmed checkbox, not the Status column, which is
 * a Todo/In progress/Done marker about our own editing.
 *
 * And the bar tracks the REAL current month, not the month the mockup
 * was drawn in. Drawn in May, shipped in August; hardcoding the
 * highlight would have left May lit up all year.
 */

/** The band colours, quietest to busiest. Deliberately not the pace
 *  scale - that one means "how full is this day", and reusing it here
 *  would say two different things in the same three colours. */
const BUSYNESS_CLASS: Record<number, string> = {
  1: "wtg-b1",
  2: "wtg-b2",
  3: "wtg-b3",
  4: "wtg-b4",
};

/** "13 Aug", and "27–30 Aug" when an event runs across days. Confirmed
 *  events only - a provisional row has no date worth printing. */
function formatDateRange(event: LocalEvent): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (!event.endDate || event.endDate === event.date) return fmt(event.date);
  return `${fmt(event.date)} – ${fmt(event.endDate)}`;
}

/** "Tomorrow" / "In two weeks" / "In nine months" - how far off this is,
 *  in the terms someone planning actually thinks in. Undefined for
 *  provisional events, whose whole point is that we do not know.
 *
 *  Spelled out rather than numeric because these sit under a date that
 *  is already a numeral, and two numbers in two lines read as a table. */
const SPELLED = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];

function relativeWhen(event: LocalEvent, today: Date): string | undefined {
  if (!event.datesConfirmed) return undefined;
  const start = new Date(event.date);
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "On now";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `In ${SPELLED[days] ?? days} days`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `In ${SPELLED[weeks] ?? weeks} weeks`;
  const months = Math.round(days / 30);
  return `In ${SPELLED[months] ?? months} months`;
}

function EventRow({ event, today }: { event: LocalEvent; today: Date }) {
  const when = relativeWhen(event, today);
  return (
    <li className="wtg-event">
      <div className="wtg-event-date">
        {event.datesConfirmed ? (
          formatDateRange(event)
        ) : (
          /* No day, because nobody has announced one. The month and year
             are as far as this can honestly go. */
          <span className="wtg-event-tbc">
            {new Date(event.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </span>
        )}
      </div>
      <div className="wtg-event-body">
        <div className="wtg-event-name">
          {event.link ? (
            <a href={event.link} target="_blank" rel="noopener noreferrer">
              {event.name}
            </a>
          ) : (
            event.name
          )}
        </div>
        <div className="wtg-event-meta">
          {event.location}
          {event.datesConfirmed && event.price ? ` · ${event.price}` : ""}
        </div>
        {when && <div className="wtg-event-when">{when}</div>}
        {!event.datesConfirmed && (
          <div className="wtg-event-tbc-note">
            {event.provisionalTiming ?? "dates not yet announced"} &mdash; not yet announced
          </div>
        )}
      </div>
    </li>
  );
}

export default function WhenToGo({
  seasons,
  months,
  localEvents,
  journalPosts,
}: {
  seasons: Season[];
  months: MonthBand[];
  localEvents: LocalEvent[];
  journalPosts: JournalPost[];
}) {
  if (seasons.length === 0 && months.length === 0) return null;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const currentMonthOrder = today.getMonth() + 1;

  const seasonById = new Map(seasons.map((s) => [s.id, s]));
  const cards = seasons.filter((s) => s.showAsCard);
  // The band that gets the feature panel: the busiest one that is not a
  // card. Found by rule rather than by name, so renaming Fèis Ìle in
  // Airtable cannot empty the panel.
  const feature = seasons
    .filter((s) => !s.showAsCard)
    .sort((a, b) => b.busyness - a.busyness)[0];
  const featureMonth = months.find((m) => m.seasonId === feature?.id);

  // Same rule as everywhere else on this page: an event that has been and
  // gone is not upcoming, and a multi-day event counts as on until its
  // last day.
  const upcoming = [...localEvents]
    .filter((e) => (e.endDate || e.date) >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const journalPost = journalPosts[0];

  return (
    <section className="wtg-section" id="when-to-go">
      <div className="cj-head">
        <div className="cj-head-row">
          <div className="how-eyebrow">The decision that comes before all the others</div>
          <div className="cj-head-note">Islay&rsquo;s year, in one line</div>
        </div>
        <h2 className="how-title">When to go</h2>
      </div>

      <div className="wtg-layout">
        <div className="wtg-main">
          {months.length > 0 && (
            <div className="wtg-bar" role="img" aria-label="How busy Islay is through the year">
              {months.map((m) => {
                const season = m.seasonId ? seasonById.get(m.seasonId) : undefined;
                const isNow = m.order === currentMonthOrder;
                return (
                  <div className="wtg-month" key={m.name}>
                    <div
                      className={`wtg-month-bar ${
                        season ? BUSYNESS_CLASS[season.busyness] ?? "" : "wtg-b0"
                      }`}
                    />
                    <div className={isNow ? "wtg-month-label wtg-month-now" : "wtg-month-label"}>
                      {m.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {feature && (
            <div className="wtg-feature">
              <div className="wtg-feature-when">
                <span className="wtg-feature-month">{featureMonth?.name ?? ""}</span>
                <span className="wtg-feature-sub">{feature.name}</span>
              </div>
              <div className="wtg-feature-body">
                <h3 className="wtg-feature-title">{feature.eyebrow}</h3>
                <p className="wtg-feature-copy">{feature.copy}</p>
              </div>
            </div>
          )}

          {cards.length > 0 && (
            <div className="wtg-cards">
              {cards.map((s) => (
                <article className="wtg-card" key={s.id}>
                  <div className="wtg-card-eyebrow">{s.eyebrow}</div>
                  <p className="wtg-card-copy">{s.copy}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="wtg-side">
          <div className="wtg-side-head">
            <span className="wtg-side-title">What&rsquo;s on</span>
            <Link className="wtg-side-link" href="/local-features">
              All year &rarr;
            </Link>
          </div>
          {upcoming.length > 0 ? (
            <ul className="wtg-events">
              {upcoming.slice(0, 4).map((e) => (
                <EventRow key={e.id} event={e} today={today} />
              ))}
            </ul>
          ) : (
            <p className="wtg-events-empty">
              Nothing in the diary between now and the spring &mdash; which is rather the point of a
              winter trip.
            </p>
          )}

          {journalPost && (
            <Link className="wtg-journal" href={`/journal/${journalPost.slug}`}>
              <span className="wtg-journal-eyebrow">Blog</span>
              <span className="wtg-journal-title">{journalPost.title}</span>
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
