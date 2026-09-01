"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Distillery, FeaturedStay } from "@/lib/types";
import { areaMembership } from "@/lib/area-membership";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import {
  ISLAY_OUTLINE_PATH,
  ISLAY_VIEWBOX,
  ISLAY_VIEWBOX_WIDTH,
  ISLAY_OUTLINE_ATTRIBUTION,
  partitionIslay,
  projectToIslaySvg,
} from "@/lib/islay-outline";

/**
 * "Islay has four moods" - rebuilt 01 Sep 2026 to Mark's final design
 * (desktop page 4, mobile panel 2). Navy rather than the mid-blue of
 * 31 Aug, the map inside its own card, and the four areas as panels.
 *
 * THE FOUR AREAS ARE NOT NEW. DREAM_AREAS in lib/dream-areas.ts already
 * defined these four groupings and drives the hero's "drawn to"
 * question, trip-context's default answer and the /dreaming pages.
 *
 * WHAT IS COMPUTED AND WHAT IS WRITTEN. Which distilleries are in each
 * area, how many, where each area's centre is, and therefore the shape
 * of each area on the map, are all derived at render time from the
 * Distilleries table. Only the area names and the four one-line
 * descriptions are written, and those name no distillery and count
 * nothing, so they cannot go stale as the island changes.
 *
 * ABOUT THE MAP. The four regions are a Voronoi partition of the real
 * coastline: every point is coloured for whichever area's distilleries
 * are nearest to it. The card's eyebrow says "real coastline, four
 * zones" and that is exactly what it is - the shapes are a consequence
 * of where the distilleries are, not lines someone drew. See
 * partitionIslay in lib/islay-outline.ts.
 *
 * YOUR BASE MARKED. The eyebrow promises it, so the map has to deliver
 * it: the visitor's chosen base is read from the same trip answers the
 * hero writes and Where to stay reads, and pinned at its real
 * coordinates. If the base cannot be resolved to a stay with
 * coordinates, the marker is dropped AND the eyebrow stops claiming it -
 * see baseEyebrow below. A promise in a label is still a promise.
 */

/** The line under each area name, keyed by DREAM_AREAS id.
 *
 *  Written to survive the island changing: no distillery is named and no
 *  count appears, because both render from the data beneath. The one
 *  number-like claim is "the island's oldest", which a distillery
 *  opening in future cannot falsify. */
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

function countPhrase(n: number): string {
  if (n === 0) return "none open to visitors yet";
  return `${n} ${n === 1 ? "distillery" : "distilleries"}`;
}

export default function FourMoods({
  distilleries,
  featuredStays,
}: {
  distilleries: Distillery[];
  featuredStays: FeaturedStay[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const trip = useTrip();

  const membership = useMemo(() => areaMembership(distilleries), [distilleries]);
  const regions = useMemo(
    () =>
      partitionIslay(
        membership.map((m) => ({ id: m.area.id, lat: m.centre.lat, lng: m.centre.lng })),
      ),
    [membership],
  );
  const indexOf = new Map(membership.map((m, i) => [m.area.id, i]));

  /* The visitor's own base, matched by name against the stays this page
     already has. Same answer the hero writes and Where to stay reads, so
     the two cannot disagree about where someone is sleeping. */
  const baseName = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const base = featuredStays.find(
    (s) => s.name === baseName && Number.isFinite(s.lat) && Number.isFinite(s.lng),
  );
  const basePoint = base ? projectToIslaySvg(base.lng, base.lat) : null;

  /* The eyebrow only claims what the map actually shows. */
  const eyebrow = basePoint
    ? "Real coastline · four zones · your base marked"
    : "Real coastline · four zones";

  return (
    <section className="fm-section" id="four-moods">
      <div className="cj-head">
        {/* Measured off the coastline in islay-outline.ts, not repeated
            from a guidebook: Islay's longest axis is 25.6 mi and it is
            24.8 mi north to south. "Twenty-five" rounds the longer
            figure DOWN, so the section opens by understating rather than
            overstating the island. */}
        <div className="how-eyebrow">Twenty-five miles end to end</div>
        <h2 className="how-title">Islay has four moods</h2>
        <div className="cj-head-note">Where you stay decides what the week feels like.</div>
      </div>

      <div className="fm-layout">
        <figure className="fm-map">
          <div className="fm-map-eyebrow">{eyebrow}</div>
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
                  <title>{`The ${m.area.name} — ${countPhrase(m.distilleries.length)}`}</title>
                  <path d={r.path} className="fm-region-fill" />
                </g>
              );
            })}

            {/* Drawn last and unfilled, so the coastline reads as one
                continuous line over the four region edges. */}
            <path d={ISLAY_OUTLINE_PATH} className="fm-island-edge" />

            {basePoint && (
              <g className="fm-base" aria-hidden="true">
                <circle cx={basePoint.x} cy={basePoint.y} r={9} className="fm-base-ring" />
                <circle cx={basePoint.x} cy={basePoint.y} r={3.5} className="fm-base-dot" />
              </g>
            )}

            {regions.map((r) => {
              const i = indexOf.get(r.site.id) ?? 0;
              const m = membership[i];
              const dim = activeId !== null && activeId !== r.site.id;
              /* Labels sit outside the pin, on whichever side has room:
                 to the right in the left half of the map, to the left in
                 the right half. Without the flip the two eastern areas
                 ran their names off the edge of the viewBox. */
              const toRight = r.labelAt.x < ISLAY_VIEWBOX_WIDTH * 0.55;
              return (
                <g
                  key={`n-${r.site.id}`}
                  className={`fm-marker${dim ? " is-dim" : ""}${
                    activeId === r.site.id ? " is-active" : ""
                  }`}
                  onMouseEnter={() => setActiveId(r.site.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <circle cx={r.labelAt.x} cy={r.labelAt.y} r={15} className="fm-marker-disc" />
                  <text x={r.labelAt.x} y={r.labelAt.y + 5.5} className="fm-marker-num">
                    {i + 1}
                  </text>
                  <text
                    x={r.labelAt.x + (toRight ? 22 : -22)}
                    y={r.labelAt.y + 4.5}
                    textAnchor={toRight ? "start" : "end"}
                    className="fm-marker-label"
                  >
                    the {m.area.name}
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
                    {/* The one line here that is pure data. An area with
                        nothing open says so rather than rendering blank. */}
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
              open and grouped into the four Islay areas; /distilleries
              lists every record including Jura and the two not yet open,
              so a number here would contradict where it lands. */}
          <p className="fm-all">
            <Link href="/distilleries" className="fm-all-link">
              Browse every distillery
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
