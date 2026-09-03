import Link from "next/link";
import type { Distillery, Tour } from "@/lib/types";
import { isPublishableTour, formatPrice } from "@/lib/pricing";
import { spellCount } from "@/lib/journey-derivations";

/**
 * "Every distillery on Islay" - rebuilt 01 Sep 2026 to Mark's final
 * design (desktop page 5, mobile panel 3).
 *
 * WHAT IT REPLACES: three featured cards picked by an Airtable badge,
 * with the other eight as a row of price chips beneath. That showed
 * eleven of the island's thirteen distilleries and ranked three of them
 * above the rest. The design's answer is better and simpler: show all
 * thirteen, at the same size, and let the reader scan.
 *
 * IT NEEDS EVERY RECORD, NOT THE VISITABLE ONES. This is the only
 * section on the homepage passed getDistilleries() rather than
 * getVisitableDistilleries(). Laggan Bay and Portintruan are not open to
 * visitors and would be filtered out, but "thirteen in all" is the whole
 * point of the eyebrow - and a reader planning a trip is better served
 * knowing the two that exist and are shut than being shown eleven and
 * told it is everything.
 *
 * EVERY FIGURE IS COMPUTED. Both counts in the eyebrow, every price,
 * and all three facts in the summary line at the foot. Nothing here is
 * typed except the section's own words.
 */

/** The cheapest tour a visitor can actually book, ignoring placeholder
 *  rows and anything unpriced. Undefined where a distillery sells
 *  nothing bookable - the three at the foot of the wall, and any
 *  distillery whose tours are suspended - in which case no price is
 *  printed rather than a zero. */
export function cheapestTour(d: Distillery): Tour | undefined {
  return d.tours
    .filter((t) => isPublishableTour(t) && t.price > 0)
    .sort((a, b) => a.price - b.price)[0];
}

/** "South Islay" -> "South". The wall gives a region two words of space
 *  beside a price, and "Islay" is the one word every row would repeat on
 *  a page whose heading already says Islay twice.
 *
 *  Port Ellen keeps its full name - it is a village, not a compass
 *  point, and "Port" would be nonsense. Anything unrecognised falls
 *  through unchanged rather than being truncated blindly. */
export function shortRegion(region: string): string {
  const trimmed = region.replace(/\s+Islay$/i, "").trim();
  return trimmed.length > 0 ? trimmed : region;
}

/** Airtable's Style choices, as they read in a sentence.
 *
 *  "Unpeated / Heavily Peated" is the one that cannot just be
 *  lower-cased: it means a distillery making both, and the slash reads
 *  as an either/or. Bruichladdich and Isle of Jura both carry it. */
export function peatLabel(style: string): string {
  if (!style) return "";
  if (/^unpeated\s*\/\s*heavily peated$/i.test(style)) return "Unpeated to heavily peated";
  return style.charAt(0).toUpperCase() + style.slice(1).toLowerCase();
}

/** Whether this distillery has somewhere to eat on site.
 *
 *  NOT `facilities.includes("Café")`. The Facilities field has two
 *  separate café choices - "Café" and "Farm Café" - and Kilchoman
 *  carries the second one. An exact match drops it, and the summary line
 *  at the foot of this section names the cafés, so it would have been
 *  wrong in a place a reader could check. */
export function hasCafe(d: Distillery): boolean {
  return d.facilities.some((f) => /caf[eé]/i.test(f));
}

/** Jura is a different island. It is shown in the wall because a visitor
 *  planning Islay will be offered it, but it is not counted among the
 *  island's own and it shows its position rather than a region. */
export function isJura(d: Distillery): boolean {
  return /jura/i.test(d.region);
}

/** Open to visitors AND on Islay - the "ten you can visit today" of the
 *  eyebrow, and the ten that appear in full colour above the fold of the
 *  wall. */
export function isOpenOnIslay(d: Distillery): boolean {
  return d.openToVisitors && !isJura(d);
}

