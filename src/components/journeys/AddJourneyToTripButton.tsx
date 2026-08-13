"use client";

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";
import type { Journey } from "@/lib/types";

/**
 * There's no payment/checkout system in the product - "booking" this tour
 * means seeding the visitor's own trip (the same TripContext the free-form
 * planner uses) with this journey's day-by-day distillery stops, then
 * dropping them straight into the real interactive workspace (map, real
 * routing, per-distillery tour booking) to carry on from there.
 *
 * UPDATE 12 Aug 2026 (Journeys/Airtable rebuild): takes a real Journey now
 * (journeys-data.ts's old ClassicJourney/JourneyDay shapes are no longer
 * involved here) - each journey.days entry is already a real HubDay, so
 * its stops resolve straight to real Distillery records with no slug
 * lookups. Only distillery stops are seeded - the narrative's own
 * non-distillery activities (a walk, a beach, a swim) aren't itinerary-
 * stop-shaped in the trip data model, so they stay descriptive content
 * on the page rather than being silently dropped or half-represented in
 * the workspace - same scoping the previous version of this button used.
 */
export default function AddJourneyToTripButton({ journey }: { journey: Journey }) {
  const trip = useTrip();
  const router = useRouter();

  if (!journey.days || journey.days.length === 0) return null;

  function handleClick() {
    const days = journey.days;
    trip.resetTrip();
    trip.initDays(days.length);
    days.forEach((day, dayIndex) => {
      for (const stop of day.stops) {
        trip.addStop(dayIndex, stop.distillery);
      }
    });
    trip.completeIntake({
      timing: "planning",
      location: { kind: "region", region: "islay" },
      interests: ["distilleries"],
    });
    router.push("/journey?resume=1");
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "block",
        width: "100%",
        padding: "14px 28px",
        background: "var(--copper)",
        color: "white",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Start this as my trip &rarr;
    </button>
  );
}
