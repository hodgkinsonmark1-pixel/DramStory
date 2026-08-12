"use client";

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";
import type { HubDay } from "@/lib/types";

/**
 * Per-day sibling of AddJourneyToTripButton - appends just this one day's
 * distillery stops to the visitor's existing trip (starting a fresh one
 * with sensible defaults if they don't have one yet), rather than
 * resetting everything to seed the whole multi-day journey at once.
 *
 * UPDATE 12 Aug 2026 (Journeys/Airtable rebuild): takes a real HubDay now
 * instead of the old hardcoded JourneyDay shape - day.stops already
 * carries real Distillery records (resolved via Day Stops), so there's
 * no separate `distilleries` list to cross-reference against any more.
 * `day.slug` is passed into addDay() so an added day traces back to its
 * source Hub Day, same as DaysHubGrid's own "+ Add as a day" - lets
 * /trip and /trip/day/[index] show this day's real narrative/pacing
 * later, if it's also Status: Live on /days (Draft-only Days degrade
 * gracefully to no narrative there, same as any other sourceHubDaySlug
 * miss).
 *
 * Non-distillery activities (a walk, a beach, a swim) aren't seeded here
 * - the Days data model only resolves Local Feature "activities" as
 * featureStops, not itinerary-stop-shaped trip stops, matching the same
 * scoping AddJourneyToTripButton already used. Flagged as a decision,
 * not silently dropped.
 */
export default function AddDayToTripButton({ day }: { day: HubDay }) {
  const trip = useTrip();
  const router = useRouter();

  const dayDistilleries = day.stops.map((s) => s.distillery);

  // A day with no distillery stops has nothing to add to the workspace -
  // no button rather than a button that silently does nothing.
  if (dayDistilleries.length === 0) return null;

  function handleClick() {
    if (!trip.intake) {
      trip.completeIntake({
        timing: "planning",
        location: { kind: "region", region: "islay" },
        interests: ["distilleries"],
      });
    }
    const newDayIndex = trip.addDay(day.slug);
    for (const d of dayDistilleries) {
      trip.addStop(newDayIndex, d);
    }
    router.push("/journey?resume=1");
  }

  return (
    <button
      onClick={handleClick}
      style={{
        padding: "9px 18px",
        background: "white",
        color: "var(--copper)",
        border: "1px solid var(--copper)",
        borderRadius: "var(--radius-sm)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      + Add this day to my journey
    </button>
  );
}
