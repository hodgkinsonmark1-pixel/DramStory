import { getDays, getVisitableDistilleries, getJourneys, getLocalEvents, getLocalFeatures, getJournalPosts } from "@/lib/data";
import type { TripTiming } from "@/lib/types";
import JourneyFlow from "@/components/journey/JourneyFlow";

function parseTiming(mode: string | string[] | undefined): TripTiming {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === "today" || value === "planning" || value === "dreaming") return value;
  return "dreaming";
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; resume?: string; showAll?: string; walkthrough?: string }>;
}) {
  const { mode, resume, showAll, walkthrough } = await searchParams;
  // Deliberately NOT awaited, same reasoning as Local Features/Events
  // below: Q2's primary region cards don't touch distillery data at all -
  // only the secondary "a specific distillery" dropdown does. Blocking
  // the whole page (including Q2's first paint) on this Airtable
  // round-trip was adding real, needless lag to every Q1->Q2 navigation.
  // Visitable only: this array is the planner's distillery picker AND
  // the map's distillery pins, both of which offer tours and an
  // Add-to-Journey. See getVisitableDistilleries.
  const distilleriesPromise = getVisitableDistilleries();
  // Deferred, same reasoning as the rest of this page's fetches - only
  // the workspace step's Phase 5 context bar (Workspace.tsx) needs Hub
  // Days at all, to detect a day's sourceHubDaySlug origin and offer
  // "Reset to the original"/"put it back" (docs/days-trip-flow-
  // handoff.md §3.5). Q1-Q3 never touch it.
  const hubDaysPromise = getDays();
  // Deliberately NOT awaited - neither Local Features nor Local Events is
  // needed until the final "workspace" step (Q2/Step3/Q4 don't touch
  // either), so blocking the whole page on these fetches was adding real,
  // needless lag to every single Q1->Q2 navigation. JourneyFlow resolves
  // both via Suspense + use() only once the visitor actually reaches the
  // workspace.
  const localFeaturesPromise = getLocalFeatures();
  const localEventsPromise = getLocalEvents();
  // Also deliberately not awaited, same reasoning - only needed now that
  // Q2/Q3 show the homepage's below-the-fold sections (including the
  // Journal preview) beneath their own question, per the July 2026 change.
  const journalPostsPromise = getJournalPosts();
  // Same deferral, same reason: only Q2/Q3's below-the-fold Classic
  // Journeys section needs it, and that section reads the Journeys table
  // itself as of 17 Aug 2026 rather than being derived from distilleries.
  const journeysPromise = getJourneys();

  return (
    <JourneyFlow
      timing={parseTiming(mode)}
      distilleriesPromise={distilleriesPromise}
      localFeaturesPromise={localFeaturesPromise}
      localEventsPromise={localEventsPromise}
      journalPostsPromise={journalPostsPromise}
      journeysPromise={journeysPromise}
      hubDaysPromise={hubDaysPromise}
      resume={resume === "1"}
      // Set only by AreaClient's "Everything in {region} on the map" link
      // (10 Aug 2026 fix) - a one-time signal to seed every interest
      // category active rather than JourneyFlow's usual Distilleries-only
      // default, so the map opens with all layers showing.
      showAll={showAll === "1"}
      // Set only by HeroTodayColumn's "View on the interactive map" link
      // (11 Aug 2026, Mark's request) - that link currently always lands
      // in the planning/dreaming branch of JourneyFlow's initial-state
      // effect (todayNear is a Hero-only answer, not a full TripIntake,
      // so it can't cleanly satisfy JourneyFlow's timing="today" path
      // without also fabricating a fake distillery-level location - not
      // worth doing for one link). The onboarding walkthrough's demo
      // content assumes that path though, so it's skipped here on its
      // own signal rather than piggybacking on timing.
      skipWalkthrough={walkthrough === "skip"}
    />
  );
}
