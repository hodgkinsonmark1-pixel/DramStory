import Link from "next/link";

/**
 * Renders plain text containing `[label](/path)` markdown-style links as
 * real internal <Link>s - keeps Airtable content authorable as simple
 * text while still supporting the cross-linking the brand voice guide
 * calls for (Journal posts, other distilleries, Explore pages).
 *
 * SHARED, 16 Aug 2026. This previously existed as five byte-identical
 * private copies (DistilleryPageClient, FeaturedStayClient,
 * ExploreFeatureClient, DayScreen and the now-deleted JourneyDayDetail),
 * each carrying a comment justifying the duplication. Two of them then
 * drifted anyway - JourneyDayDetail styled its links with an inline
 * copper/500-weight style rather than the shared `.dist-inline-link`
 * class, so the same Day narrative rendered its links differently
 * depending on which page you happened to read it on. One helper, one
 * class, no drift.
 *
 * `className` defaults to `.dist-inline-link` (dramstory-legacy.css) -
 * the class every non-drifted copy already used.
 */
export function renderWithLinks(text: string, className = "dist-inline-link") {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    return (
      <Link href={href} key={i} className={className}>
        {label}
      </Link>
    );
  });
}
