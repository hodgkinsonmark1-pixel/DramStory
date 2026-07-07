import { getDistilleries, getLocalEvents, getLocalFeatures } from "@/lib/data";
import type { TripTiming } from "@/lib/types";
import JourneyFlow from "@/components/journey/JourneyFlow";

function parseTiming(mode: string | string[] | undefined): TripTiming {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === "today" || value === "planning" || value === "inspiration") return value;
  return "inspiration";
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; resume?: string }>;
}) {
  const [{ mode, resume }, distilleries] = await Promise.all([searchParams, getDistilleries()]);
  // Deliberately NOT awaited - neither Local Features nor Local Events is
  // needed until the final "workspace" step (Q2/Step3/Q4 don't touch
  // either), so blocking the whole page on these fetches was adding real,
  // needless lag to every single Q1->Q2 navigation. JourneyFlow resolves
  // both via Suspense + use() only once the visitor actually reaches the
  // workspace.
  const localFeaturesPromise = getLocalFeatures();
  const localEventsPromise = getLocalEvents();

  return (
    <JourneyFlow
      timing={parseTiming(mode)}
      distilleries={distilleries}
      localFeaturesPromise={localFeaturesPromise}
      localEventsPromise={localEventsPromise}
      resume={resume === "1"}
    />
  );
}
