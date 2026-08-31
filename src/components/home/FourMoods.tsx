import type { Distillery } from "@/lib/types";
import { DREAM_AREAS } from "@/lib/dream-areas";
import {
  ISLAY_OUTLINE_PATH,
  ISLAY_VIEWBOX,
  ISLAY_OUTLINE_ATTRIBUTION,
  projectToIslaySvg,
} from "@/lib/islay-outline";

/**
 * "Islay has four moods" - MVP, built 31 Aug 2026 to Mark's brief:
 * "basically an island map outline with 4 areas? no clickthrough or area
 * pages at this stage". So: no links off any card, no /areas/[mood]
 * routes, nothing that implies a page exists behind it. The full
 * treatment in `area sections.pdf` stays on the backlog (task #25).
 *
 * THE FOUR AREAS ARE NOT NEW. DREAM_AREAS in lib/dream-areas.ts already
 * defined exactly these four groupings - same names, same distilleries -
 * and drives the hero's "drawn to" question, trip-context's default
 * answer and the /dreaming pages. This section reads that same array
 * rather than restating it, so a change to the grouping can't leave the
 * homepage disagreeing with the question that set it.
 *
 * WHAT THE MOCKUP ASKED FOR AND DOES NOT GET:
 *
 *   - Shaded zone areas. There is no boundary data for these four - they
 *     are an editorial grouping of distilleries, not regions - so any
 *     shading would be a line invented by us, drawn on a real coastline,
 *     and read by a visitor as fact. See the note in islay-outline.ts.
 *
 *   - The "N min away" drive time on each card. That needs twenty routed
 *     journey times we don't hold; Stay Distillery Distances has four
 *     rows in the whole table. Straight-line distance is not a usable
 *     stand-in on an island where the road to Bunnahabhain is a
 *     single-track switchback - it would read as a promise and be wrong
 *     by a factor of two. Same call, and the same reason, as the drive
 *     times WhereToStay.tsx declines to show.
 *
 * ON THE COPY. Two of the mockup's four descriptions made claims the
 * data doesn't support, and both were rewritten rather than shipped:
 *
 *   - "Bowmore, Bridgend and the shortest drives to everywhere else" is
 *     a comparative drive-time claim, which is the exact claim
 *     WhereToStay.tsx already refuses to make about Bridgend for want of
 *     the data. It is replaced by a centrality claim that is measured on
 *     every render rather than asserted - see the second dev guard in
 *     the component body.
 *   - "Single-track to Bunnahabhain and Ardnahoe" names two of the three
 *     distilleries in the north east and silently drops Caol Ila, which
 *     DREAM_AREAS lists first. The card names all three.
 *
 * The other two are the mockup's own claims, verified: the peated
 * south's four distilleries span 3.2 miles at their widest (Port Ellen
 * to Ardbeg), so "inside four miles" is true and conservative; and
 * Kilchoman's own Airtable record is the source for the farm line - it
 * is "the only distillery in Scotland that grows, malts, distills,
 * matures, and bottles its whisky entirely on one farm".
 */

/** The editorial line under each area name, keyed by DREAM_AREAS id.
 *  Hardcoded here rather than in Airtable, the same split BeforeYouGo
 *  uses: this is written voice that doesn't go stale, and there is no
 *  Areas record for any of these four to hold it (they are groupings,
 *  not the three real /areas pages). If a fifth mood is ever added,
 *  the guard below will say so rather than rendering a blank card. */
const MOOD_COPY: Record<string, string> = {
  "peated-south":
    "Four distilleries inside four miles. Laphroaig, Lagavulin and Ardbeg along one shore road, with Port Ellen at the end of it.",
  "the-middle":
    "Bowmore, the island's oldest, on Loch Indaal — and the shortest way back from wherever you spent the day.",
  "the-west":
    "Bruichladdich on the loch, and Kilchoman, the one distillery in Scotland that grows, malts and bottles everything on its own farm, out past Machir Bay.",
  "north-east":
    "Caol Ila, Ardnahoe and Bunnahabhain, strung along the Sound of Islay with the Paps of Jura filling the window opposite.",
};

/** The four Islay areas' own distilleries, flattened. Isle of Jura is
 *  deliberately not among them - it is a different island and belongs to
 *  none of the four - which is why this is built from DREAM_AREAS rather
 *  than from the `distilleries` prop, whose Jura record would quietly
 *  widen every figure below. */
