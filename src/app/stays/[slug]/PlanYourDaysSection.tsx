"use client";

import Link from "next/link";
import type { HubDay } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";

/** Pacing badge colours - same tone mapping as DaysHubGrid's PacingTag,
 *  duplicated here rather than imported since DaysHubGrid's version is a
 *  larger card-header component with its own layout assumptions; this is
 *  a small pill for a much more compact card. Keep the colours in sync if
 *  DaysHubGrid's ever change. */
function pacingTone(pacing: HubDay["pacing"]) {
  if (pacing === "Relaxed") return { bg: "var(--green-light)", fg: "var(--green-deep)" };
  if (pacing === "Moderate") return { bg: "var(--amber-pale)", fg: "var(--copper)" };
  if (pacing === "Packed") return { bg: "#F7E6E0", fg: "#B5502E" };
  return { bg: "var(--stone)", fg: "var(--slate)" };
}

function PlanYourDaysCard({ day }: { day: HubDay }) {
  const trip = useTrip();
  const isAdded = trip.days.some((d) => d.sourceHubDaySlug === day.slug);
  const tone = pacingTone(day.pacing);

  // The day's key points as a simple highlight list (05 Aug 2026, Mark's
  // review: show each day's highlights "as presented in the mock-up...
  // don't put times against them though") - the distillery stops in
  // visiting order, then the day's feature stops (walks, viewpoints,
  // lunch spots). The two arrays don't record interleaved order between
  // each other, so distilleries lead - they're the anchor stops of every
  // Day. Deliberately no per-stop timings: those belong to the full Day
  // page/planner, not a preview card.
  const highlights = [
    ...day.stops.map((stop) => stop.distillery.name),
    ...day.featureStops.map((feature) => feature.name),
  ];

  /** Same addDay/addStop/setTourForStop/addFeatureStop sequence as
   *  DaysHubGrid's own "+ Add this day to my trip" - deliberately not
   *  imported/shared as a single function, since DaysHubGrid also updates
   *  its own local addedCount UI state that this card doesn't have. */
  function handleUseThisDay() {
    const newDayIndex = trip.days.length;
    trip.addDay(day.slug);
    for (const stop of day.stops) {
      trip.addStop(newDayIndex, stop.distillery);
      if (stop.tour) trip.setTourForStop(newDayIndex, stop.distillery, stop.tour);
    }
    for (const feature of day.featureStops) {
      trip.addFeatureStop(newDayIndex, feature);
    }
    trip.setCurrentDayIndex(newDayIndex);
  }

  return (
    <div className="stay-day-card">
      <div className="stay-day-card-top">
        <span className="stay-day-card-pacing" style={{ background: tone.bg, color: tone.fg }}>
          {day.type} · {day.pacing}
        </span>
      </div>
      <div className="stay-day-card-title">{day.name}</div>
      {highlights.length > 0 && (
        <ul className="stay-day-card-stops">
          {highlights.map((name, i) => (
            <li key={`${name}-${i}`}>{name}</li>
          ))}
        </ul>
      )}
      <div className="stay-day-card-foot">
        {day.cost && <span className="stay-day-card-cost">{day.cost}</span>}
        <button type="button" className="stay-day-card-use" onClick={handleUseThisDay} disabled={isAdded}>
          {isAdded ? "✓ Added" : "Use this day →"}
        </button>
      </div>
    </div>
  );
}

/**
 * "Plan your days from here" - Pre-Designed Days curated for this hotel
 * (via Featured Stays' new "Plan Your Days" link field, added 05 Aug
 * 2026), shown as compact cards a visitor can drop straight into their
 * trip. Hotel-page-only component - deliberately not a variant of
 * DaysHubGrid's own DayCard (that one is built for the full Days Hub
 * grid, with its own map thumbnail, expandable narrative and distillery
 * filter - too heavy for a hotel page section meant to be a quick preview
 * with a link through to the real hub).
 */
export default function PlanYourDaysSection({ days }: { days: HubDay[] }) {
  if (days.length === 0) return null;

  return (
    <div className="stay-plan-days">
      <div className="stay-plan-days-head">
        <div>
          <span className="stay-plan-days-eyebrow">Only on DramStory</span>
          <h2 className="stay-plan-days-title">Plan your days from here</h2>
          <p className="stay-plan-days-intro">
            Ready-made days that work well from this base - add one and it drops straight into your trip.
          </p>
        </div>
        <Link href="/days" className="stay-plan-days-link">
          Open the full planner &rarr;
        </Link>
      </div>
      <div className="stay-plan-days-grid">
        {days.map((day) => (
          <PlanYourDaysCard key={day.id} day={day} />
        ))}
      </div>
    </div>
  );
}
