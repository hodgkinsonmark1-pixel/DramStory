import type { Distillery } from "@/lib/types";

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
  const pricedTours = d.tours.filter((t) => t.price > 0);
  if (pricedTours.length === 0) return null;
  return Math.min(...pricedTours.map((t) => t.price));
}

/** Format a price for display - whole pounds show as "£65", a real
 *  half-pound price (e.g. Ardbeg's £22.50 tour) keeps the 2dp. Moved
 *  here 17 Aug 2026 with cheapestTourPrice above, same reasoning. */
export function formatPrice(amount: number): string {
  return amount % 1 === 0 ? `£${amount}` : `£${amount.toFixed(2)}`;
}
