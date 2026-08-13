"use client";

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";
import type { Journey } from "@/lib/types";

/**
 * NEW 13 Aug 2026, sidebar sibling of AddJourneyToTripButton for the
 * rebuilt /journeys/[slug] page's "Take this Journey" box - the task
 * brief asked for two buttons ("Start this as my trip" / "Add just the
 * days") and to "adapt sensibly" if the existing components didn't
 * already draw that distinction. They didn't: AddJourneyToTripButton
 * always calls trip.resetTrip() first (a hard restart), and
 * AddDayToTripButton only ever adds ONE day at a time. Neither is "add
 * every day in this Journey onto whatever trip the visitor already has,
 * additively" - so this adapts AddDayToTripButton's own additive
 * primitives (trip.addDay/trip.addStop, no resetTrip) in a loop over
 * every Journey day, same reasoning as AddJourneyToTripButton's own doc
 * comment on why only distillery stops are seeded (non-distillery
 * narrative activities aren't itinerary-stop-shaped in the trip model).
 */
export default function AddJourneyDaysButton({ journey }: { journey: Journey }) {
  const trip = useTrip();
  const router = useRouter();

  if (!journey.days || journey.days.length === 0) return null;

  function handleClick() {
    if (!trip.intake) {
      trip.completeIntake({
        timing: "planning",
        location: { kind: "region", region: "islay" },
        interests: ["distilleries"],
      });
    }
    for (const day of journey.days) {
      const newDayIndex = trip.addDay(day.slug);
      for (const stop of day.stops) {
        trip.addStop(newDayIndex, stop.distillery, stop.anchor);
      }
    }
    router.push("/journey?resume=1");
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "block",
        width: "100%",
        padding: "12px 20px",
        background: "white",
        color: "var(--copper)",
        border: "1px solid var(--copper)",
        borderRadius: "var(--radius-sm)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      Add just the days &rarr;
    </button>
  );
}
