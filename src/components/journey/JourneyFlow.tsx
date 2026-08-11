"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Area, Distillery, FeaturedStay, HubDay, InterestCategoryId, JournalPost, LocalEvent, LocalFeature, LocationAnswer, TripTiming } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import LocationStep from "./LocationStep";
import TodayLocationStep from "./TodayLocationStep";
import InterestsStep from "./InterestsStep";
import Workspace from "./Workspace";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";
import { INTEREST_CATEGORIES, TODAY_EXCLUDED_DISTILLERY_SLUGS } from "@/lib/journey-options";

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
  /** Deferred, workspace-only (same treatment as localFeaturesPromise/
   *  localEventsPromise) - Phase 5's planner context bar (Workspace.tsx)
   *  needs the real Hub Days to detect a day's sourceHubDaySlug origin
   *  and to reset/offer back its original stops (docs/days-trip-flow-
   *  handoff.md §3.5, §10 "Planner"). */
  hubDaysPromise: Promise<HubDay[]>;
  /** Deferred fetch for the workspace step's "Where to stay" grid - the
   *  3 real, live Areas (Port Ellen, Bowmore, Port Charlotte). Same
   *  deferred/use()-in-Suspense treatment as localFeaturesPromise; not
   *  needed until the workspace renders. */
  areasPromise: Promise<Area[]>;
  /** Same deferred treatment as areasPromise, for the same "Where to
   *  stay" grid's 4 curated hotels - the richer Airtable-backed
   *  FeaturedStay (image, whyStay, slug), not the static lat/lng-only
   *  FEATURED_STAYS used for map pins/the accommodation dropdown. */
  featuredStaysPromise: Promise<FeaturedStay[]>;
  /** True only when arriving via "Back to your journey" (see
   *  DistilleryPageClient's ?resume=1 link) - an explicit signal that
   *  resuming the saved trip is wanted. A fresh homepage Q1 click never
   *  sets this, even if a trip from a previous session still exists in
   *  localStorage - that previously caused a real bug: picking a Q1
   *  option looked like it "skipped" Q2/Q3 straight to the map, because
   *  ANY saved intake was silently resumed regardless of intent. */
  resume: boolean;
  /** True only via AreaClient's "Everything in {region} on the map" link
   *  (10 Aug 2026) - a one-time signal to seed every InterestCategoryId
   *  active (see ALL_INTEREST_CATEGORIES below) instead of the usual
   *  Distilleries-only default, so that entry point's map opens with
   *  every layer already switched on rather than needing the visitor to
   *  toggle each one by hand. */
  showAll: boolean;
  /** True only via HeroTodayColumn's "View on the interactive map" link
   *  (11 Aug 2026, Mark's request) - see the matching comment on
   *  WorkspaceWithFeatures' own skipWalkthrough prop below for why this
   *  exists as its own flag rather than being tied to timing==="today". */
  skipWalkthrough: boolean;
}

type Step = "location" | "today-location" | "interests" | "workspace";

/** Every InterestCategoryId, derived from the single source of truth
 *  (INTEREST_CATEGORIES in journey-options.ts) rather than hand-listed
 *  here, so a category added there is automatically included - used only
 *  by the showAll entry point (see JourneyFlowProps.showAll) to force
 *  every map layer active instead of the usual Distilleries-only default. */
