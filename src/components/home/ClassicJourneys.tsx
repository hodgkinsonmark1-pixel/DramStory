import Link from "next/link";
import Image from "next/image";
import type { Journey } from "@/lib/types";
import {
  journeyDistilleryCount,
  journeyTourTotal,
  formatTourPrice,
  spellCount,
} from "@/lib/journey-derivations";

/**
 * The homepage's Classic Journeys section - rebuilt 17 Aug 2026 to read
 * the real Journeys table instead of the hardcoded CLASSIC_JOURNEYS array
 * that used to live in src/lib/journeys-data.ts (now deleted).
 *
 * WHY: there are four journeys, not the three the array knew about, and
 * every string in it had drifted from Airtable - different names,
 * different descriptions, night counts that were never in it at all.
 * Nothing on these cards is authored in this file any more: name, region
 * kicker, card description, nights, hero image and its credit all come
 * off the Journey record, and the distillery count is computed from the
 * Journey's own resolved Days (journeyDistilleryCount) rather than a
 * hand-kept list of slugs. Same data path /journeys/[slug] renders from,
 * so a card and the page it links to cannot disagree.
 *
 * LAYOUT is the site owner's own: The Islay Grand Tour full-width across
 * the top, the other three in a row beneath it, all four stacked in one
 * column on a narrow screen.
 *
 * The "Prefer to plan day by day?" line that used to close this section
 * is GONE (30 Aug 2026). It was standing in for a day-plans section that
 * did not exist; that section is now directly underneath this one and
 * carries its own "Browse all sixteen" link, so the line was pointing
 * past the thing it was pointing at.
 *
 * 30 AUG 2026 - to the site owner's mockup, decisions taken in session:
 *   - Section heading is now "Four journeys, already planned" over an
 *     eyebrow, replacing "Curated routes / Classic journeys". The count
 *     is SPELLED FROM journeys.length, never typed: publish a fifth
 *     journey and the heading says five on the next build. Same rule the
 *     day-plans heading follows by carrying no count at all - a number on
 *     a page is only allowed here if something computes it.
 *   - Meta line gains the tours subtotal, computed by journeyTourTotal
 *     from the tour each Day Stop actually books. It is labelled "in
 *     tours" because that is all it is: no beds, no car, no ferry. The
 *     Grand Tour reads GBP 277.50pp today and would read 527.50 with the
 *     Port Ellen day still attached - the figure moves with the records,
 *     which is the point of not typing it.
 *   - The lead card gains distillery chips and a CTA affordance. The
 *     three cards under it keep a plain name line, per the owner's call
 *     (30 Aug 2026): chips on all four flatten the hierarchy the lead
 *     card exists to create.
 *
 * THREE THINGS IN THE MOCKUP ARE DELIBERATELY NOT BUILT HERE, each
 * flagged to the owner rather than quietly rendered:
 *
 *   1. The "driver rotates across the six days" pill. Dropped on the
 *      owner's call - there is no field behind it, and the days-section
 *      version of the same idea ("Driver keeps N drams") needs a
 *      per-distillery miniatures policy that no record holds. See the
 *      standing note at the top of journey-derivations.ts.
 *   2. The right-aligned section note "Each one drivable exactly as
 *      written". It is not true of all four: The Kildalton Road is the
 *      walkable journey, and its whole Claim is "no car to hire, no
 *      timetable, and nobody left out of the tasting". A blanket line
 *      saying every journey is drivable contradicts the card underneath
 *      it that sells the opposite.
 *   3. The secondary "Start it as your own trip" action beside the
 *      primary CTA. /journeys/[slug] deliberately collapsed exactly this
 *      pair into one ask on 18 Aug 2026 - see AddJourneyToTrips's own
 *      comment: "replacing the two equal buttons that used to force a
 *      choice before anyone knew what either did". Reinstating the pair
 *      on a homepage card, where the visitor has read even less, would
 *      undo that decision in the harder place. Left as one link until
 *      the owner says otherwise.
 */

/** The journey that leads the section, per the owner's layout. Matched by
 *  slug rather than position so re-ordering the Airtable view can't
 *  quietly demote it; if it is ever renamed or removed, the fallback is
 *  simply the first journey in the same deterministic order used below,
 *  never an empty lead slot. */
const LEAD_SLUG = "islay-grand-tour";

/** Deterministic order for the three cards under the lead: longest
 *  journey first, ties broken by name, so the row never depends on
 *  Airtable's own record order. */
function byNightsThenName(a: Journey, b: Journey): number {
  if (b.nights !== a.nights) return b.nights - a.nights;
  return a.name.localeCompare(b.name);
}

