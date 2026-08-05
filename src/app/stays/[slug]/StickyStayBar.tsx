"use client";

import { useEffect, useState } from "react";
import type { FeaturedStay } from "@/lib/types";
import { useAddStayToTrip } from "./useAddStayToTrip";

/**
 * Sticky "quick actions" bar for a Featured Stay page - appears once the
 * hero has scrolled past, showing the hotel name/price plus "+ Add to my
 * trip" and "Book now". Hotel-page-only (not shared with Distillery/
 * Explore's own DetailPageBar, which is a different "back to your
 * journey" nav bar, not a booking bar) - added 05 Aug 2026.
 *
 * "+ Add to my trip" behaviour lives in useAddStayToTrip (shared with the
 * closing CTA banner in FeaturedStayClient.tsx, so both buttons behave
 * identically) - see that file for the full Option C reasoning.
 */
export default function StickyStayBar({ stay: s }: { stay: FeaturedStay }) {
  const [visible, setVisible] = useState(false);
  const handleAddToTrip = useAddStayToTrip(s);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 420);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`stay-sticky-bar${visible ? " stay-sticky-bar-visible" : ""}`} aria-hidden={!visible}>
      <div className="stay-sticky-bar-inner">
        <div className="stay-sticky-bar-info">
          <span className="stay-sticky-bar-name">{s.name}</span>
          {(s.nearestArea || s.priceFrom) && (
            <span className="stay-sticky-bar-meta">
              {s.nearestArea}
              {s.nearestArea && s.priceFrom ? " · from " : s.priceFrom ? "from " : ""}
              {s.priceFrom}
              {s.priceFrom ? " / night" : ""}
            </span>
          )}
        </div>
        <div className="stay-sticky-bar-actions">
          <button type="button" className="stay-sticky-bar-add" onClick={handleAddToTrip}>
            + Add to my trip
          </button>
          {s.bookingUrl && (
            <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="stay-sticky-bar-book">
              Book now
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
