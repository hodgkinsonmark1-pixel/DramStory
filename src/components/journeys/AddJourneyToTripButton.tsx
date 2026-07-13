"use client";

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";
import type { ClassicJourney } from "@/lib/journeys-data";
import type { Distillery } from "@/lib/types";

/**
 * There's no payment/checkout system in the product - "booking" this tour
 * means seeding the visitor's own trip (the same TripContext the free-form
 * planner uses) with this journey's day-by-day distillery stops, then
 * dropping them straight into the real interactive workspace (map, real
 * routing, per-distillery tour booking) to carry on from there. Only
 * distillery stops are seeded - the non-distillery activities (the pool,
 * the bike hire, the beach) aren't itinerary-stop-shaped in the current
 * data model, so they stay as descriptive content on this page rather than
 * being silently dropped or half-represented in the workspace.
 */
export default function AddJourneyToTripButton({
  journey,
  distilleries,
}: {
  journey: ClassicJourney;
  distilleries: Distillery[];
}) {
  const trip = useTrip();
  const router = useRouter();

  if (!journey.days || journey.days.length === 0) return null;

  function handleClick() {
    const days = journey.days!;
    trip.resetTrip();
    trip.initDays(days.length);
    days.forEach((day, dayIndex) => {
      const distillerySlugs = [...day.morning, ...day.afternoon]
        .filter((s) => s.kind === "distillery")
        .map((s) => s.distillerySlug);
      for (const slug of distillerySlugs) {
        const d = distilleries.find((x) => x.slug === slug);
        if (d) trip.addStop(dayIndex, d);
      }
      if (day.overnight) {
        trip.setAccommodation(dayIndex, {
          name: day.overnight.village,
          lat: day.overnight.lat,
          lng: day.overnight.lng,
        });
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
        display: "inline-block",
        padding: "14px 28px",
        background: "var(--copper)",
        color: "white",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      Add this tour to my journey &rarr;
    </button>
  );
}
