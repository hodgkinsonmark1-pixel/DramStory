"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import LocationStep from "./LocationStep";
import TripLengthStep from "./TripLengthStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";

interface JourneyFlowProps {
  timing: TripTiming;
  distilleries: Distillery[];
}

type Step = "location" | "tripLength" | "interests" | "workspace";

/**
 * Orchestrates the full 4-step intake: Q1 (When, already happened on the
 * homepage Hero) -> Q2 (Where) -> Step 3 (How long) -> Q4 (What matters)
 * -> workspace (map + itinerary). `timing` arrives here as the ?mode=
 * query param from the homepage.
 *
 * If a completed intake is already saved (e.g. the visitor came back via
 * "Back to your journey" from a distillery page), this skips straight to
 * the workspace instead of restarting the questions - only the itinerary
 * data used to persist across navigation, not which step you were on,
 * which made "back to your journey" dump people back at Q2.
 */
export default function JourneyFlow({ timing, distilleries }: JourneyFlowProps) {
  const router = useRouter();
  const trip = useTrip();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [tripLength, setTripLength] = useState<TripLength | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);
  const [resumed, setResumed] = useState(false);

  // Resumes a previously-completed intake once the trip context finishes
  // reading localStorage (trip.ready flips async, after this component's
  // first render) - same justified exception as trip-context.tsx's own
  // localStorage hydration: syncing local step state to data that only
  // exists after an async, client-only read.
  useEffect(() => {
    if (trip.ready && trip.intake && !resumed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(trip.intake.location);
      setTripLength(trip.intake.tripLength);
      setInterests(trip.intake.interests);
      setStep("workspace");
      setResumed(true);
    }
  }, [trip.ready, trip.intake, resumed]);

  if (step === "location") {
    return (
      <LocationStep
        distilleries={distilleries}
        onBack={() => router.push("/")}
        onNext={(answer) => {
          setLocation(answer);
          setStep("tripLength");
        }}
      />
    );
  }

  if (step === "tripLength") {
    return (
      <TripLengthStep
        onBack={() => setStep("location")}
        onNext={(length) => {
          setTripLength(length);
          setStep("interests");
        }}
      />
    );
  }

  if (step === "interests") {
    return (
      <InterestsStep
        onBack={() => setStep("tripLength")}
        onNext={(selected) => {
          setInterests(selected);
          trip.completeIntake({ timing, location: location!, tripLength: tripLength!, interests: selected });
          setStep("workspace");
        }}
      />
    );
  }

  // step === "workspace" - location and tripLength are guaranteed set by now.
  // Prefer the saved intake's timing on a resumed session (trip.intake.timing)
  // over the fresh ?mode= prop, since that's what was actually answered.
  return (
    <Workspace
      distilleries={distilleries}
      location={location!}
      tripLength={tripLength!}
      initialInterests={interests}
      timing={trip.intake?.timing ?? timing}
    />
  );
}
