import Link from "next/link";
import type { CostLine, Distillery, Journey } from "@/lib/types";
import { isPublishableTour, formatPrice } from "@/lib/pricing";

/**
 * "What three days on Islay actually costs" - the strip above the
 * footer, built 31 Aug 2026 to Mark's mockup.
 *
 * THE BADGE IS THE HARD PART. This section claims "our own numbers, not
 * estimates" and prints a checked date, which is a much stronger promise
 * than anything else on the homepage. Every figure in the original mockup
 * was wrong when checked against the site's own records and against
 * CalMac - the room and car figures understated by enough that someone
 * budgeting three days from them would have been out by a few hundred
 * pounds. So:
 *
 *   - Two rows COMPUTE from our own records and cannot drift: the tour
 *     range from Tours, the room range from the Journeys accommodation
 *     rates.
 *   - Two are external (CalMac, Cresswell) and carry a Verified date on
 *     the record.
 *   - The strip prints the OLDEST of those dates, not the newest. A
 *     freshly-checked ferry fare must not make a two-year-old hire rate
 *     look current.
 *
 * A row that cannot produce a figure renders nothing at all rather than
 * an empty column, because a blank under a "checked" badge reads as an
 * answer rather than an absence.
 */

/** What a standard tour costs: cheapest publishable tour, up to the 70th
 *  percentile. The true maximum is Port Ellen's £900 Atlas of Smoke, and
 *  a £15–£900 headline tells a reader nothing about what a tour costs -
 *  the ceiling belongs in the Sub line, which is where the record puts
 *  it. */
function standardTourRange(distilleries: Distillery[]): string | undefined {
  const prices = distilleries
    .flatMap((d) => d.tours)
    .filter((t) => isPublishableTour(t) && t.price > 0)
    .map((t) => t.price)
    .sort((a, b) => a - b);
  if (prices.length === 0) return undefined;
  const ceiling = prices[Math.floor((prices.length - 1) * 0.7)];
  return `${formatPrice(prices[0])} – ${formatPrice(ceiling)}`;
}

/** A room per night, lowest off-season rate to highest peak rate across
 *  the journeys. Both ends have to exist: half a range is not a range,
 *  the same rule journeyAccommodationRange already follows. */
function roomRange(journeys: Journey[]): string | undefined {
  const lows = journeys
    .map((j) => j.accommodationFromPerNight)
    .filter((n): n is number => n !== undefined);
  const highs = journeys
    .map((j) => j.accommodationPeakPerNight)
    .filter((n): n is number => n !== undefined);
  if (lows.length === 0 || highs.length === 0) return undefined;
  return `${formatPrice(Math.min(...lows))} – ${formatPrice(Math.max(...highs))}`;
}

export default function WhatItCosts({
  costLines,
  distilleries,
  journeys,
}: {
  costLines: CostLine[];
  distilleries: Distillery[];
  journeys: Journey[];
}) {
  if (costLines.length === 0) return null;

  // The auto rows are matched by ORDER, not by label - a label is copy
  // and copy gets rewritten, and a renamed row silently losing its
  // computation would be the quiet kind of wrong this section exists to
  // avoid. Order 2 is the room, order 3 is the tour; the table's own
  // description says so.
  const computed: Record<number, string | undefined> = {
    2: roomRange(journeys),
    3: standardTourRange(distilleries),
  };

  const rows = costLines
    .map((line) => ({ line, figure: line.auto ? computed[line.order] : line.figure }))
    .filter((r) => !!r.figure);
  if (rows.length === 0) return null;

  // The OLDEST verified date, not the newest. One neglected row should
  // age the whole strip - that is the honest signal, and the opposite
  // would let a fresh check hide a stale one.
  const dates = costLines.filter((l) => !l.auto && l.verified).map((l) => l.verified as string);
  const checked = dates.length > 0 ? dates.sort()[0] : undefined;
  const checkedLabel = checked
    ? new Date(checked).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : undefined;

  return (
    <section className="wic-section" id="what-it-costs">
      <div className="wic-inner">
        <div className="cj-head">
          <div className="cj-head-row">
            <h2 className="how-title wic-title">What three days on Islay actually costs</h2>
            {checkedLabel && (
              <div className="cj-head-note">Checked {checkedLabel} &middot; ranges, not quotes</div>
            )}
          </div>
        </div>

        <dl className="wic-grid">
          {rows.map(({ line, figure }) => (
            <div className="wic-item" key={line.id}>
              <dt className="wic-figure">{figure}</dt>
              <dd className="wic-label">
                {line.label}
                {line.sub && <span className="wic-sub">{line.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="wic-trust">
          <strong>These are our own numbers, not estimates.</strong> We&rsquo;ve driven every road on
          this site, queued at the Old Kiln, and missed the last tour at Bunnahabhain more than once.{" "}
          <Link href="/about">Who we are &rarr;</Link>
        </p>
      </div>
    </section>
  );
}