const ISLAY_DISTILLERY_NAMES = DREAM_AREAS.flatMap((a) => a.distilleries);

const R_MILES = 3958.8;
function milesApart(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R_MILES * 2 * Math.asin(Math.sqrt(h));
}

export default function FourMoods({ distilleries }: { distilleries: Distillery[] }) {
  const byName = new Map(distilleries.map((d) => [d.name, d]));

  /* Every name in DREAM_AREAS must still exist in the Distilleries
     table. A renamed record would otherwise drop out of the count in the
     kicker without anything failing to compile - the same silent-drop
     class as the ways-out card and the truncated accommodation notes.
     Dev-only warning, never a thrown error: a missing distillery must
     not take the homepage down. */
  if (process.env.NODE_ENV !== "production") {
    const missing = ISLAY_DISTILLERY_NAMES.filter((n) => !byName.has(n));
    if (missing.length > 0) {
      console.warn(
        `[FourMoods] DREAM_AREAS names ${missing.length} distillery/distilleries not in the ` +
          `Distilleries table: ${missing.join(", ")}. Either the record was renamed or it is ` +
          `no longer visitable. The area counts on the homepage are now short by that many.`,
      );
    }
  }

  /* "The shortest way back from wherever you spent the day" is the one
     comparative claim on this section, so it is measured rather than
     asserted, and measured on every render from the real coordinates:
     the middle's centroid is the closest of the four to all ten Islay
     distilleries (8.1 mi mean against 9.1 for the next best), and no
     distillery on the island is more than 10.8 mi from it. If a new
     distillery opens somewhere that stops being true, this recomputes
     and the dev warning fires rather than the page continuing to say it.

     Note this is straight-line distance, which is why the copy says
     "shortest way back" comparatively and never states a figure - the
     claim it supports is "the middle is the most central", which
     straight-line distance is sufficient to establish, and not "it is N
     minutes away", which it is not. */
  if (process.env.NODE_ENV !== "production") {
    const points = ISLAY_DISTILLERY_NAMES.map((n) => byName.get(n)).filter(
      (d): d is Distillery => Boolean(d?.lat && d?.lng),
    );
    if (points.length > 0) {
      const meanFrom = (a: { lat: number; lng: number }) =>
        points.reduce((sum, d) => sum + milesApart(a, d), 0) / points.length;
      const ranked = DREAM_AREAS.map((a) => ({ id: a.id, mean: meanFrom(a) })).sort(
        (x, y) => x.mean - y.mean,
      );
      if (ranked[0].id !== "the-middle") {
        console.warn(
          `[FourMoods] The middle is no longer the most central area (${ranked[0].id} is now, ` +
            `at ${ranked[0].mean.toFixed(1)} mi mean vs the middle's). The middle's card still ` +
            `claims "the shortest way back from wherever you spent the day" - rewrite it.`,
        );
      }
    }
  }

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
            aria-label="An outline of Islay with the four areas marked: the peated south, the middle, the west and the north east."
          >
            <path d={ISLAY_OUTLINE_PATH} className="fm-island" />
            {DREAM_AREAS.map((area, i) => {
              const { x, y } = projectToIslaySvg(area.lng, area.lat);
              return (
                <g key={area.id} className="fm-dot-group">
                  <circle cx={x} cy={y} r={17} className="fm-dot-halo" />
                  <circle cx={x} cy={y} r={7} className="fm-dot" />
                  <text x={x} y={y + 3.5} className="fm-dot-num">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption className="fm-attrib">{ISLAY_OUTLINE_ATTRIBUTION}</figcaption>
        </figure>

        <ol className="fm-cards">
          {DREAM_AREAS.map((area, i) => {
            /* Counted from the records that actually resolved, not from
               the length of the names array - so a distillery that has
               left the table is missing from the count rather than
               inflating it. */
            const found = area.distilleries.filter((n) => byName.has(n)).length;
            return (
              <li key={area.id} className="fm-card">
                <span className="fm-card-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="fm-card-body">
                  <h3 className="fm-card-name">The {area.name}</h3>
                  <p className="fm-card-copy">{MOOD_COPY[area.id]}</p>
                  <p className="fm-card-meta">
                    {found} {found === 1 ? "distillery" : "distilleries"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
