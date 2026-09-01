import Link from "next/link";
import Image from "next/image";
import type { Distillery, JournalPost, Tour } from "@/lib/types";
import { isPublishableTour, formatPrice } from "@/lib/pricing";
import { spellCount } from "@/lib/journey-derivations";

/**
 * "The distilleries" - the homepage's distillery section, rebuilt 30 Aug
 * 2026 to Mark's mockup and moved below Where to stay.
 *
 * WHAT IT REPLACES: the distillery half of FeaturedContent, whose three
 * featured slugs AND their descriptions lived in an EDITORIAL object
 * typed into that component. Changing which distilleries the homepage
 * featured, or what they said about them, needed a code deploy. Both now
 * come off the record: Homepage Badge picks the three, Tagline describes
 * them.
 *
 * EVERY NUMBER HERE IS COMPUTED. The eyebrow counts the distilleries
 * actually passed in; the headline price, tour count and price range come
 * from each distillery's own publishable Tours; the chips at the foot
 * carry the cheapest real tour at every distillery not featured above.
 *
 * DELIBERATELY NOT the Distilleries table's own `Price From` column. It
 * disagrees with the Tours table on every single distillery - it says £10
 * for Lagavulin, Bowmore, Bruichladdich, Bunnahabhain and Caol Ila, whose
 * cheapest actual tours are £20, £25, £25, £20 and £21. Tours is the
 * sourced table, it is what every other price on this site reads, and a
 * price is the one thing on this page a visitor might budget against.
 */

/** The cheapest tour a visitor can actually book here, ignoring
 *  placeholder rows and anything with no price on it. Undefined when the
 *  distillery sells nothing bookable, in which case the card and the chip
 *  both say so rather than printing a zero. */
function cheapestTour(d: Distillery): Tour | undefined {
  return d.tours
    .filter((t) => isPublishableTour(t) && t.price > 0)
    .sort((a, b) => a.price - b.price)[0];
}

/** spellCount returns lower case, which is right mid-sentence and wrong
 *  at the start of one. */
function sentenceCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function bookableTours(d: Distillery): Tour[] {
  return d.tours.filter((t) => isPublishableTour(t) && t.price > 0);
}

/** Six months. A tour whose price was last checked longer ago than this
 *  stops being quoted as fact and starts pointing at the distillery's own
 *  page instead.
 *
 *  The site owner's call (30 Aug 2026), and the honest version of the
 *  mockup's "we last checked prices in April - they've moved since": a
 *  price with a date on it is either current or it is a guess, and this
 *  is the line between them. Quiet for most of the year - every tour on
 *  the site was verified within the last six weeks as of today - which is
 *  the point. It exists for the month nobody looks. */
const STALE_AFTER_MONTHS = 6;

/** The order the three featured cards appear in, which is editorial and
 *  not Airtable's record order - the pick leads, the discovery sits in
 *  the middle, the oddity closes. Without this the row came out
 *  Kilchoman, Ardnahoe, Ardbeg, which is just the order those rows
 *  happen to sit in the table.
 *
 *  MUST STAY IN STEP WITH the Homepage Badge choices in Airtable. The
 *  sort below is indexOf-based, and indexOf returns -1 for a value not
 *  listed here - which sorts that card to the FRONT of the row rather
 *  than failing. So a badge renamed in Airtable and not renamed here
 *  silently reorders the section instead of breaking visibly.
 *
 *  "Newest Opening" became "Highest Distillery" on 31 Aug 2026 (Mark's
 *  call): Ardnahoe wore the newest badge and had not been Islay's newest
 *  since Laggan Bay began producing in April 2026. Highest is checked
 *  rather than repeated - Ardnahoe's own site claims it nowhere, so it
 *  was verified against terrain data instead, and three independent
 *  elevation models agree by a wide margin (EU-DEM 25m 60 m, Mapzen
 *  56 m, ASTER 30m 44 m, against a next-highest of 18 m at Kilchoman).
 *  The gap is large enough that disagreement between the models cannot
 *  touch the ranking. */
const BADGE_ORDER = ["Editor's Pick", "Hidden Gem", "Highest Distillery"];

function pricesAreStale(d: Distillery, now: Date): boolean {
  const tours = bookableTours(d);
  if (tours.length === 0) return false;
  const dates = tours.map((t) => t.lastVerified).filter((v): v is string => !!v);
  // No date at all is not the same as an old one: an unverified row is a
  // sourcing gap, flagged elsewhere, not a staleness signal here.
  if (dates.length === 0) return false;
  const newest = dates.sort().at(-1) as string;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STALE_AFTER_MONTHS);
  return new Date(newest) < cutoff;
}

/** "café on site" and friends - the facilities worth naming on a card
 *  this small. Read off the Facilities multi-select, matched loosely
 *  because the table uses both "Café" and "Farm Café". */
function cafeNote(d: Distillery): string | undefined {
  return d.facilities.some((f) => /caf[eé]/i.test(f)) ? "café on site" : undefined;
}

