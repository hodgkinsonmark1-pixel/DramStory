"use client";

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/trip-context";
import type { Journey } from "@/lib/types";

/**
 * "Put this trip in my planner →" - the single ask on /journeys/[slug]
 * (18 Aug 2026), replacing the two equal buttons that used to force a
 * choice before anyone knew what either did.
 *
 * IT IS A PLACEHOLDER, deliberately and visibly. The trip lives in this
 * browser's localStorage today (see trip-context.tsx); visitor accounts
 * are the next thing to be built. So the sub-line says where the trip is
 * actually kept rather than implying it is saved anywhere the visitor
 * could get it back from on another device. Nothing about the label, the
 * layout or the copy above it is written as if accounts already exist.
 *
 * HOW THE ACCOUNT-BACKED VERSION REPLACES THIS, without a redesign: the
 * only two things that change are `save()` and `deviceNote`. `save()` is
 * the whole of what "putting it in the planner" means right now - seed
 * TripContext, then go to the planner - and an account-backed save is the
 * same call with a POST in front of it. `deviceNote` is the one sentence
 * that stops being true the day that lands. The button, its label, its
 * classes and its position in the navy block all stay exactly as they
 * are, which is the point.
 *
 * Behaviourally this is AddJourneyToTripButton's seeding logic (that
 * component and AddJourneyDaysButton are now both gone from this page,
 * and their "Start this as my trip" / "Add just the days" pair with
 * them). Only distillery stops are seeded, for the same reason that
 * component gave: a beach or a walk isn't itinerary-stop-shaped in the
 * trip data model, so it stays descriptive content on the page rather
 * than being half-represented in the workspace.
 */
export default function PutInPlannerButton({
  journey,
  note,
  deviceNote,
}: {
  journey: Journey;
  /** "Free, and you can edit it after." - the promise. */
  note: string;
  /** Where the trip is actually kept, today. Not a footnote: it is the
   *  sentence that makes the promise above honest. */
  deviceNote: string;
}) {
  const trip = useTrip();
  const router = useRouter();

  if (!journey.days || journey.days.length === 0) return null;

  function save() {
    const days = journey.days;
    trip.resetTrip();
    trip.initDays(days.length);
    days.forEach((day, dayIndex) => {
      for (const stop of day.stops) {
        trip.addStop(dayIndex, stop.distillery, stop.anchor);
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
    <div className="jr-ask-action">
      <button type="button" onClick={save} className="jr-ask-button">
        Put this trip in my planner &rarr;
      </button>
      <p className="jr-ask-note">{note}</p>
      <p className="jr-ask-device">{deviceNote}</p>
    </div>
  );
}
