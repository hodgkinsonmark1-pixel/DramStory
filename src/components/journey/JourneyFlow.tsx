"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, JournalPost, LocalEvent, LocalFeature, LocationAnswer, TripTiming } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import LocationStep from "./LocationStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";
import { FEATURED_STAYS } from "./AccommodationControl";

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
 * Orchestrates the intake. As of 18 July 2026: Q1 (When, already happened
 * on the homepage Hero) goes straight to the workspace - Q2 (Where) and Q3
 * (What matters) are no longer shown to visitors. Q2's region-picker code
 * (LocationStep) is INACTIVATED, not deleted - it's retained for when a
 * second region launches and picking "where" becomes a real question
 * again. Q3 (InterestsStep) is fully skipped now too, same as it already
 * was on desktop; "select your preference" is no longer treated as a
 * question worth asking at all, on any breakpoint.
 *
 * For a fresh "planning"/"dreaming" visit (no existing trip, not a
 * resume), the workspace is seeded with the "Three Legends, One Road"
 * Hub Day (Laphroaig, Lagavulin, Ardbeg) rather than opening blank - see
 * DEFAULT_DAY_DISTILLERY_SLUGS below. This mirrors the real Airtable Day
 * of the same name, but is hardcoded here rather than read live from
 * Airtable - the itinerary data model only knows individual distillery
 * stops, not "Day" records, and building the real Day->itinerary
 * resolution is its own task (same one the Classic Journey refactor
 * needs). Revisit once that's built, so this doesn't drift out of sync
 * with the real Day content by hand.
 *
 * "today" is deliberately left with the old default (no pre-seeded day,
 * just Distilleries active) - it needs its own considered default, not
 * this one, per 18 July 2026 conversation. Flagged as a real gap, not an
 * oversight.
 */
const DEFAULT_DAY_DISTILLERY_SLUGS = ["laphroaig", "lagavulin", "ardbeg"];

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
  // - a genuinely fresh visit (no resume, no existing intake/days) with
  //   timing planning/dreaming -> seed the default Day (see above) and go
  //   straight to the workspace, skipping Q2/Q3 entirely
  // - otherwise (fresh "today" visit) -> clear any stale trip, skip
  //   Q2/Q3, go to the workspace with the old no-pre-seed default
  useEffect(() => {
    if (!trip.ready || handledInitialState) return;
    if (resume && trip.intake) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(trip.intake.location);
      setInterests(trip.intake.interests);
      setStep("workspace");
      setHandledInitialState(true);
      return;
    }
    if (resume && !trip.intake && trip.days.length > 0) {
      setLocation({ kind: "region", region: "islay" });
      setInterests(["distilleries"]);
      setStep("workspace");
      setHandledInitialState(true);
      return;
    }
    // Genuinely fresh visit past this point - always clear any stale trip
    // first so this never silently continues an old session.
    if (trip.intake || trip.days.length > 0) trip.resetTrip();

    const freshLocation: LocationAnswer = { kind: "region", region: "islay" };
    const freshInterests: InterestCategoryId[] = ["distilleries"];
    setLocation(freshLocation);
    setInterests(freshInterests);

    if (timing === "today") {
      // "today" gets its own considered default later - for now, same
      // no-pre-seed fallback the desktop skip already used.
      trip.completeIntake({ timing, location: freshLocation, interests: freshInterests });
      setStep("workspace");
      setHandledInitialState(true);
      return;
    }

    // planning/dreaming: seed the default Day rather than open blank.
    distilleriesPromise.then((distilleries) => {
      trip.initDays(1);
      for (const slug of DEFAULT_DAY_DISTILLERY_SLUGS) {
        const d = distilleries.find((x) => x.slug === slug);
        if (d) trip.addStop(0, d);
      }
      // The Machrie as the default accommodation base (21 July 2026 -
      // supersedes the original Port Ellen default from 19 July). Same
      // Featured Stay AccommodationControl now defaults to whenever a day
      // has no stay set - kept in sync via the shared FEATURED_STAYS
      // export rather than a second hardcoded value here.
      trip.setAccommodation(0, FEATURED_STAYS[0]);
      trip.completeIntake({ timing, location: freshLocation, interests: freshInterests });
      setStep("workspace");
      setHandledInitialState(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.ready, handledInitialState]);

  // Avoids ever flashing the now-inactive Q2 (location) UI while the
  // initial-state effect above is still resolving - it always moves past
  // "location" once handledInitialState flips true, so gating the render
  // on that too means LocationStep/InterestsStep are retained in code but
  // never actually shown in the current flow.
  if (!handledInitialState) {
    return <div className="workspace-root" />;
  }

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
