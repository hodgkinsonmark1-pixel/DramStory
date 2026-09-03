"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Area, FeaturedStay } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { spellCount } from "@/lib/journey-derivations";

/** Matches .wts-grid's own column gap - the carousel step is one card
 *  plus one gap, and reading it from a constant keeps the two in step. */
const STAYS_GAP = 16;

/**
 * "Where to stay" - rebuilt 30 Aug 2026 to Mark's mockup, and moved
 * directly under the day plans.
 *
 * WHAT IT REPLACES: two stacked grids, one labelled "Areas" and one
 * "Featured hotels", both using the site-wide .discover-card. That put
 * four villages and four hotels on equal footing when only one of them
 * is a decision - you book a hotel, you don't book a village. So the
 * stays are the cards now and the villages are a line of links beneath
 * them, for the visitor who hasn't settled on a part of the island yet.
 *
 * "YOUR BASE" IS LIVE, not decorative. It reads the same trip answers
 * the hero questions write and /days reads, so a visitor who has said
 * where they're staying sees it marked here without asking again. The
 * fallback is DEFAULT_TRIP_ANSWERS.base, which is FEATURED_STAYS[0] -
 * The Machrie - the same default the planner already uses. That is why
 * this is a client component: everything else on it is server data.
 *
 * WHAT THE MOCKUP ASKED FOR AND DOES NOT GET:
 *   - "Drive times shown from your base", the right-hand section note.
 *     Stay Distillery Distances holds FOUR rows in total, all of them
 *     Bridgend Hotel, covering four of the ten distilleries. There is no
 *     drive time to show from any base, and a note promising one over
 *     cards that carry none would be worse than no note.
 *   - "Shortest average drive to everywhere" on the Bridgend card, for
 *     the same reason - it is a comparative claim across four stays when
 *     three of them have no distance data at all. The Card Note column's
 *     own description in Airtable says not to write claims like it.
 *   - A fourth village in the row. Areas holds three live records; there
 *     is no Bridgend area yet. The row counts what exists rather than
 *     naming four and dead-linking one.
 */

/** "West Islay" -> "the west". The Areas table's Distillery Region is a
 *  five-choice singleSelect (South, Central, West, North, Jura) written
 *  for filtering, not for reading in a sentence; this is the reading
 *  form, and an unrecognised choice falls through to the raw value
 *  rather than being dropped, so adding a sixth region shows something
 *  honest until someone words it. */
const REGION_PHRASE: Record<string, string> = {
  "West Islay": "the west",
  "South Islay": "the south",
  "Central Islay": "the middle",
  "North Islay": "the north",
  Jura: "Jura",
};

/** The line above the stay's name: its village, and which part of the
 *  island that village is in.
 *
 *  The region comes from the Area this stay LINKS to, matched against the
 *  Areas this page already has - not inferred from the village name,
 *  which would go wrong on exactly the record where it matters:
 *  Bridgend Hotel's Nearest Area reads "Bridgend village centre" and
 *  there is no Bridgend area, so it links to Bowmore. A stay with no
 *  link at all (The Machrie today) shows its village and stops. */
function stayWhere(stay: FeaturedStay, areas: Area[]): string | undefined {
  const village = stay.nearestArea?.trim();
  const linked = areas.find((a) => stay.areaIds.includes(a.id));
  const region = linked?.distilleryRegion
    ? (REGION_PHRASE[linked.distilleryRegion] ?? linked.distilleryRegion)
    : undefined;
  if (village && region) return `${village} \u00b7 ${region}`;
  return village ?? region;
}

function StayCard({ stay, isBase, areas }: { stay: FeaturedStay; isBase: boolean; areas: Area[] }) {
  const where = stayWhere(stay, areas);
  return (
    <article className={isBase ? "wts-card wts-card-base" : "wts-card"}>
      {stay.heroImageUrl && (
        <div className="wts-media">
          {/* `unoptimized` for the same reason every other Airtable image
              on this site carries it: the src is /api/attachment with a
              query string, which next/image's optimiser rejects unless
              declared in images.localPatterns, and this project
              deliberately doesn't configure that. */}
          <Image
            src={stay.heroImageUrl}
            alt={stay.name}
            fill
            unoptimized
            sizes="(max-width: 900px) 100vw, 240px"
            style={{ objectFit: "cover" }}
          />
          {isBase && <span className="wts-badge">Your base</span>}
        </div>
      )}
      <div className="wts-body">
        {where && <div className="wts-where">{where}</div>}
        <h3 className="wts-name">
          <Link href={`/stays/${stay.slug}`}>{stay.name}</Link>
        </h3>
        {stay.whyStay && <p className="wts-why">{stay.whyStay}</p>}
        {stay.cardNote && <p className="wts-note">{stay.cardNote}</p>}
        {/* The booking link goes OUT, to the hotel's own booking engine,
            and is the one thing on this card that isn't the card-wide
            link - so it sits above the title's ::after and carries
            rel="noopener". Nothing here is paid to DramStory. */}
        {stay.bookingUrl && (
          <a className="wts-book" href={stay.bookingUrl} target="_blank" rel="noopener noreferrer">
            Check availability &rarr;
          </a>
        )}
      </div>
    </article>
  );
}