const ALL_INTEREST_CATEGORIES: InterestCategoryId[] = INTEREST_CATEGORIES.map((c) => c.id);

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
  hubDaysPromise: Promise<HubDay[]>;
  areasPromise: Promise<Area[]>;
  featuredStaysPromise: Promise<FeaturedStay[]>;
  location: LocationAnswer;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
  todayNotice?: string;
  resume: boolean;
  skipWalkthrough?: boolean;
}) {
  const distilleries = use(props.distilleriesPromise);
  const localFeatures = use(props.localFeaturesPromise);
  const localEvents = use(props.localEventsPromise);
  const hubDays = use(props.hubDaysPromise);
  const areas = use(props.areasPromise);
  const featuredStays = use(props.featuredStaysPromise);
  return (
    <Workspace
      distilleries={distilleries}
      localFeatures={localFeatures}
      localEvents={localEvents}
      hubDays={hubDays}
      areas={areas}
      featuredStays={featuredStays}
      location={props.location}
      initialInterests={props.initialInterests}
      timing={props.timing}
      todayNotice={props.todayNotice}
      resume={props.resume}
      skipWalkthrough={props.skipWalkthrough}
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
 * A fresh "planning"/"dreaming" visit now opens the workspace genuinely
 * blank rather than seeded with demo content (11 Aug 2026, Mark's call -
 * removed the old "Three Legends, One Road" default Day). Every other
 * design decision on the site by this point leads with real Days - the
 * hero, the Days Hub, Area pages - and the map is only ever reached
 * after picking one of those, or here on a fresh visit; there's no
 * longer a case where a visitor needs a pre-built example to orient on.
 * The pre-seed was also the root cause of a real data-loss bug (revisiting
 * /journey without resume=1 would silently wipe a visitor's actual trip
 * and reseed the demo) - removing it fixes that too, rather than just
 * patching the reset condition. Workspace.tsx's own initDays(3) fallback
 * (pre-existing, previously dead code) now does the job of giving a fresh
 * visit some real blank days to work with.
 *
 * "today" keeps its own considered default (added 21 July 2026, see
 * seedTodayDay below) - it asks one lightweight extra question
 * (TodayLocationStep: "which distillery are you nearest to right now?")
 * and combines that with the device's current time to seed something
 * real and specific to that visitor, so it's unaffected by the
 * planning/dreaming demo-seed removal above.
 */

/** 4pm, agreed with Mark 21 July 2026 - conservative on purpose. Tours
 *  aren't tracked with real start/end times in Airtable yet (Distillery.hours
 *  is a freeform display string, not structured slots), so this can't know
 *  whether a specific tour is actually still bookable - it only knows
 *  roughly how much of the day is realistically left. Better to undersell
 *  (send someone to a viewpoint who could maybe have squeezed in one more
 *  tour) than oversell (seed a distillery whose last tour has already gone). */
const EVENING_CUTOFF_HOUR = 16;

/** Seeds today's single Day once TodayLocationStep answers "where" and the
 *  device clock supplies "when" - the only remaining seeding path in this
 *  file (planning/dreaming's old fixed demo Day was removed 11 Aug 2026).
 *
 * Deliberately does NOT set a specific tour (setTourForStop) or a
 * clock-time note - those would be inventing precision the underlying
 * data can't back up. This seed is generated fresh from whichever
 * distillery/feature is nearest, so notes stay honest about what's
 * actually known: which stop is nearest, and roughly how far the next
 * one is.
 *
 * Also deliberately does NOT set an accommodation default - inventing a
 * place someone's staying tonight isn't ours to assume. Past the evening
 * cutoff, the seeded stop's own note nudges toward the real "Where are
 * you staying?" control instead.
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
    // TODAY_EXCLUDED_DISTILLERY_SLUGS (Jura) also excluded here - a
    // ferry-only second stop is exactly as misleading as offering it as
    // the starting point, and estimatedDriveMinutes has no idea a ferry
    // is involved either way.
    const others = distilleries
      .filter((d) => d.slug !== start.slug && !TODAY_EXCLUDED_DISTILLERY_SLUGS.includes(d.slug))
      .map((d) => ({ d, minutes: estimatedDriveMinutes(start, d) }))
      .sort((a, b) => a.minutes - b.minutes);

    // Based on how many second-stop slots actually got filled, not just
    // stopBudget itself - a near-empty distilleries list (shouldn't happen
    // with 11 real records, but keeps this honest either way) would
    // otherwise still claim "we've added a second" when nothing was added.
    const secondStopCount = Math.min(stopBudget - 1, others.length);
    for (let i = 0; i < secondStopCount; i++) {
      const { d, minutes } = others[i];
      trip.addStop(0, d);
      trip.setStopNote(0, d.slug, `About ${formatDuration(minutes)} on from your first stop.`);
    }

    // Per Mark's 21 July feedback: explain why one vs two stops were
    // chosen, and point toward the other category tabs even though only
    // Distilleries is pre-seeded for this path.
    const daytimeNotice =
      secondStopCount > 0
        ? "There's a lot of today ahead, so we've added a second distillery near your first stop.\n\nFancy something different instead? Local attractions, natural features and places to eat are all worth a browse in the menu above."
        : "There's still time for a distillery visit today, but not quite enough for a second, so we've kept it to the one nearest you.\n\nLooking for some non-whisky experiences this afternoon too? Local attractions, natural features and places to eat are all in the menu above.";
    return { interests: ["distilleries"], notice: daytimeNotice };
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

export default function JourneyFlow({ timing, distilleriesPromise, localFeaturesPromise, localEventsPromise, journalPostsPromise, hubDaysPromise, areasPromise, featuredStaysPromise, resume, showAll, skipWalkthrough }: JourneyFlowProps) {
  const router = useRouter();
  const trip = useTrip();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [interests, setInterests] = useState<InterestCategoryId[]>([]);
  const [handledInitialState, setHandledInitialState] = useState(false);
  // Only ever set by TodayLocationStep's onNext, past the evening cutoff -
  // see seedTodayDay. Undefined for every other path/timing.
  const [todayNotice, setTodayNotice] = useState<string | undefined>(undefined);

  // Runs once trip.ready flips true (localStorage hydration completes).
  // Rewritten 11 Aug 2026 (Mark's call) to key off whether real content
  // actually exists, rather than the resume=1 query param - the old
  // resume-gated version would silently call trip.resetTrip() and wipe a
  // visitor's real trip (with a fresh reseed of the old demo Day)
  // whenever /journey was revisited without resume=1, which happens from
  // several sitewide entry points. Checking real content directly fixes
  // that regardless of how the visitor arrived:
  // - a saved intake exists, or a day has real stops/came from a Hub Day
  //   -> jump straight to the workspace with sensible answers (covers
  //   both "Back to your journey" and a trip started via a distillery
  //   page's "+ Add to Journey" button, which never sets intake)
  // - otherwise a genuinely fresh visit -> nothing to protect, so skip
  //   Q2/Q3 and go to "today"'s extra question or straight to a blank
  //   workspace, exactly as before
  useEffect(() => {
    if (!trip.ready || handledInitialState) return;
    const hasRealContent = trip.intake || trip.days.some((d) => d.stops.length > 0 || !!d.sourceHubDaySlug);
    if (hasRealContent) {
      if (trip.intake) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocation(trip.intake.location);
        setInterests(showAll ? ALL_INTEREST_CATEGORIES : trip.intake.interests);
      } else {
        setLocation({ kind: "region", region: "islay" });
        setInterests(showAll ? ALL_INTEREST_CATEGORIES : ["distilleries"]);
      }
      setStep("workspace");
      setHandledInitialState(true);
      return;
    }

    // Genuinely fresh visit - nothing real to protect.
    const freshLocation: LocationAnswer = { kind: "region", region: "islay" };
    const freshInterests: InterestCategoryId[] = showAll ? ALL_INTEREST_CATEGORIES : ["distilleries"];
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

    // planning/dreaming: open the workspace genuinely blank. No demo Day
    // seeded here any more (removed 11 Aug 2026) - Workspace.tsx's own
    // initDays(DEFAULT_STARTING_DAYS) effect creates real blank days from
    // here, so this doesn't even need to await distilleriesPromise/
    // localFeaturesPromise first.
    trip.completeIntake({ timing, location: freshLocation, interests: freshInterests });
    setStep("workspace");
    setHandledInitialState(true);
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
              ? seedTodayDay(trip, new Date().getHours(), start, distilleries, localFeatures)
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
        hubDaysPromise={hubDaysPromise}
        areasPromise={areasPromise}
        featuredStaysPromise={featuredStaysPromise}
        location={location!}
        initialInterests={interests}
        timing={trip.intake?.timing ?? timing}
        todayNotice={todayNotice}
        resume={resume}
        skipWalkthrough={skipWalkthrough}
      />
    </Suspense>
  );
}
