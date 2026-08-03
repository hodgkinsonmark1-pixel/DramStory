/**
 * Shared text-summary helpers.
 *
 * Local Feature "Pin Summary" is the purpose-written short field for
 * compact UI (map popups, grid cards) - see docs/deferred-features.md's
 * identical decision for Tours' "Short Summary" field. Why Visit has grown
 * into full-paragraph blockquote copy for the page itself and is no longer
 * reliably short, so anywhere that used to assume it was popup-length now
 * needs to fall back through this truncation instead of using it as-is.
 */
export function truncateSummary(text: string, maxLength = 140): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