function DistilleryEntry({ d }: { d: Distillery }) {
  const open = isOpenOnIslay(d);
  const tour = cheapestTour(d);

  /* Line one: where it is, and what it costs to get in.
     A distillery that is not open shows why instead of a price - the
     Wall Status field on its record ("not yet open", "in progress"),
     which is the one thing a reader needs in order to stop looking for
     a tour that does not exist. Jura shows its position instead. */
  const place = isJura(d) ? "Across the sound" : shortRegion(d.region);
  const trailing = open
    ? tour
      ? `from ${formatPrice(tour.price)}`
      : null
    : d.wallStatus || null;

  /* Line two: what the whisky is like, and whether there is a café.
     For a distillery with no Style set - the two that have not started
     bottling - the record's Wall Note carries a short factual line
     instead, and nothing renders when it is empty. Never a placeholder. */
  const peat = peatLabel(d.style);
  const secondLine = peat
    ? [peat, hasCafe(d) ? "café" : null].filter(Boolean).join(" · ")
    : d.wallNote || "";

  return (
    <li className={open ? "hdw-item" : "hdw-item hdw-item-shut"}>
      {open ? (
        <Link href={`/distilleries/${d.slug}`} className="hdw-name">
          {d.name}
        </Link>
      ) : (
        /* Not a link when there is nothing to visit. The three at the
           foot still have pages, but a name styled as a link on a page
           selling visits reads as "you can go here". */
        <span className="hdw-name">{d.name}</span>
      )}
      <div className="hdw-place">
        {place}
        {trailing ? <span className="hdw-sep"> · {trailing}</span> : null}
      </div>
      {secondLine ? <div className="hdw-note">{secondLine}</div> : null}
    </li>
  );
}

export default function HomeDistilleries({ distilleries }: { distilleries: Distillery[] }) {
  if (distilleries.length === 0) return null;

  /* Alphabetical within two groups: the ones you can visit today, then
     the ones you cannot. That is the design's own order, and it means a
     reader scanning for a name finds it without knowing its status,
     while the wall still says plainly where the island stops. */
  const byName = (a: Distillery, b: Distillery) => a.name.localeCompare(b.name);
  const open = distilleries.filter(isOpenOnIslay).sort(byName);
  const shut = distilleries.filter((d) => !isOpenOnIslay(d)).sort(byName);
  const ordered = [...open, ...shut];

  /* THE SUMMARY LINE. Three facts a reader would otherwise have to
     assemble by reading all thirteen entries. Each is computed, and each
     is dropped entirely rather than printed empty when the data cannot
     support it. */

  // Cheapest way through any door, among the ten that are open.
  const cheapest = open
    .map((d) => ({ d, tour: cheapestTour(d) }))
    .filter((x): x is { d: Distillery; tour: Tour } => Boolean(x.tour))
    .sort((a, b) => a.tour.price - b.tour.price)[0];

  /* Exactly "Unpeated", not "starts with unpeated". Bruichladdich and
     Isle of Jura are both "Unpeated / Heavily Peated", and a prefix test
     would have made the line read "Only unpeated: Bruichladdich,
     Bunnahabhain, Isle of Jura" - which says the opposite of what it
     means. */
  const unpeated = open.filter((d) => /^unpeated$/i.test(d.style.trim()));
  const cafes = open.filter(hasCafe);

  const facts: { label: string; value: string }[] = [];
  if (cheapest) {
    facts.push({
      label: "Cheapest door in",
      value: `${cheapest.d.name}, ${formatPrice(cheapest.tour.price)}`,
    });
  }
  if (unpeated.length > 0) {
    facts.push({
      label: unpeated.length === 1 ? "Only unpeated" : "Unpeated",
      value: unpeated.map((d) => d.name).join(", "),
    });
  }
  if (cafes.length > 0) {
    facts.push({ label: "Cafés on site", value: cafes.map((d) => d.name).join(", ") });
  }

  return (
    <section className="hd-section" id="distilleries">
      <div className="sec-head">
        <div className="sec-head-text">
          {/* Both numbers counted, never typed. "Ten you can visit
              today" excludes Jura, which is a different island, and the
              two on Islay that are built but shut. */}
          <div className="how-eyebrow">
            {spellCount(open.length)} you can visit today &middot; {spellCount(distilleries.length)}{" "}
            in all
          </div>
          <h2 className="how-title">Every distillery on Islay</h2>
        </div>
        <div className="sec-head-aside">
          <Link className="sec-head-btn" href="/distilleries">
            See all distilleries &rarr;
          </Link>
          <div className="sec-head-sub">Filter by region, peat level or tour price</div>
        </div>
      </div>

      <ul className="hdw-grid">
        {ordered.map((d) => (
          <DistilleryEntry key={d.slug} d={d} />
        ))}
      </ul>

      {facts.length > 0 && (
        <dl className="hdw-facts">
          {facts.map((f) => (
            <div className="hdw-fact" key={f.label}>
              <dt>{f.label}:</dt> <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
