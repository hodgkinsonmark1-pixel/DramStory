"use client";

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";
import type { JourneyDay } from "@/lib/journeys-data";
import type { Distillery } from "@/lib/types";

/**
 * Per-day sibling of AddJourneyToTripButton - appends just this one day's
 * distillery stops to the visitor's existing trip (starting a fresh one
 * with sensible defaults if they don't have one yet), rather than
 * resetting everything to seed the whole multi-day journey at once. Same
 * "distilleries only" scoping as the whole-journey button - non-distillery
 * activities (the pool, the bike hire, the beach) stay descriptive
 * content on this page rather than being silently dropped or
 * half-represented in the workspace.
 */
export default function AddDayToTripButton({
  day,
  distilleries,
}: {
  day: JourneyDay;
  distilleries: Distillery[];
}) {
  const trip = useTrip();
  const router = useRouter();

  const dayDistilleries = [...day.morning, ...day.afternoon]
    .filter((s) => s.kind === "distillery")
    .map((s) => distilleries.find((x) => x.slug === s.distillerySlug))
    .filter((d): d is Distillery => !!d);

  // A day with no distillery stops (e.g. a pure ferry/departure day) has
  // nothing to add to the workspace - no button rather than a button
  // that silently does nothing.
  if (dayDistilleries.length === 0) return null;

  function handleClick() {
    if (!trip.intake) {
      trip.completeIntake({
        timing: "planning",
        location: { kind: "region", region: "islay" },
        interests: ["distilleries"],
      });
    }
    const newDayIndex = trip.days.length;
    trip.addDay();
    for (const d of dayDistilleries) {
      trip.addStop(newDayIndex, d);
    }
    if (day.overnight) {
      trip.setAccommodation(newDayIndex, {
        name: day.overnight.village,
        lat: day.overnight.lat,
        lng: day.overnight.lng,
      });
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
