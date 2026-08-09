"use client";

import Link from "next/link";
import { tripSummaryText, formatMoney } from "@/lib/day-derivations";

/**
 * /days trip bar (Days/Trip flow Phase 2, §3.2/§5) - sticky dark bar at
 * the bottom of /days: progress ring, running summary, distillery/cost
 * totals, and a Review button. Always rendered (even with zero days -
 * "No days yet"), matching the reference prototype's footTrip(), which
 * never disappears.
 *
 * TEMPORARY WIRING (flagged per the task brief, not a silent choice):
 * trip review is Phase 3 and doesn't exist yet, so Review points at
 * /journey?resume=1 - the closest existing "see your trip" page, and the
 * same target DaysHubGrid's own pre-existing "View your trip" flow
 * already used. Swap this for the real trip review page once Phase 3
 * lands.
 */
export default function DaysTripBar({
  dayCount,
  distilleryCount,
  totalDistilleries,
  costTotal,
  nights,
  milestone,
  justAdded,
}: {
  dayCount: number;
  distilleryCount: number;
  totalDistilleries: number;
  costTotal: number;
  nights: number;
  milestone: string | null;
  justAdded: boolean;
}) {
  const pct = Math.min(1, dayCount / Math.max(1, nights));
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  // "Turns green at 100%" (§5) reuses the system's existing green tokens
  // (--green-light/--green-deep, the same ones PacingTag's Relaxed state
  // already uses) rather than introducing a new colour - the design
  // doc's own colour note is explicit that nothing here should.
  const ringColour = pct >= 1 ? "var(--green-light)" : "var(--amber)";

  return (
    <>
      {milestone && (
        <div className="days-milestone-toast" role="status">
          {milestone}
        </div>
      )}
      <div className="days-trip-bar">
        <div className="days-trip-bar-summary">
          {dayCount > 0 && (
            <svg width="38" height="38" viewBox="0 0 38 38" className="days-trip-bar-ring" aria-hidden="true">
              <circle cx="19" cy="19" r={radius} fill="none" stroke="var(--navy-mid)" strokeWidth="3" />
              <circle
                cx="19"
                cy="19"
                r={radius}
                fill="none"
                stroke={ringColour}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 19 19)"
                style={{ transition: "stroke-dashoffset .5s cubic-bezier(.22,.9,.32,1), stroke .3s ease" }}
              />
              <text x="19" y="23" textAnchor="middle" className="days-trip-bar-ring-count">
                {dayCount}
              </text>
            </svg>
          )}
          <div className="days-trip-bar-text">
            <div className="days-trip-bar-kicker">Your trip</div>
            <div className={`days-trip-bar-value${justAdded ? " days-flyin" : ""}`}>
              {dayCount > 0 ? tripSummaryText(dayCount, distilleryCount, nights) : "No days yet"}
            </div>
            {dayCount > 0 && (
              <div className="days-trip-bar-sub">
                {distilleryCount} of {totalDistilleries} distilleries · {formatMoney(costTotal)}pp
              </div>
            )}
          </div>
        </div>
        <Link
          href="/journey?resume=1"
          className="days-trip-bar-review"
          aria-disabled={dayCount === 0}
          tabIndex={dayCount === 0 ? -1 : 0}
          onClick={(e) => {
            if (dayCount === 0) e.preventDefault();
          }}
        >
          Review
        </Link>
      </div>
    </>
  );
}
