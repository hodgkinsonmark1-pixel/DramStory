import { getDistilleries, getLocalEvents, getLocalFeatures, getJournalPosts } from "@/lib/data";
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
  searchParams: Promise<{ mode?: string; resume?: string }>;
}) {
  const { mode, resume } = await searchParams;
  // Deliberately NOT awaited, same reasoning as Local Features/Events
  // below: Q2's primary region cards don't touch distillery data at all -
  // only the secondary "a specific distillery" dropdown does. Blocking
  // the whole page (including Q2's first paint) on this Airtable
  // round-trip was adding real, needless lag to every Q1->Q2 navigation.
  const distilleriesPromise = getDistilleries();
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

  return (
    <JourneyFlow
      timing={parseTiming(mode)}
      distilleriesPromise={distilleriesPromise}
      localFeaturesPromise={localFeaturesPromise}
      localEventsPromise={localEventsPromise}
      journalPostsPromise={journalPostsPromise}
      resume={resume === "1"}
    />
  );
}
