"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
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
 */
export default function JourneyFlow({ timing, distilleries }: JourneyFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [tripLength, setTripLength] = useState<TripLength | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);

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
          setStep("workspace");
        }}
      />
    );
  }

  // step === "workspace" - location and tripLength are guaranteed set by now.
  return (
    <Workspace
      distilleries={distilleries}
      location={location!}
      tripLength={tripLength!}
      initialInterests={interests}
      timing={timing}
    />
  );
}