/** Every distillery this journey visits, by NAME, in first-visit order
 *  and without repeats. Same traversal journeyDistilleryCount counts and
 *  journeyDistillerySlugs enumerates - kept here rather than imported
 *  because that module deals in slugs, and what a card shows is the name
 *  off the same resolved stop. */
function journeyDistilleryNames(journey: Journey): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const day of journey.days) {
    for (const stop of day.stops) {
      if (seen.has(stop.distillery.slug)) continue;
      seen.add(stop.distillery.slug);
      names.push(stop.distillery.name);
    }
  }
  return names;
}

/** Same `[label](url)` convention every other Hero Image Credit on the
 *  site uses (Areas, Featured Stays, Explore, the Journey page's own
 *  hero). A credit that isn't a markdown link still renders as plain
 *  text rather than being dropped - attribution is not optional once a
 *  CC-licensed photo is on the page. */
function PhotoCredit({ credit }: { credit: string }) {
  const match = credit.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const label = match ? match[1] : credit;
  const href = match ? match[2] : null;
  if (!href) return <span className="cj-card-credit">{label}</span>;
  return (
    <a className="cj-card-credit" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

function JourneyCard({ journey, lead = false }: { journey: Journey; lead?: boolean }) {
  const distilleries = journeyDistilleryCount(journey);
  const names = journeyDistilleryNames(journey);
  const tourTotal = journeyTourTotal(journey);

  // Only ever what the record knows. A journey with no nights set (none
  // today) drops the clause rather than printing "0 nights", same rule
  // the count already follows - and the tours subtotal drops the same
  // way rather than printing a zero for a journey nobody has priced yet.
  // 30 Aug 2026, to the owner's mockup: on the LEAD card the region is a
  // badge over the photograph; on the three smaller cards it folds into
  // the meta line instead of owning a line of its own above it. Same
  // string either way - Region Label, untouched - only where it sits.
  // That is one line less per small card, which is most of why the
  // mockup reads tighter than the first build did.
  // The distillery count is LEAD-ONLY (30 Aug 2026, the owner's call
  // against the mockup). On the three smaller cards it was the fourth
  // item in the line, wrapped it to two, and said what the distillery
  // names directly beneath it already say. The lead card keeps it
  // because it carries no name line - it has chips instead, and the
  // count is the thing the chips are a list of.
  /* The row's numbers. The lead card no longer uses this - it sets its
     three figures out as a labelled row of its own - so this is the
     rows' line only: nights and the tour subtotal, with the region
     lifted out to its own eyebrow above the name (01 Sep 2026, final
     design). Either part drops rather than printing a zero. */
  const meta = [
    journey.nights > 0 ? `${journey.nights} ${journey.nights === 1 ? "night" : "nights"}` : null,
    tourTotal > 0 ? `${formatTourPrice(tourTotal)}pp` : null,
  ].filter((bit): bit is string => bit !== null);

  // The CTA names what it opens. On the three smaller cards that is a
  // real day count spelled out ("See the two days"); on the lead it is
  // deliberately NOT a day count - the Grand Tour is four touring days
  // inside a five-night trip, so any number there misleads whichever one
  // it picks. "See the itinerary" is the honest label for a card whose
  // day count and night count disagree.
  const dayCount = journey.days.length;
  const cta = lead
    ? "See the itinerary"
    : `See the ${spellCount(dayCount)} ${dayCount === 1 ? "day" : "days"}`;

  if (!lead) {
    /* THE THREE ROWS (01 Sep 2026, final design). The other journeys are
       no longer cards: they are rows, because a card promises a
       photograph and a decision, and these three are a shortlist you
       scan. Region, name, hook, distilleries, then the numbers and the
       way in - left to right, in the order a reader asks for them. */
    return (
      <li className="cj-row">
        <div className="cj-row-id">
          {journey.regionLabel && (
            <div className="cj-row-region">{regionInMeta(journey.regionLabel)}</div>
          )}
          <h3 className="cj-row-name">
            <Link href={`/journeys/${journey.slug}`}>{journey.name}</Link>
          </h3>
        </div>
        {journey.cardDescription && <p className="cj-row-hook">{journey.cardDescription}</p>}
        {names.length > 0 && <p className="cj-row-names">{names.join(" · ")}</p>}
        <div className="cj-row-aside">
          {meta.length > 0 && <div className="cj-row-meta">{meta.join(" · ")}</div>}
          <span className="cj-row-cta" aria-hidden="true">
            {cta} &rarr;
          </span>
        </div>
      </li>
    );
  }

  /* THE LEAD. A wide navy panel with the photograph bleeding off its
     right-hand end, the distilleries as chips, and the three numbers a
     reader compares journeys on set out as a row above the button. */
  return (
    <article className="cj-lead">
      {journey.heroImage && (
        <div className="cj-lead-media">
          {/* `unoptimized`, non-negotiably: this src is /api/attachment
              with a query string, and a local src carrying one is only a
              legal input to next/image's optimiser if it's declared in
              images.localPatterns, which this project deliberately
              doesn't configure (see the same note on the journey page's
              own hero). Without it next/image throws during render -
              which is exactly what took all four journey pages down when
              the Hero Images first landed. */}
          <Image
            src={journey.heroImage}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 900px) 100vw, 620px"
            style={{ objectFit: "cover" }}
          />
          {journey.heroImageCredit && <PhotoCredit credit={journey.heroImageCredit} />}
        </div>
      )}
      <div className="cj-lead-body">
        {journey.regionLabel && <div className="cj-lead-eyebrow">{journey.regionLabel}</div>}
        <h3 className="cj-lead-name">
          <Link href={`/journeys/${journey.slug}`}>{journey.name}</Link>
        </h3>
        {journey.cardDescription && <p className="cj-lead-desc">{journey.cardDescription}</p>}

        {names.length > 0 && (
          <ul className="cj-chips">
            {names.map((name) => (
              <li key={name} className="cj-chip">
                {name}
              </li>
            ))}
          </ul>
        )}

        <div className="cj-lead-foot">
          {/* The three numbers as labelled figures rather than a run-on
              meta line. Each is dropped rather than zeroed when the data
              cannot support it - a journey nobody has priced shows two
              figures, not a £0. */}
          <dl className="cj-stats">
            {journey.nights > 0 && (
              <div className="cj-stat">
                <dt>Nights</dt>
                <dd>{journey.nights}</dd>
              </div>
            )}
            {distilleries > 0 && (
              <div className="cj-stat">
                <dt>Distilleries</dt>
                <dd>{distilleries}</dd>
              </div>
            )}
            {tourTotal > 0 && (
              <div className="cj-stat">
                <dt>Tours, per person</dt>
                <dd>{formatTourPrice(tourTotal)}</dd>
              </div>
            )}
          </dl>
          <Link className="cj-lead-cta" href={`/journeys/${journey.slug}`}>
            {cta} &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Region Label as it reads inside a meta line: "The West" -> "west".
 *  
 *  Added 31 Aug 2026 (Mark's item 3). The Airtable values open with a
 *  definite article, which is right where the label stands alone as a
 *  badge over the lead card's photograph, but inside the small cards'
 *  meta line it was four characters that pushed
 *  "the peated south · 2 nights · £66.50pp in tours" onto a second line.
 *  Dropping it fits the line.
 *
 *  Display-only, and applied ONLY to the meta line - the Airtable field
 *  is untouched and the lead card's badge still shows the full label,
 *  because there it is a title rather than part of a sentence. Falls
 *  through unchanged for any label that does not start with "the ", so a
 *  future region worded differently is not silently mangled. */
function regionInMeta(label: string): string {
  const stripped = label.replace(/^the\s+/i, "");
  return stripped.length > 0 ? stripped : label;
}

export default function ClassicJourneys({ journeys }: { journeys: Journey[] }) {
  if (journeys.length === 0) return null;

  const ordered = [...journeys].sort(byNightsThenName);
  const lead = ordered.find((j) => j.slug === LEAD_SLUG) ?? ordered[0];
  const rest = ordered.filter((j) => j.slug !== lead.slug);

  // Spelled from the real count, never typed - see the file comment.
  const count = spellCount(journeys.length);
  const heading = `${count.charAt(0).toUpperCase()}${count.slice(1)} ${
    journeys.length === 1 ? "journey" : "journeys"
  }, already planned`;

  return (
    <section className="journeys-section" id="classic-journeys">
      <div className="cj-head">
        <div className="how-eyebrow">If you&rsquo;d rather not build it yourself</div>
        <h2 className="how-title">{heading}</h2>
        {/* The mockup's note said "Each one drivable exactly as
            written", which is false of The Kildalton Road sitting
            directly beneath it selling the opposite. This says the thing
            that IS true of all four and that nothing else on the page
            says: every figure on these cards is summed from the tours
            the days actually book. Sits under the title rather than
            opposite the eyebrow since the head centred (31 Aug 2026). */}
        <div className="cj-head-note">Each one costed from the tours it books.</div>
      </div>

      <div className="cj-layout">
        <JourneyCard journey={lead} lead />
        {rest.length > 0 && (
          <ul className="cj-rows">
            {rest.map((journey) => (
              <JourneyCard key={journey.slug} journey={journey} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
