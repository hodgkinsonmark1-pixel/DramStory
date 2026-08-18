import type { Distillery, Tour } from "@/lib/types";

/**
 * Site-wide pricing rule: any total or estimate built by summing more than
 * one price together (route totals, day-trip running totals, etc.) is
 * rounded UP to the nearest whole pound before display. This avoids ever
 * showing an odd-looking figure like "£193.5" and errs toward slightly
 * overestimating cost rather than underselling it.
 *
 * Single per-distillery tour prices sourced directly from Airtable (e.g.
 * "£15", "£120") are NOT run through this - they're already whole numbers
 * at source and represent one real, unaltered price, not a derived sum.
 */
export function roundPriceUp(amount: number): number {
  return Math.ceil(amount);
}

/**
 * Is this Tour row one the site may quote a price from?
 *
 * TWO independent disqualifications, and they mean different things:
 *
 *  - `Verification: "Placeholder — do not publish"`. The site owner's own
 *    flag on the Tours table (added 18 Aug 2026) for a row that exists so
 *    the distillery isn't empty, not because anyone confirmed it. Two of
 *    Bowmore's alternatives carry it, and one of them (£30) sits BELOW
 *    Bowmore's real £20 standard tour - so a "starts at" built without
 *    this check isn't merely unverified, it's wrong in the direction that
 *    matters. Matched on the leading word rather than the whole string,
 *    since the dash in the option name is an em dash that is easy to
 *    retype as a hyphen; the other two options ("Verified", "Needs
 *    check") don't begin with it, and a BLANK Verification is deliberately
 *    still publishable - most rows predate the field.
 *
 *  - `price <= 0`. mapTour defaults a blank Price to 0, so zero means
 *    "nobody has entered one", never "free". Port Ellen Open Days is the
 *    live example: £0 against a duration of "Unconfirmed — not publicly
 *    listed".
 *
 * This is the single gate behind both cheapestTourPrice below and the
 * per-distillery floor the Journeys data layer builds, so a distillery
 * page and a journey page cannot quote different "from" prices.
 */
export function isPublishableTour(tour: Tour): boolean {
  if (tour.price <= 0) return false;
  return !(tour.verification ?? "").trim().toLowerCase().startsWith("placeholder");
}

/** Cheapest tour price at a distillery, or null if it has no priced tours.
 *  A tour price of 0 means the price hasn't been entered in Airtable yet
 *  (mapTour defaults blank to 0) rather than a genuinely free tour, so
 *  those are excluded here rather than treated as £0.
 *
 *  Moved here 17 Aug 2026 from the deleted journeys-data.ts, whose
 *  hardcoded CLASSIC_JOURNEYS array Airtable's Journeys table has now
 *  fully replaced. The rule is about prices, not about journeys, so it
 *  belongs beside roundPriceUp rather than in anything journey-shaped. */
export function cheapestTourPrice(d: Distillery): number | null {
  // Was `t.price > 0` alone until 18 Aug 2026. It now runs through
  // isPublishableTour, which adds the Placeholder check - the same rule
  // the Journeys page's floor uses, deliberately shared rather than
  // reimplemented. The only price this changes today is Bowmore's, and
  // it changes it in the right direction: £20, the real standard tour,
  // instead of a £30 placeholder that was never a lower bound at all.
  const pricedTours = d.tours.filter(isPublishableTour);
  if (pricedTours.length === 0) return null;
  return Math.min(...pricedTours.map((t) => t.price));
}

/** Format a price for display - whole pounds show as "£65", a real
 *  half-pound price (e.g. Ardbeg's £22.50 tour) keeps the 2dp. Moved
 *  here 17 Aug 2026 with cheapestTourPrice above, same reasoning. */
export function formatPrice(amount: number): string {
  return amount % 1 === 0 ? `£${amount}` : `£${amount.toFixed(2)}`;
}
