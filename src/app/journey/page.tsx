import { getDistilleries, getLocalEvents, getLocalFeatures, getJournalPosts } from "@/lib/data";
import type { TripTiming } from "@/lib/types";
import JourneyFlow from "@/components/journey/JourneyFlow";

function parseTiming(mode: string | string[] | undefined): TripTiming {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === "today" || value === "planning" || value === "dreaming") return value;
  return "dreaming";
}

/** Temporary QA aid, added 21 July 2026 - lets Mark preview seedTodayDay's
 *  before/after-4pm branches on demand (e.g. ?mode=today&debugHour=13)
 *  without waiting for the device clock to actually reach that hour.
 *  Undefined (real device clock used) unless a valid 0-23 integer is
 *  passed. Remove once the "today" flow is merged to main and this kind
 *  of manual spot-check is no longer needed. */
function parseDebugHour(debugHour: string | string[] | undefined): number | undefined {
  const value = Array.isArray(debugHour) ? debugHour[0] : debugHour;
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) return undefined;
  return parsed;
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; resume?: string; debugHour?: string }>;
}) {
  const { mode, resume, debugHour } = await searchParams;
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
      debugHour={parseDebugHour(debugHour)}
    />
  );
}
