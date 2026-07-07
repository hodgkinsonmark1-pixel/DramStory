"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, LocalEvent, LocalFeature, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import LocationStep from "./LocationStep";
import TripLengthStep from "./TripLengthStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";

interface JourneyFlowProps {
  timing: TripTiming;
  distilleries: Distillery[];
  /** Deliberately an unresolved Promise, not a plain array - Local
   *  Features isn't needed until the final "workspace" step, so the page
   *  no longer blocks Q2/Step3/Q4 on this fetch resolving. Unwrapped via
   *  use() only once we reach the workspace, inside a Suspense boundary. */
  localFeaturesPromise: Promise<LocalFeature[]>;
  /** Same deferred-fetch treatment as localFeaturesPromise, for the same
   *  reason - Local Events isn't needed before the workspace either. */
  localEventsPromise: Promise<LocalEvent[]>;
  /** True only when arriving via "Back to your journey" (see
   *  DistilleryPageClient's ?resume=1 link) - an explicit signal that
   *  resuming the saved trip is wanted. A fresh homepage Q1 click never
   *  sets this, even if a trip from a previous session still exists in
   *  localStorage - that previously caused a real bug: picking a Q1
   *  option looked like it "skipped" Q2/Step3/Q4 straight to the map,
   *  because ANY saved intake was silently resumed regardless of intent. */
  resume: boolean;
}

type Step = "location" | "tripLength" | "interests" | "workspace";

/** Tiny wrapper so use() (which suspends) is isolated to just this
 *  component - only the workspace step ever waits on Local Features/Events. */
function WorkspaceWithFeatures(props: {
  localFeaturesPromise: Promise<LocalFeature[]>;
  localEventsPromise: Promise<LocalEvent[]>;
  distilleries: Distillery[];
  location: LocationAnswer;
  tripLength: TripLength;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}) {
  const localFeatures = use(props.localFeaturesPromise);
  const localEvents = use(props.localEventsPromise);
  return (
    <Workspace
      distilleries={props.distilleries}
      localFeatures={localFeatures}
      localEvents={localEvents}
      location={props.location}
      tripLength={props.tripLength}
      initialInterests={props.initialInterests}
      timing={props.timing}
    />
  );
}

/**
 * Orchestrates the full 4-step intake: Q1 (When, already happened on the
 * homepage Hero) -> Q2 (Where) -> Step 3 (How long) -> Q4 (What matters)
 * -> workspace (map + itinerary). `timing` arrives here as the ?mode=
 * query param from the homepage.
 */
export default function JourneyFlow({ timing, distilleries, localFeaturesPromise, localEventsPromise, resume }: JourneyFlowProps) {
  const router = useRouter();
  const trip = useTrip();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [tripLength, setTripLength] = useState<TripLength | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);
  const [handledInitialState, setHandledInitialState] = useState(false);

  // Runs once trip.ready flips true (localStorage hydration completes):
  // - resume=1 + a saved intake exists -> jump straight to the workspace
  //   with those saved answers (the "Back to your journey" case)
  // - otherwise -> clear any stale trip so a fresh Q1 visit always starts
  //   clean, never silently continuing an old session
  useEffect(() => {
    if (!trip.ready || handledInitialState) return;
    if (resume && trip.intake) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(trip.intake.location);
      setTripLength(trip.intake.tripLength);
      setInterests(trip.intake.interests);
      setStep("workspace");
    } else if (!resume && (trip.intake || trip.days.length > 0)) {
      trip.resetTrip();
    }
    setHandledInitialState(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.ready, handledInitialState]);

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
    <Suspense fallback={<div className="workspace-root" />}>
      <WorkspaceWithFeatures
        localFeaturesPromise={localFeaturesPromise}
        localEventsPromise={localEventsPromise}
        distilleries={distilleries}
        location={location!}
        tripLength={tripLength!}
        initialInterests={interests}
        timing={trip.intake?.timing ?? timing}
      />
    </Suspense>
  );
}