export default function WhereToStay({ areas, featuredStays }: { areas: Area[]; featuredStays: FeaturedStay[] }) {
  const trip = useTrip();
  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;

  /* THE STAYS CAROUSEL (03 Sep 2026, mobile design panel 2: "Stays get
     the same swipe-and-dots treatment as the days - two horizontal
     patterns doing the same job differently would be the thing that
     reads as sloppy"). Same shape as HomeDayPlans' carousel on purpose:
     index in state, swipe keeps it honest via onScroll, dots drive it.
     No arrows here - four cards is a short enough row that the dots
     carry it, and the section head already has the area pills competing
     for that corner.

     Four across on desktop is untouched: .wts-grid only becomes a
     scroll container below the mobile breakpoint, so on desktop the
     ref, the index and the scroll handler simply never do anything. */
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

  const onTrackScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + STAYS_GAP : el.clientWidth;
    setIndex(Math.round(el.scrollLeft / step));
  }, []);

  if (featuredStays.length === 0) return null;

  /* "1 of 4 - your base first" (mobile design panel 2). The base card is
     ORDERED first, not merely badged: on a one-card-wide swipe the
     difference is between seeing your own hotel immediately and swiping
     past three others to find it. A visitor who answered with a village,
     or who has not answered at all, gets Airtable's own order untouched. */
  const isBaseStay = (stay: FeaturedStay) => baseKind === "hotel" && stay.slug === base;
  const hasBase = featuredStays.some(isBaseStay);
  const orderedStays = hasBase
    ? [...featuredStays].sort((a, b) => Number(isBaseStay(b)) - Number(isBaseStay(a)))
    : featuredStays;

  return (
    <section className="wts-section" id="where-to-stay">
      <div className="sec-head">
        <div className="sec-head-text">
          <div className="how-eyebrow">Once you know the shape of the trip</div>
          <h2 className="how-title">Where to stay</h2>
        </div>
        {/* The village links moved up here as pills (01 Sep 2026, final
            design). They were a "Not sure which village yet?" line at the
            foot of the section, which is where a reader looks last and
            needs it first.

            These are the THREE REAL AREAS with live /areas/[slug] pages,
            not the four moods - Mark's correction to the design, which
            showed the four. The moods are an editorial grouping with
            nothing behind them; these three are real pages. The row
            counts what exists rather than naming four and dead-linking
            one. */}
        {areas.length > 0 && (
          <div className="sec-head-aside wts-areas">
            <span className="wts-areas-label">
              {/* Explicit {" "} rather than a literal space. The source had
                  one on the same line and the build dropped it anyway -
                  the rendered DOM was `four<!-- -->featured hotels`, the
                  comment marker React emits between two adjacent text
                  nodes, with the whitespace gone. Caught on the preview,
                  not in the source. */}
              {spellCount(featuredStays.length)}{" "}
              featured hotels &mdash; or pick an area:
            </span>
            <span className="wts-pills">
              {areas.map((a) => (
                <Link key={a.slug} className="wts-pill" href={`/areas/${a.slug}`}>
                  {a.name} <span aria-hidden="true">&rarr;</span>
                </Link>
              ))}
            </span>
          </div>
        )}
      </div>

      <div className="wts-grid" ref={trackRef} onScroll={onTrackScroll}>
        {orderedStays.map((stay) => (
          <StayCard
            key={stay.slug}
            stay={stay}
            areas={areas}
            // Only a hotel answer can mark a hotel. A visitor who
            // answered with a village has told us the area, not the bed,
            // and no card here is their base.
            isBase={isBaseStay(stay)}
          />
        ))}
      </div>

      {/* Real buttons, not decoration - the carousel must be drivable
          without a swipe. Mirrors .hdp-dots' own tablist. Hidden above
          the mobile breakpoint, where all four cards are already on
          screen and there is nothing to page through. */}
      {orderedStays.length > 1 && (
        <div className="wts-dots" role="tablist" aria-label="Choose a place to stay">
          {orderedStays.map((stay, i) => (
            <button
              key={stay.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={stay.name}
              className={i === index ? "wts-dot is-on" : "wts-dot"}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
      {orderedStays.length > 1 && (
        <p className="wts-count">
          {index + 1} of {orderedStays.length}
          {hasBase ? " \u00b7 your base first" : ""}
        </p>
      )}
    </section>
  );
}
