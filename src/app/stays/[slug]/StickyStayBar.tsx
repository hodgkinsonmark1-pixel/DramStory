"use client";

import type { FeaturedStay } from "@/lib/types";
import { useAddStayToTrip } from "./useAddStayToTrip";

/**
 * Booking bar for a Featured Stay page - sits in-flow directly below the
 * hero (visible before any scrolling), then sticks below the page header
 * as the visitor scrolls (both are position:sticky - see .stay-header-sticky
 * and .stay-sticky-bar in dramstory-legacy.css). Reworked 05 Aug 2026 from
 * the original scroll-triggered fixed bar per Mark's review: "show under
 * the hero even before scroll, then be sticky to top of page... I'd like
 * the header bar to remain visible, so be sticky below it."
 *
 * Two rows:
 * 1. Name + summary + price, with "+ Add to my trip" and "Check
 *    availability" (the hero's own booking buttons were removed in the
 *    same review - this bar is now the page's single booking CTA).
 * 2. The official-website / TripAdvisor links, moved here from the Visit
 *    Info section (same review).
 *
 * Hotel-page-only (not shared with Distillery/Explore's DetailPageBar,
 * which is a "back to your journey" nav bar, not a booking bar).
 *
 * "+ Add to my trip" behaviour lives in useAddStayToTrip (shared with the
 * closing CTA banner in FeaturedStayClient.tsx, so both buttons behave
 * identically) - see that file for the full Option C reasoning.
 */
export default function StickyStayBar({ stay: s }: { stay: FeaturedStay }) {
  const handleAddToTrip = useAddStayToTrip(s);
  // Same "only when it differs from the booking link" rule the Visit Info
  // section used before this row moved here.
  const websiteDiffersFromBooking = s.websiteUrl && s.websiteUrl !== s.bookingUrl;

  return (
    <div className="stay-sticky-bar">
      <div className="stay-sticky-bar-inner">
        <div className="stay-sticky-bar-info">
          <span className="stay-sticky-bar-name">{s.name}</span>
          {(s.pinSummary || s.nearestArea || s.priceFrom) && (
            <span className="stay-sticky-bar-meta">
              {s.pinSummary || s.nearestArea}
              {(s.pinSummary || s.nearestArea) && s.priceFrom ? " · " : ""}
              {s.priceFrom ? `from ${s.priceFrom} / night` : ""}
            </span>
          )}
        </div>
        <div className="stay-sticky-bar-actions">
          <button type="button" className="stay-sticky-bar-add" onClick={handleAddToTrip}>
            + Add to my trip
          </button>
          {s.bookingUrl && (
            <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="stay-sticky-bar-book">
              Check availability &rarr;
            </a>
          )}
        </div>
      </div>
      {(websiteDiffersFromBooking || s.tripAdvisorUrl) && (
        <div className="stay-sticky-bar-links">
          {websiteDiffersFromBooking && (
            <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="stay-sticky-bar-link">
              Visit {s.name}&apos;s official website ↗
            </a>
          )}
          {s.tripAdvisorUrl && (
            <a href={s.tripAdvisorUrl} target="_blank" rel="noopener noreferrer" className="stay-sticky-bar-link">
              See reviews on TripAdvisor &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
