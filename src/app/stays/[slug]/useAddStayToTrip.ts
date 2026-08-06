"use client";

import { useRouter } from "next/navigation";
import type { FeaturedStay } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import { FEATURED_STAYS } from "@/lib/featured-stays";

/** The very first entry in FEATURED_STAYS is what a brand-new day's
 *  accommodation defaults to (see trip-context.tsx's addDay/syncDayCount)
 *  before a visitor has ever deliberately picked somewhere to stay. Used
 *  below to tell "day still on its untouched default" apart from "visitor
 *  chose this on purpose". */
const UNTOUCHED_DEFAULT = FEATURED_STAYS[0];

function isUntouchedDefault(accommodation: { name: string; lat: number; lng: number } | undefined): boolean {
  if (!accommodation) return true; // no accommodation set at all - definitely safe to fill in
  return (
    accommodation.name === UNTOUCHED_DEFAULT.name &&
    accommodation.lat === UNTOUCHED_DEFAULT.lat &&
    accommodation.lng === UNTOUCHED_DEFAULT.lng
  );
}

/**
 * Shared "+ Add to my trip" behaviour for a Featured Stay page (06 Aug 2026:
 * now a single sidebar button after the two-column simplification, but
 * kept as a shared hook so any future second button gets the identical,
 * careful behaviour automatically).
 *
 * Option C (confirmed with Mark 05 Aug 2026): a hotel page
 * has no day context to anchor an "all vs from here" choice to, so rather
 * than either always overwriting every day or bolting on new prompt UI,
 * this only ever fills in days still sitting on the untouched default
 * accommodation, leaving any day the visitor has genuinely customised
 * alone. If every day already has a deliberate choice, nothing is
 * silently overwritten - the visitor is just taken to the planner.
 *
 * Deliberately does NOT touch trip-context.tsx itself (uses only the
 * existing per-day setAccommodation setter) - colocated under
 * stays/[slug] rather than src/components/ so this behaviour stays
 * specific to the hotel template and can't affect any other page that
 * also uses the trip context.
 */
export function useAddStayToTrip(s: FeaturedStay) {
  const trip = useTrip();
  const router = useRouter();

  return function handleAddToTrip() {
    if (!trip.ready) return; // avoid acting on a not-yet-hydrated trip

    const thisAccommodation = { name: s.name, lat: s.lat, lng: s.lng };

    if (!trip.intake || trip.days.length === 0) {
      // No trip yet - start one with sensible defaults, same pattern as
      // AddDayToTripButton/AddJourneyToTripButton use for a first-time
      // visitor landing on a standalone content page.
      if (!trip.intake) {
        trip.completeIntake({
          timing: "planning",
          location: { kind: "region", region: "islay" },
          interests: ["distilleries"],
        });
      }
      const newDayIndex = trip.days.length;
      if (newDayIndex === 0) trip.addDay();
      trip.setAccommodation(newDayIndex, thisAccommodation);
      router.push("/journey?resume=1");
      return;
    }

    const untouchedIndexes = trip.days
      .map((day, i) => ({ i, untouched: isUntouchedDefault(day.accommodation) }))
      .filter((d) => d.untouched)
      .map((d) => d.i);

    if (untouchedIndexes.length === 0) {
      // Every day already reflects a deliberate choice - nothing safe to
      // fill in without silently overwriting one of them. Take the
      // visitor to the planner to update it themselves rather than
      // guessing which night they meant.
      router.push("/journey?resume=1");
      return;
    }

    for (const i of untouchedIndexes) trip.setAccommodation(i, thisAccommodation);
    router.push("/journey?resume=1");
  };
}
