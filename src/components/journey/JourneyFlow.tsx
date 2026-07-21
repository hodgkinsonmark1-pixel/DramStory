"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery, InterestCategoryId, JournalPost, LocalEvent, LocalFeature, LocationAnswer, TripTiming } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import LocationStep from "./LocationStep";
import TodayLocationStep from "./TodayLocationStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";

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
  /** Temporary QA aid (see journey/page.tsx's parseDebugHour) - overrides
   *  the real device clock in seedTodayDay when set, so the before/after
   *  4pm branches can be previewed on demand via ?debugHour=13 rather than
   *  waiting for the actual hour. Remove alongside that parsing function
   *  once this is merged to main. */
  debugHour?: number;
}

type Step = "location" | "today-location" | "interests" | "workspace";

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
  todayNotice?: string;
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
      todayNotice={props.todayNotice}
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
 * resume), the workspace is seeded with a default Day rather than
 * opening blank - see DEFAULT_DAY_STOPS below. Originally just the
 * "Three Legends, One Road" three-distillery Hub Day (Laphroaig,
 * Lagavulin, Ardbeg); extended 21 July 2026 to the fuller Laphroaig ->
 * Lagavulin -> Old Kiln Cafe -> Ardbeg -> Port Ellen Beach route, mixing
 * in two real Local Features stops (lunch + a closing beach) rather than
 * distilleries only. Hardcoded here rather than read live from Airtable
 * - the itinerary data model only knows individual distillery/feature
 * stops, not "Day" records, and building the real Day->itinerary
 * resolution is its own task (same one the Classic Journey refactor
 * needs). Revisit once that's built, so this doesn't drift out of sync
 * with the real Day content by hand.
 *
 * Notes on each stop are short and practical - they're seed content, not
 * sourced Airtable facts, so held to a lighter bar than the Location
 * Source/official-source standard. As of 21 July 2026 two of them
 * (Lagavulin, Ardbeg) include specific clock times per Mark's direct
 * input - worth re-confirming against each distillery's current
 * published tour schedule before go-live and periodically after, since
 * tour times do shift (this is exactly the risk the original
 * no-times version was avoiding).
 *
 * Each distillery stop also seeds a specific real tour (tourName below,
 * matched against that distillery's own Tours from Airtable) so the
 * itinerary and the Total Journey cost breakdown both show a real
 * booked tour + price rather than "No tour selected" - 21 July 2026
 * fix. Deliberately the same three tours already linked to the "Three
 * Legends, One Road" Hub Day in Airtable (Laphroaig Experience £22,
 * Classic Distillery Tour £22, Classic Ardbeg Tour £22.50) - this
 * default day started life as that exact Hub Day, so reusing its tours
 * keeps the two in sync rather than picking new ones by hand.
 *
 * "today" now gets its own considered default (added 21 July 2026, see
 * seedTodayDay below) rather than the old no-pre-seed fallback - it asks
 * one lightweight extra question (TodayLocationStep: "which distillery are
 * you nearest to right now?") and combines that with the device's current
 * time to seed something realistic for the rest of the day, rather than
 * reusing the planning/dreaming default verbatim (which assumes a full day
 * still ahead, not true for someone asking at 4pm).
 */
const DEFAULT_DAY_STOPS: { kind: "distillery" | "feature"; slug: string; note: string; tourName?: string }[] = [
  { kind: "distillery", slug: "laphroaig", note: "First stop of the day, starts at 10.", tourName: "Laphroaig Experience" },
  { kind: "distillery", slug: "lagavulin", note: "Just along the coast road, tour at 12.", tourName: "Classic Distillery Tour" },
  { kind: "feature", slug: "old-kiln-cafe-ardbeg", note: "Right on Ardbeg's pier - a good lunch stop before the tour." },
  { kind: "distillery", slug: "ardbeg", note: "3pm: Popular tour - worth booking ahead.", tourName: "Classic Ardbeg Tour" },
  { kind: "feature", slug: "port-ellen-beach", note: "Maybe a picnic on the beach or the pub to finish the day." },
];

/** 4pm, agreed with Mark 21 July 2026 - conservative on purpose. Tours
 *  aren't tracked with real start/end times in Airtable yet (Distillery.hours
 *  is a freeform display string, not structured slots), so this can't know
 *  whether a specific tour is actually still bookable - it only knows
 *  roughly how much of the day is realistically left. Better to undersell
 *  (send someone to a viewpoint who could maybe have squeezed in one more
 *  tour) than oversell (seed a distillery whose last tour has already gone). */
const EVENING_CUTOFF_HOUR = 16;

/** Seeds today's single Day once TodayLocationStep answers "where" and the
 *  device clock supplies "when" - see the JSDoc above DEFAULT_DAY_STOPS for
 *  why this exists as its own function rather than reusing that default.
 *
 * Deliberately does NOT set a specific tour (setTourForStop) or a clock-time
 * note the way DEFAULT_DAY_STOPS does for planning/dreaming - those come
 * from Mark's direct, sourced input for one specific fixed route. This seed
 * is generated fresh from whichever distillery/feature is nearest, so
 * claiming a specific tour or time here would be inventing precision the
 * underlying data can't back up. Notes stay honest about what's actually
 * known: which stop is nearest, and roughly how far the next one is.
 *
 * Also deliberately does NOT set an accommodation default (unlike
 * planning/dreaming's FEATURED_STAYS[0]) - inventing a place someone's
 * staying tonight isn't ours to assume. Past the evening cutoff, the
 * seeded stop's own note nudges toward the real "Where are you staying?"
 * control instead.
 *
 * Returns the interest categories the workspace should open with, and (past
 * the evening cutoff) an explainer notice - both computed here, alongside
 * the actual stops, so there's exactly one place that decides what "past
 * the evening cutoff" means. Added 21 July 2026 per Mark's direct
 * feedback on the first pass: the workspace was opening on the
 * "Distilleries" category even when zero distilleries were seeded (no
 * visible reason given for why), and the "no distillery today" reasoning
 * was buried in a stop's own note rather than stated up front. */
function seedTodayDay(
  trip: ReturnType<typeof useTrip>,
  hour: number,
  start: Distillery,
  distilleries: Distillery[],
  localFeatures: LocalFeature[]
): { interests: InterestCategoryId[]; notice?: string } {
  trip.initDays(1);

  if (hour < EVENING_CUTOFF_HOUR) {
    trip.addStop(0, start);
    trip.setStopNote(0, start.slug, "Closest to where you are right now - worth checking what's still on today.");

    // Before ~1pm there's realistically time for one more stop after this
    // one; later than that, one distillery is a more honest suggestion
    // than two.
    const stopBudget = hour < 13 ? 2 : 1;
    const others = distilleries
      .filter((d) => d.slug !== start.slug)
      .map((d) => ({ d, minutes: estimatedDriveMinutes(start, d) }))
      .sort((a, b) => a.minutes - b.minutes);

    for (let i = 0; i < stopBudget - 1 && i < others.length; i++) {
      const { d, minutes } = others[i];
      trip.addStop(0, d);
      trip.setStopNote(0, d.slug, `About ${formatDuration(minutes)} on from your first stop.`);
    }
    return { interests: ["distilleries"] };
  }

  // Too late in the day for a fresh distillery tour to be a fair
  // suggestion - wind down with one nearby Local Feature instead (per
  // Mark's 21 July feedback: one specific, warmly-framed suggestion reads
  // better than two generic nearest-anything stops), and nudge toward
  // sorting accommodation if that's still needed tonight. Opens on the
  // categories that are actually relevant now (food/drink, natural
  // features, places to stay) rather than leaving "Distilleries" active
  // with nothing seeded under it.
  const eveningInterests: InterestCategoryId[] = ["natural-features", "local-attractions", "places-to-eat", "places-to-stay"];
  const eveningExplainer =
    "It's getting late in the day for a fresh distillery tour, so instead see attractions, natural features, places to eat and drink that are local to you.";

  // Tiered search, nearest first within each tier: a genuine "local gem"
  // record if one's close, otherwise widen to the rest of the Natural
  // Features bucket (beach/walk/bike-route), otherwise any Local Feature
  // at all bar transport - so this always finds something to suggest
  // rather than seeding nothing just because no literal "local gem" is
  // nearby.
  function nearest(categories: LocalFeature["category"][]) {
    return localFeatures
      .filter((f) => categories.includes(f.category))
      .map((f) => ({ f, minutes: estimatedDriveMinutes(start, f) }))
      .sort((a, b) => a.minutes - b.minutes)[0];
  }
  const chosen =
    nearest(["local-gem"]) ??
    nearest(["beach", "walk", "bike-route"]) ??
    nearest(["historic-site", "attraction-gem", "pub", "cafe", "restaurant", "golf", "spa"]);

  if (chosen) {
    trip.addFeatureStop(0, chosen.f);
    trip.setStopNote(
      0,
      chosen.f.id,
      `Why don't you visit this local gem? It's about ${formatDuration(chosen.minutes)} from where you are now. If you still need somewhere to stay tonight, add it under "Where are you staying?" below.`
    );
    // Per Mark's 21 July feedback: the same "why don't you visit this
    // local gem" nudge repeated in the itinerary panel's own notice box
    // (blank line, then the question) - the stop's own note above only
    // shows once that stop card is expanded, so this makes the same
    // suggestion visible immediately, without needing to expand anything.
    const eveningNotice = `${eveningExplainer}\n\nWhy don't you visit this local gem?`;
    return { interests: eveningInterests, notice: eveningNotice };
  }

  // No Local Features resolved at all (shouldn't normally happen) - fall
  // back to the starting distillery itself rather than seeding an empty
  // day, and skip the "local gem" line since nothing was actually seeded.
  trip.addStop(0, start);
  trip.setStopNote(0, start.slug, "Worth checking if there's still time for a visit today.");
  return { interests: eveningInterests, notice: eveningExplainer };
}

export default function JourneyFlow({ timing, distilleriesPromise, localFeaturesPromise, localEventsPromise, journalPostsPromise, resume, debugHour }: JourneyFlowProps) {
  const router = useRouter();
  const trip = useTrip();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);
  const [handledInitialState, setHandledInitialState] = useState(false);
  // Only ever set by TodayLocationStep's onNext, past the evening cutoff -
  // see seedTodayDay. Undefined for every other path/timing.
  const [todayNotice, setTodayNotice] = useState<string | undefined>(undefined);

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
  //   Q2/Q3, but ask the one lightweight TodayLocationStep question before
  //   seeding (see seedTodayDay above) and moving to the workspace
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
      // Ask TodayLocationStep's one question before seeding anything -
      // see seedTodayDay for what "where" (this answer) and "when" (the
      // device clock, read once the question is answered) combine into.
      setStep("today-location");
      setHandledInitialState(true);
      return;
    }

    // planning/dreaming: seed the default Day rather than open blank.
    Promise.all([distilleriesPromise, localFeaturesPromise]).then(([distilleries, localFeatures]) => {
      trip.initDays(1);
      for (const entry of DEFAULT_DAY_STOPS) {
        if (entry.kind === "distillery") {
          const d = distilleries.find((x) => x.slug === entry.slug);
          if (!d) continue;
          trip.addStop(0, d);
          trip.setStopNote(0, d.slug, entry.note);
          const tour = entry.tourName ? d.tours.find((t) => t.name === entry.tourName) : undefined;
          if (tour) trip.setTourForStop(0, d, tour);
        } else {
          const f = localFeatures.find((x) => x.slug === entry.slug);
          if (!f) continue;
          trip.addFeatureStop(0, f);
          trip.setStopNote(0, f.id, entry.note);
        }
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
  // the inactivated "location"/"interests" steps once handledInitialState
  // flips true, so gating the render on that too means LocationStep/
  // InterestsStep are retained in code but never actually shown in the
  // current flow. "today-location" is a live exception - handledInitialState
  // flipping true for a fresh "today" visit means "show that question now",
  // not "skip past it".
  if (!handledInitialState) {
    return <div className="workspace-root" />;
  }

  if (step === "today-location") {
    return (
      <TodayLocationStep
        distilleriesPromise={distilleriesPromise}
        onBack={() => router.push("/")}
        onNext={(distillerySlug) => {
          const answer: LocationAnswer = { kind: "distillery", distillerySlug };
          setLocation(answer);
          Promise.all([distilleriesPromise, localFeaturesPromise]).then(([distilleries, localFeatures]) => {
            const start = distilleries.find((d) => d.slug === distillerySlug);
            // Fallback interests if the chosen slug somehow isn't found
            // (shouldn't happen - it came from this same distilleries
            // list) - matches the pre-cutoff default rather than seeding
            // nothing and explaining nothing.
            const seeded = start
              ? seedTodayDay(trip, debugHour ?? new Date().getHours(), start, distilleries, localFeatures)
              : { interests: ["distilleries"] as InterestCategoryId[] };
            setInterests(seeded.interests);
            setTodayNotice(seeded.notice);
            trip.completeIntake({ timing, location: answer, interests: seeded.interests });
            setStep("workspace");
          });
        }}
      />
    );
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
        todayNotice={todayNotice}
      />
    </Suspense>
  );
}
