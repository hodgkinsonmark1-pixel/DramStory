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
