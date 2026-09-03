import Link from "next/link";
import type { LocalEvent, MonthBand, Season } from "@/lib/types";

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



/** Spelled out rather than numeric: this sits inside a sentence that
 *  already carries a year, and two numerals in one line read as a
 *  table. */
const SPELLED = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
];

/** "nine months away" / "three weeks away" - how far off the festival is,
 *  in the terms someone planning actually thinks in.
 *
 *  Self-contained since 01 Sep 2026. It used to phrase the output of a
 *  shared relativeWhen(), which moved out with the What's on column when
 *  that became its own section - and What's on no longer needs it, since
 *  its rows show real dates rather than a countdown. Rather than keep a
 *  helper alive in another file for one caller, the arithmetic lives
 *  here, where the only sentence that uses it is.
 *
 *  Undefined for anything already started, or for a provisional event
 *  whose whole point is that nobody has announced a date. */
function awayPhrase(event: LocalEvent, today: Date): string | undefined {
  if (!event.datesConfirmed) return undefined;
  const days = Math.round((new Date(event.date).getTime() - today.getTime()) / 86_400_000);
  if (days < 1) return undefined;
  if (days === 1) return "a day away";
  if (days < 14) return `${SPELLED[days] ?? days} days away`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${SPELLED[weeks] ?? weeks} weeks away`;
  const months = Math.round(days / 30);
  return `${SPELLED[months] ?? months} months away`;
}

/** An event name without its parenthetical subtitle: "Fèis Ìle 2027
 *  (Islay Festival of Music & Malt)" reads fine as a listing row but not
 *  mid-sentence. */
function shortEventName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}


export default function WhenToGo({
  seasons,
  months,
  localEvents,
}: {
  seasons: Season[];
  months: MonthBand[];
  localEvents: LocalEvent[];
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

  // The event the feature band is actually about - found by month rather
  // than by name, so renaming either the band or the festival cannot
  // silently empty the notice. Confirmed only: a provisional date is not
  // something to tell people to book against.
  const featureMonthOrder = featureMonth?.order;
  const featureEvent = upcoming.find(
    (e) => e.datesConfirmed && featureMonthOrder !== undefined && new Date(e.date).getMonth() + 1 === featureMonthOrder
  );
  const featureAway = featureEvent ? awayPhrase(featureEvent, today) : undefined;


  return (
    <section className="wtg-section" id="when-to-go">
      <div className="sec-head">
        <div className="sec-head-text">
          <div className="how-eyebrow">The decision that comes before all the others</div>
          <h2 className="how-title">When to go</h2>
          <div className="sec-head-note">Islay&rsquo;s year, in one line.</div>
        </div>
      </div>

      <div className="wtg-main-only">
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

          {/* The three bands first, then the festival. The design's own
              order, and the right one: the shape of the year is the
              general answer, and the one week that sells out is the
              exception to it. */}
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

          {feature && (
            <div className="wtg-feature">
              <div className="wtg-feature-body">
                <div className="wtg-feature-when">
                  <span className="wtg-feature-month">{featureMonth?.name ?? ""}</span>
                  {feature.monthNote && (
                    <span className="wtg-feature-sub">{feature.monthNote}</span>
                  )}
                </div>
                <h3 className="wtg-feature-title">{feature.eyebrow}</h3>
                <p className="wtg-feature-copy">{feature.copy}</p>

                {featureEvent && featureAway && (
                  /* The one booking consequence on this whole section,
                     and only shown when there is a real dated event to
                     hang it on - the countdown is computed from that
                     event's own date, so it cannot go stale or need
                     editing each year. Folded inside the panel on
                     01 Sep 2026 (final design); it was a separate strip
                     beneath, which read as a second, unrelated warning. */
                  <p className="wtg-notice">
                    <strong>
                      {shortEventName(featureEvent.name)} is {featureAway} and Islay is already
                      filling up.
                    </strong>{" "}
                    If that&rsquo;s your week, book the bed before anything else.
                  </p>
                )}
              </div>

              <div className="wtg-feature-actions">
                {/* The bed is the first thing to go and the only thing
                    with a deadline, so it is the filled button. "Where's
                    still free" in an earlier mockup promised live
                    availability this site does not have; this points at
                    the stays section instead, which is honest. */}
                <Link className="wtg-feature-cta" href="#where-to-stay">
                  Book the bed first &rarr;
                </Link>
                {/* Goes to the day plans rather than the festival's own
                    site: "plan for" is the thing this site does, and
                    feisile.co.uk is already linked from the event row in
                    What's on below. */}
                <Link className="wtg-feature-alt" href="/days">
                  Plan for {feature.name} &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