function DistilleryCard({ distillery: d, stale }: { distillery: Distillery; stale: boolean }) {
  const cheapest = cheapestTour(d);
  const tours = bookableTours(d);
  const dearest = tours.length > 1 ? tours[tours.length - 1] : undefined;
  const cafe = cafeNote(d);

  return (
    <article className="hd-card">
      {d.image && (
        <div className="hd-media">
          <Image
            src={d.image}
            alt={d.name}
            fill
            unoptimized
            sizes="(max-width: 900px) 100vw, 300px"
            style={{ objectFit: "cover" }}
          />
          {d.homepageBadge && <span className="hd-badge">{d.homepageBadge}</span>}
        </div>
      )}
      <div className="hd-body">
        <div className="hd-where">
          {d.region}
          {d.founded > 0 && <> &middot; est. {d.founded}</>}
        </div>
        <h3 className="hd-name">
          <Link href={`/distilleries/${d.slug}`}>{d.name}</Link>
        </h3>
        {d.tagline && <p className="hd-tagline">{d.tagline}</p>}

        <div className="hd-money">
          {stale ? (
            /* The price is older than this page is willing to stand
               behind, so the page stops quoting it. Saying when we last
               looked is the honest half; sending them to the distillery
               is the useful half. */
            <p className="hd-stale">
              We last checked these prices some time ago &mdash; they may have moved since.
            </p>
          ) : cheapest ? (
            <>
              <p className="hd-price">
                <strong>{formatPrice(cheapest.price)}</strong>{" "}
                <span>
                  {cheapest.name}
                  {cheapest.duration ? ` · ${cheapest.duration}` : ""}
                </span>
              </p>
              <p className="hd-range">
                {tours.length === 1
                  ? "One tour"
                  : `${sentenceCase(spellCount(tours.length))} tours, ${formatPrice(
                      cheapest.price
                    )} – ${formatPrice(dearest!.price)}`}
                {cafe ? ` · ${cafe}` : ""}
              </p>
            </>
          ) : (
            <p className="hd-range">No tour bookable here today{cafe ? ` · ${cafe}` : ""}</p>
          )}
        </div>

        <Link className="hd-link" href={`/distilleries/${d.slug}`}>
          {stale
            ? "Current times & prices"
            : tours.length === 2
              ? "See both and book"
              : tours.length > 2
                ? `See all ${spellCount(tours.length)} and book`
                : "Times & prices"}{" "}
          &rarr;
        </Link>
      </div>
    </article>
  );
}

export default function HomeDistilleries({
  distilleries,
  journalPosts,
}: {
  distilleries: Distillery[];
  journalPosts: JournalPost[];
}) {
  if (distilleries.length === 0) return null;

  // Featured = whichever carry a badge, in Airtable's own order, capped
  // at three. "the rest" is genuinely everything else, so a distillery
  // can never fall out of this section entirely by losing its badge.
  const featured = distilleries
    .filter((d) => d.homepageBadge)
    .sort((a, b) => BADGE_ORDER.indexOf(a.homepageBadge!) - BADGE_ORDER.indexOf(b.homepageBadge!))
    .slice(0, 3);
  const featuredSlugs = new Set(featured.map((d) => d.slug));
  const rest = distilleries.filter((d) => !featuredSlugs.has(d.slug));

  // The eyebrow, counted rather than typed. Jura is a distillery you can
  // visit but it is not on Islay, which is the whole reason it gets its
  // own clause instead of being folded into the number.
  const acrossTheSound = distilleries.filter((d) => /jura/i.test(d.region));
  const onIslay = distilleries.length - acrossTheSound.length;
  const eyebrow =
    acrossTheSound.length > 0
      ? `${spellCount(onIslay)} on Islay you can visit, and one across the sound`
      : `${spellCount(onIslay)} you can visit`;

  const now = new Date();
  const journalPost = journalPosts[0];

  return (
    <section className="hd-section" id="distilleries">
      <div className="cj-head">
        <div className="how-eyebrow">{eyebrow}</div>
        <h2 className="how-title">The distilleries</h2>
        <Link className="cj-head-note hd-head-link" href="/distilleries">
          All of them, with tour times &amp; prices &rarr;
        </Link>
      </div>

      <div className="hd-grid">
        {featured.map((d) => (
          <DistilleryCard key={d.slug} distillery={d} stale={pricesAreStale(d, now)} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="hd-rest">
          <span className="hd-rest-label">And the rest:</span>
          {rest.map((d) => {
            const cheapest = cheapestTour(d);
            return (
              <Link className="hd-chip" key={d.slug} href={`/distilleries/${d.slug}`}>
                {d.name}
                {/* A distillery with nothing bookable says nothing about
                    money, rather than a zero or a stale Price From. */}
                {cheapest && <span className="hd-chip-price">{formatPrice(cheapest.price)}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {journalPost && (
        <Link className="hd-journal" href={`/journal/${journalPost.slug}`}>
          <span className="hd-journal-eyebrow">From the blog</span>
          <span className="hd-journal-title">{journalPost.title}</span>
          {/* No reading time on JournalPost, and the homepage is not the
              place to start estimating one from the body text. */}
          <span className="hd-journal-meta">Read it &rarr;</span>
        </Link>
      )}
    </section>
  );
}
