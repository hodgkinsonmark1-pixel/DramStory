"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, JournalPost, LocalEvent, LocalFeature, LocationAnswer, TripTiming } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import LocationStep from "./LocationStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";

interface JourneyFlowProps {
  timing: TripTiming;
  /** Deferred, same reasoning as localFeaturesPromise/localEventsPromise -
   *  Q2's primary region cards don't need this; only the secondary "a
   *  specific distillery" dropdown does, and the workspace step. Also now
   *  used by both Q2 and Q3's below-the-fold homepage sections. */
  distilleriesPromise: Promise<Distillery[]>;
  /** Deliberately an unresolved Promise, not a plain array - Local
   *  Features isn't needed until the final "workspace" step, so the page
   *  no longer blocks Q2/Q3 on this fetch resolving. Unwrapped via use()
   *  only once we reach the workspace, inside a Suspense boundary. */
  localFeaturesPromise: Promise<LocalFeature[]>;
  /** Same deferred-fetch treatment as localFeaturesPromise for the
   *  workspace step - also threaded into Q2/Q3's below-the-fold "Get to
   *  know" section, which needs it for the Events column. */
  localEventsPromise: Promise<LocalEvent[]>;
  /** Deferred fetch for the below-the-fold Journal preview shown under
   *  Q2 and Q3 now that those steps extend the homepage rather than
   *  being separate dead-ended pages (July 2026). */
  journalPostsPromise: Promise<JournalPost[]>;
  /** True only when arriving via "Back to your journey" (see
   *  DistilleryPageClient's ?resume=1 link) - an explicit signal that
   *  resuming the saved trip is wanted. A fresh homepage Q1 click never
   *  sets this, even if a trip from a previous session still exists in
   *  localStorage - that previously caused a real bug: picking a Q1
   *  option looked like it "skipped" Q2/Q3 straight to the map, because
   *  ANY saved intake was silently resumed regardless of intent. */
  resume: boolean;
}

type Step = "location" | "interests" | "workspace";

// Q3 ("what matters most to your trip?") is skipped on desktop - the
// walkthrough already demonstrates that every one of these categories is
// just a toggle button on the map itself, so pre-selecting them upfront on
// a wide screen where toggling costs nothing is just extra friction before
// the actual product. Kept for tablet/mobile for now, where a cluttered
// first impression of the map matters more - revisit properly as part of
// the dedicated mobile design review.
const DESKTOP_BREAKPOINT = 1024;

/** Tiny wrapper so use() (which suspends) is isolated to just this
 *  component - only the workspace step ever waits on Local Features/Events. */
function WorkspaceWithFeatures(props: {
  distilleriesPromise: Promise<Distillery[]>;
  localFeaturesPromise: Promise<LocalFeature[]>;
  localEventsPromise: Promise<LocalEvent[]>;
  location: LocationAnswer;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}) {
  const distilleries = use(props.distilleriesPromise);
  const localFeatures = use(props.localFeaturesPromise);
  const localEvents = use(props.localEventsPromise);
  return (
    <Workspace
      distilleries={distilleries}
      localFeatures={localFeatures}
      localEvents={localEvents}
      location={props.location}
      initialInterests={props.initialInterests}
      timing={props.timing}
    />
  );
}

/**
 * Orchestrates the intake: Q1 (When, already happened on the homepage
 * Hero) -> Q2 (Where) -> Q3 (What matters) -> workspace (map + itinerary).
 * `timing` arrives here as the ?mode= query param from the homepage.
 *
 * Q3 is skipped on desktop as of July 2026 - see DESKTOP_BREAKPOINT above
 * for the reasoning. Still shown on tablet/mobile widths for now.
 *
 * There used to be a "How long will your adventure last?" step (Step 3 of
 * 4) between Q2 and Q3 - removed (July 2026) since trip length no longer
 * needs asking upfront: it becomes evident once the visitor sets specific
 * dates in the workspace header (the itinerary day count then follows the
 * date range - see Workspace's date-range sync effect), or simply from
 * however many days they build for themselves via +Add day/Remove.
 */
export default function JourneyFlow({ timing, distilleriesPromise, localFeaturesPromise, localEventsPromise, journalPostsPromise, resume }: JourneyFlowProps) {
  const router = useRouter();
  const trip = useTrip();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);
  const [handledInitialState, setHandledInitialState] = useState(false);

  // Runs once trip.ready flips true (localStorage hydration completes):
  // - resume=1 + a saved intake exists -> jump straight to the workspace
  //   with those saved answers (the "Back to your journey" case)
  // - resume=1 + no intake but real stops exist -> a trip started
  //   directly from a distillery page's "+ Add to Journey" button, which
  //   never goes through Q1-Q3 and so never sets intake. Jump to the
  //   workspace anyway with sensible defaults, rather than stranding the
  //   visitor back at Q1 despite having a real trip with real stops.
  // - otherwise -> clear any stale trip so a fresh Q1 visit always starts
  //   clean, never silently continuing an old session
  useEffect(() => {
    if (!trip.ready || handledInitialState) return;
    if (resume && trip.intake) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(trip.intake.location);
      setInterests(trip.intake.interests);
      setStep("workspace");
    } else if (resume && !trip.intake && trip.days.length > 0) {
      setLocation({ kind: "region", region: "islay" });
      setInterests(["distilleries"]);
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
        distilleriesPromise={distilleriesPromise}
        localEventsPromise={localEventsPromise}
        journalPostsPromise={journalPostsPromise}
        onBack={() => router.push("/")}
        onNext={(answer) => {
          setLocation(answer);
          if (typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT) {
            // Desktop: skip Q3, default to just Distilleries active (same
            // fallback already used for the "today" flow elsewhere).
            const defaultInterests: InterestCategoryId[] = ["distilleries"];
            setInterests(defaultInterests);
            trip.completeIntake({ timing, location: answer, interests: defaultInterests });
            setStep("workspace");
          } else {
            setStep("interests");
          }
        }}
      />
    );
  }

  if (step === "interests") {
    return (
      <InterestsStep
        distilleriesPromise={distilleriesPromise}
        localEventsPromise={localEventsPromise}
        journalPostsPromise={journalPostsPromise}
        onBack={() => setStep("location")}
        onNext={(selected) => {
          setInterests(selected);
          trip.completeIntake({ timing, location: location!, interests: selected });
          setStep("workspace");
        }}
      />
    );
  }

  // step === "workspace" - location is guaranteed set by now.
  // Prefer the saved intake's timing on a resumed session (trip.intake.timing)
  // over the fresh ?mode= prop, since that's what was actually answered.
  return (
    <Suspense fallback={<div className="workspace-root" />}>
      <WorkspaceWithFeatures
        distilleriesPromise={distilleriesPromise}
        localFeaturesPromise={localFeaturesPromise}
        localEventsPromise={localEventsPromise}
        location={location!}
        initialInterests={interests}
        timing={trip.intake?.timing ?? timing}
      />
    </Suspense>
  );
}
