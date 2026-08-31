"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Distillery } from "@/lib/types";
import { areaMembership } from "@/lib/area-membership";
import {
  ISLAY_OUTLINE_PATH,
  ISLAY_VIEWBOX,
  ISLAY_OUTLINE_ATTRIBUTION,
  partitionIslay,
} from "@/lib/islay-outline";

/**
 * "Islay has four moods" - built 31 Aug 2026, revised the same day to
 * Mark's notes: real areas on the map rather than dots, prominent
 * numbers, hover linking the map to the writing, distillery information
 * that updates as more open, and a way through to all of them.
 *
 * THE FOUR AREAS ARE NOT NEW. DREAM_AREAS in lib/dream-areas.ts already
 * defined these four groupings and drives the hero's "drawn to"
 * question, trip-context's default answer and the /dreaming pages. This
 * section reads that same array rather than restating it.
 *
 * WHAT IS COMPUTED AND WHAT IS WRITTEN. Everything factual on this
 * section is derived at render time from the Distilleries table:
 * which distilleries are in each area, how many, where each area's
 * centre is, and therefore the shape of each area on the map. The only
 * hand-written things are the area names and the one-line descriptions
 * below, which are voice - a new distillery opening in the west does not
 * change what the west is like. That split is the point of Mark's
 * "dynamic as more open" note: MOOD_COPY deliberately names no
 * distilleries and counts nothing, so it cannot go stale. The names and
 * the count live in the row beneath it, and come from the data.
 *
 * Portintruan and Laggan Bay are already in the table, unopened. The day
 * their records become visitable they appear in their areas, the counts
 * move, the centres shift and the map redraws itself - with no code
 * change and nothing to remember.
 *
 * ABOUT THE MAP. The four regions are a Voronoi partition of the real
 * coastline: every point on the island is coloured for whichever area's
 * distilleries are nearest to it. This matters - the shapes are a
 * consequence of where the distilleries are, not lines someone drew.
 * See partitionIslay in lib/islay-outline.ts.
 *
 * STILL NOT HERE: the "N min away" drive time from the original mockup.
 * It needs twenty routed journey times we don't hold - Stay Distillery
 * Distances has four rows in the whole table - and straight-line
 * distance is not a stand-in on an island where the road to Bunnahabhain
 * is a single-track switchback. Same call, and the same reason, as the
 * drive times WhereToStay.tsx declines to show.
 */

/** The line under each area name, keyed by DREAM_AREAS id.
 *
 *  Written to survive the island changing: no distillery is named and no
 *  count appears in any of these four sentences, because both of those
 *  now render from the data directly beneath. The one number-like claim
 *  is "the island's oldest", which a distillery opening in future cannot
 *  falsify.
 *
 *  Hardcoded here rather than in Airtable, the same split BeforeYouGo
 *  uses: this is written voice that doesn't go stale, and there is no
 *  Areas record for any of these four to hold it - they are groupings,
 *  not the three real /areas pages. */
const MOOD_COPY: Record<string, string> = {
  "peated-south":
    "The smokiest corner of the island, its distilleries strung close together along one shore road above the Kildalton coast.",
  "the-middle":
    "The island's oldest distillery, on Loch Indaal — and the shortest way back from wherever you spent the day.",
  "the-west":
    "Farm distilling out on the Rhinns, where the barley is grown, malted and bottled within sight of the Atlantic at Machir Bay.",
  "north-east":
    "The far shore, above the Sound of Islay, with the Paps of Jura filling the window opposite.",
};

/** "4 distilleries" / "1 distillery" / "none open to visitors yet". Used
 *  by the map's tooltip and its description, both of which read the
 *  count aloud and so cannot say "1 distilleries". */
function countPhrase(n: number): string {
  if (n === 0) return "none open to visitors yet";
  return `${n} ${n === 1 ? "distillery" : "distilleries"}`;
}

