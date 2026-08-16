"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";

/**
 * Resolves a positional trip-day index to the Day slug that day came
 * from, then replaces the URL with /days/{slug}?trip={index}.
 *
 * A day built freehand in the planner has no sourceHubDaySlug and so has
 * no /days/[slug] page to go to - there is no published Day behind it.
 * Those go back to /trip rather than to a fabricated URL. (In practice
 * nothing links here with a freehand index: every in-app link into this
 * route came from a card that knew its Hub Day, and all of those now
 * point straight at /days/[slug]?trip=N.)
 *
 * Waits for trip.ready - the trip is empty until localStorage hydrates,
 * and redirecting before then would bounce everyone to /trip.
 */
export default function TripDayRedirect({ index }: { index: number }) {
  const trip = useTrip();
  const router = useRouter();

  useEffect(() => {
    if (!trip.ready) return;
    const slug = trip.days[index]?.sourceHubDaySlug;
    router.replace(slug ? `/days/${slug}?trip=${index}` : "/trip");
  }, [trip.ready, trip.days, index, router]);

  return <div className="day-screen" style={{ minHeight: "50vh" }} />;
}
