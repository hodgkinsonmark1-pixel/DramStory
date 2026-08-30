"use client";

import Link from "next/link";
import Image from "next/image";
import type { Area, FeaturedStay } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";

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

function StayCard({ stay, isBase }: { stay: FeaturedStay; isBase: boolean }) {
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
        {stay.nearestArea && <div className="wts-where">{stay.nearestArea}</div>}
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

  if (featuredStays.length === 0) return null;

  return (
    <section className="wts-section" id="where-to-stay">
      <div className="cj-head">
        <div className="cj-head-row">
          <div className="how-eyebrow">Once you know the shape of the trip</div>
        </div>
        <h2 className="how-title">Where to stay</h2>
      </div>

      <div className="wts-grid">
        {featuredStays.map((stay) => (
          <StayCard
            key={stay.slug}
            stay={stay}
            // Only a hotel answer can mark a hotel. A visitor who
            // answered with a village has told us the area, not the bed,
            // and no card here is their base.
            isBase={baseKind === "hotel" && stay.slug === base}
          />
        ))}
      </div>

      {areas.length > 0 && (
        <p className="wts-villages">
          <span>Not sure which village yet?</span>{" "}
          {areas.map((a, i) => (
            <span key={a.slug}>
              {i > 0 && <span className="wts-sep"> &middot; </span>}
              <Link href={`/areas/${a.slug}`}>{a.name}</Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
