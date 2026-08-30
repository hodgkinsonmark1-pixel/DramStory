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
 *      pair into one ask on 18 Aug 2026 - see PutInPlannerButton's own
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
  const meta = [
    !lead && journey.regionLabel ? journey.regionLabel : null,
    journey.nights > 0 ? `${journey.nights} ${journey.nights === 1 ? "night" : "nights"}` : null,
    distilleries > 0 ? `${distilleries} ${distilleries === 1 ? "distillery" : "distilleries"}` : null,
    tourTotal > 0 ? `${formatTourPrice(tourTotal)}pp in tours` : null,
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

  return (
    <article className={lead ? "cj-card cj-card-lead" : "cj-card"}>
      {journey.heroImage && (
        <div className="cj-card-media">
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
            alt={journey.name}
            fill
            unoptimized
            sizes={lead ? "(max-width: 760px) 100vw, 480px" : "(max-width: 760px) 100vw, 320px"}
            style={{ objectFit: "cover" }}
          />
          {lead && journey.regionLabel && (
            <span className="cj-card-badge">{journey.regionLabel}</span>
          )}
          {journey.heroImageCredit && <PhotoCredit credit={journey.heroImageCredit} />}
        </div>
      )}
      <div className="cj-card-body">
        {meta.length > 0 && <div className="cj-card-meta">{meta.join(" · ")}</div>}
        {/* The link is on the title, and its ::after covers the whole
            card - so the card is clickable everywhere without wrapping
            the photo credit's own link in a second anchor. The CTA below
            is therefore a visual affordance, not a second tab stop:
            aria-hidden keeps a keyboard or screen-reader user from being
            offered the same destination twice on one card. */}
        <h3 className="cj-card-name">
          <Link href={`/journeys/${journey.slug}`}>{journey.name}</Link>
        </h3>
        {journey.cardDescription && <p className="cj-card-desc">{journey.cardDescription}</p>}

        {names.length > 0 &&
          (lead ? (
            <ul className="cj-chips">
              {names.map((name) => (
                <li key={name} className="cj-chip">
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="cj-card-names">{names.join(" · ")}</p>
          ))}

        <span className={lead ? "cj-cta cj-cta-lead" : "cj-cta"} aria-hidden="true">
          {cta} &rarr;
        </span>
      </div>
    </article>
  );
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
      </div>

      <div className="cj-layout">
        <JourneyCard journey={lead} lead />
        {rest.length > 0 && (
          <div className="cj-row">
            {rest.map((journey) => (
              <JourneyCard key={journey.slug} journey={journey} />
            ))}
          </div>
        )}
      </div>

      <p className="journeys-hub-link">
        Prefer to plan day by day? <Link href="/days">Browse all Pre-Designed Days &rarr;</Link>
      </p>
    </section>
  );
}
