"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, LocationAnswer, TripTiming } from "@/lib/types";
import LocationStep from "./LocationStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";

interface JourneyFlowProps {
  timing: TripTiming;
  distilleries: Distillery[];
}

type Step = "location" | "interests" | "workspace";

/**
 * Orchestrates Q2 (Where) -> Q3 (What matters) -> workspace (map + itinerary).
 * Q1 (When) already happened on the homepage Hero and arrives here as the
 * `timing` prop from the ?mode= query param — that's why progress dots on
 * the first screen here start at "done" rather than step 1.
 */
export default function JourneyFlow({ timing, distilleries }: JourneyFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);

  if (step === "location") {
    return (
      <LocationStep
        distilleries={distilleries}
        onBack={() => router.push("/")}
        onNext={(answer) => {
          setLocation(answer);
          setStep("interests");
        }}
      />
    );
  }

  if (step === "interests") {
    return (
      <InterestsStep
        onBack={() => setStep("location")}
        onNext={(selected) => {
          setInterests(selected);
          setStep("workspace");
        }}
      />
    );
  }

  // step === "workspace" — location is guaranteed set by this point.
  return (
    <Workspace
      distilleries={distilleries}
      location={location!}
      initialInterests={interests}
      timing={timing}
    />
  );
}
