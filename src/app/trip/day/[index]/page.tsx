import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import DayScreen from "@/components/journeys/DayScreen";
import { getDays, getLocalFeatures } from "@/lib/data";

/**
 * A DAY (Days/Trip flow Phase 4, docs/days-trip-flow-handoff.md §3.4).
 * Reached from TripReview.tsx's day title link. `index` is the trip's
 * 0-based day index (matches trip.days[index] and the existing
 * currentDayIndex convention Phase 5's planner hand-off already uses) -
 * NOT an Airtable/HubDay identifier, since a trip day may have been built
 * freehand and never trace back to one at all.
 *
 * Server component fetching getDays()/getLocalFeatures() - same
 * force-dynamic/Airtable-fresh pattern as /trip (src/app/trip/page.tsx) -
 * and handing both down to the client DayScreen component (trip state
 * itself lives in trip-context.tsx's localStorage-backed context, so the
 * actual day UI has to be a client component, same reasoning as
 * TripReview.tsx). getDays() resolves this day's own sourceHubDaySlug
 * back to its narrative/pacing; getLocalFeatures() supplies the swap
 * sheet's nearest-non-distillery suggestions (§3.4 item 4 / §8 open
 * question 7).
 *
 * No generateStaticParams: unlike /distilleries/[slug] etc., `index`
 * isn't a stable Airtable-backed identifier to pre-render against - it's
 * purely positional within whatever trip happens to be in the visitor's
 * own localStorage. DayScreen itself handles an out-of-range index
 * gracefully (a "that day isn't there" state), same as any other
 * client-side lookup against trip.days.
 */
export const dynamic = "force-dynamic";

export default async function TripDayPage({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const { index } = await params;
  const dayIndex = Number(index);
  const [hubDays, localFeatures] = await Promise.all([getDays(), getLocalFeatures()]);

  return (
    <>
      <PageHeader />
      <DayScreen dayIndex={dayIndex} hubDays={hubDays} localFeatures={localFeatures} />
      <Footer />
    </>
  );
}