export default function FourMoods({ distilleries }: { distilleries: Distillery[] }) {
  /** Which area the visitor is pointing at, or null. Drives the
   *  highlight in both directions: hovering a card lights its region on
   *  the map, and hovering a region lights its card. */
  const [activeId, setActiveId] = useState<string | null>(null);

  /* Both of these walk every distillery, so they are memoised against
     the prop rather than recomputed on every hover - and hover changes
     state on this component several times a second. */
  const membership = useMemo(() => areaMembership(distilleries), [distilleries]);
  const regions = useMemo(
    () =>
      partitionIslay(
        membership.map((m) => ({ id: m.area.id, lat: m.centre.lat, lng: m.centre.lng })),
      ),
    [membership],
  );

  /** Map an area id to its position in the list, which is what the
   *  numbering and the colour classes key off. Built from `membership`
   *  so the number on a region always matches the number on its card. */
  const indexOf = new Map(membership.map((m, i) => [m.area.id, i]));

  return (
    <section className="fm-section" id="four-moods">
      <div className="cj-head">
        <div className="cj-head-row">
          {/* Measured off the coastline in islay-outline.ts, not
              repeated from a guidebook: Islay's longest axis is 25.6 mi
              and it is 24.8 mi north to south. "Twenty-five" rounds the
              longer figure DOWN, so the section opens by understating
              rather than overstating the island. */}
          <div className="how-eyebrow">Twenty-five miles end to end</div>
          <div className="cj-head-note">Where you stay decides what the week feels like</div>
        </div>
        <h2 className="how-title">Islay has four moods</h2>
      </div>

      <div className="fm-layout">
        <figure className="fm-map">
          <svg
            viewBox={ISLAY_VIEWBOX}
            className="fm-svg"
            role="img"
            aria-label={`A map of Islay divided into its four areas: ${membership
              .map((m) => `the ${m.area.name}, ${countPhrase(m.distilleries.length)}`)
              .join("; ")}.`}
          >
            {regions.map((r) => {
              const i = indexOf.get(r.site.id) ?? 0;
              const m = membership[i];
              const dim = activeId !== null && activeId !== r.site.id;
              return (
                <g
                  key={r.site.id}
                  className={`fm-region fm-region-${i + 1}${dim ? " is-dim" : ""}${
                    activeId === r.site.id ? " is-active" : ""
                  }`}
                  onMouseEnter={() => setActiveId(r.site.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  {/* Named for anyone reading the SVG with a pointer or
                      assistive tech; the region is decorative on its own
                      because every word of it is repeated in the card. */}
                  <title>{`The ${m.area.name} — ${countPhrase(m.distilleries.length)}`}</title>
                  <path d={r.path} className="fm-region-fill" />
                </g>
              );
            })}

            {/* The coastline is drawn last and unfilled, so it sits as
                one continuous line over the four region edges rather
                than being broken up by them. */}
            <path d={ISLAY_OUTLINE_PATH} className="fm-island-edge" />

            {regions.map((r) => {
              const i = indexOf.get(r.site.id) ?? 0;
              const dim = activeId !== null && activeId !== r.site.id;
              return (
                <g
                  key={`n-${r.site.id}`}
                  className={`fm-marker${dim ? " is-dim" : ""}${
                    activeId === r.site.id ? " is-active" : ""
                  }`}
                  onMouseEnter={() => setActiveId(r.site.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <circle cx={r.labelAt.x} cy={r.labelAt.y} r={19} className="fm-marker-disc" />
                  <text x={r.labelAt.x} y={r.labelAt.y + 7} className="fm-marker-num">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption className="fm-attrib">{ISLAY_OUTLINE_ATTRIBUTION}</figcaption>
        </figure>

        <div className="fm-right">
          <ol className="fm-cards">
            {membership.map((m, i) => {
              const dim = activeId !== null && activeId !== m.area.id;
              return (
                <li
                  key={m.area.id}
                  className={`fm-card${dim ? " is-dim" : ""}${
                    activeId === m.area.id ? " is-active" : ""
                  }`}
                  onMouseEnter={() => setActiveId(m.area.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <span className={`fm-card-num fm-num-${i + 1}`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="fm-card-body">
                    <h3 className="fm-card-name">The {m.area.name}</h3>
                    <p className="fm-card-copy">{MOOD_COPY[m.area.id]}</p>
                    {/* The one line on this section that is pure data.
                        An area with nothing open to visitors says so
                        rather than rendering an empty line. */}
                    <p className="fm-card-meta">
                      {m.distilleries.length === 0
                        ? "None open to visitors yet"
                        : m.distilleries.map((d) => d.name).join(" · ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Deliberately carries no count. This section counts what is
              open to visitors and groups it into the four Islay areas;
              /distilleries lists every record in the table, including
              Jura and the two distilleries not yet open. Any number here
              would contradict the page it lands on. */}
          <p className="fm-all">
            <Link href="/distilleries" className="fm-all-link">
              Browse every distillery
              <span aria-hidden="true"> →</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
