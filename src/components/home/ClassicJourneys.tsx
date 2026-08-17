import Link from "next/link";
import Image from "next/image";
import type { Journey } from "@/lib/types";
import { journeyDistilleryCount } from "@/lib/journey-derivations";

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
 * The old "not live"/"Coming soon" greying-out is gone with the array.
 * It existed because two of the three hardcoded journeys had no
 * itinerary behind them; every Journey record now has real Days and a
 * real page, so every card is a plain link and the dismissable notice
 * that explained the dead ones is no longer needed.
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
  // Only ever what the record knows. A journey with no nights set (none
  // today) drops the clause rather than printing "0 nights", same rule
  // the count already follows.
  const meta = [
    journey.nights > 0 ? `${journey.nights} ${journey.nights === 1 ? "night" : "nights"}` : null,
    distilleries > 0 ? `${distilleries} ${distilleries === 1 ? "distillery" : "distilleries"}` : null,
  ].filter((bit): bit is string => bit !== null);

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
          {journey.heroImageCredit && <PhotoCredit credit={journey.heroImageCredit} />}
        </div>
      )}
      <div className="cj-card-body">
        {journey.regionLabel && <div className="cj-card-kicker">{journey.regionLabel}</div>}
        {/* The link is on the title, and its ::after covers the whole
            card - so the card is clickable everywhere without wrapping
            the photo credit's own link in a second anchor. */}
        <h3 className="cj-card-name">
          <Link href={`/journeys/${journey.slug}`}>{journey.name}</Link>
        </h3>
        {journey.cardDescription && <p className="cj-card-desc">{journey.cardDescription}</p>}
        {meta.length > 0 && <div className="cj-card-meta">{meta.join(" · ")}</div>}
      </div>
    </article>
  );
}

export default function ClassicJourneys({ journeys }: { journeys: Journey[] }) {
  if (journeys.length === 0) return null;

  const ordered = [...journeys].sort(byNightsThenName);
  const lead = ordered.find((j) => j.slug === LEAD_SLUG) ?? ordered[0];
  const rest = ordered.filter((j) => j.slug !== lead.slug);

  return (
    <section className="journeys-section" id="classic-journeys">
      <div className="how-eyebrow">Curated routes</div>
      <h2 className="how-title">Classic journeys</h2>

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
