import Link from "next/link";
import Logo from "./Logo";

interface DetailPageBarProps {
  backHref: string;
  backLabel: string;
  /** Omit or pass 0 to hide the stop-count badge entirely. */
  stopCount?: number;
}

/**
 * The sticky dark bar at the top of individual distillery and local
 * feature pages.
 *
 * Added 21 July 2026 alongside PageHeader, as part of Mark's
 * header-consistency review. These detail pages already had a smart,
 * context-aware "back" link (back to your journey vs. back to the list
 * or map, depending on whether the visitor has an active trip) — that
 * logic is untouched here, callers still compute backHref/backLabel
 * exactly as before. What was missing is a persistent way home for a
 * visitor who lands directly (search, a shared link) rather than via the
 * list or an active trip — the small logo mark on the left covers that
 * gap without changing the back link's own behaviour.
 */
export default function DetailPageBar({ backHref, backLabel, stopCount }: DetailPageBarProps) {
  return (
    <div className="dist-page-bar">
      <Link href="/" className="dist-home-link" aria-label="DramStory home">
        <Logo size={22} light />
      </Link>
      <Link href={backHref} className="dist-back-bar">
        <span>&larr; {backLabel}</span>
        {!!stopCount && stopCount > 0 && (
          <span className="dist-back-stops">
            {stopCount} stop{stopCount > 1 ? "s" : ""}
          </span>
        )}
      </Link>
    </div>
  );
}
