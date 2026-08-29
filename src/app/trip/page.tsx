import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import TripReview from "@/components/journeys/TripReview";
import { getDays, getVisitableDistilleries } from "@/lib/data";

/**
 * TRIP REVIEW
 * ---------------------------------------------------------------
 * Days/Trip flow Phase 3 (docs/days-trip-flow-handoff.md §3.3). Reached
 * from DaysTripBar's "Review" button (src/components/journeys/
 * DaysTripBar.tsx), which previously pointed at /journey?resume=1 as a
 * temporary placeholder pending this page.
 *
 * Server component fetching getDays()/getVisitableDistilleries() - same
 * force-dynamic/Airtable-fresh pattern as /days (src/app/days/page.tsx)
 * - and handing both down to the client TripReview component. Trip
 * state itself lives in trip-context.tsx's localStorage-backed context,
 * so the actual review UI has to be a client component (see
 * TripReview.tsx's own header comment); this page's job is just
 * supplying the two datasets TripReview needs to enrich the visitor's
 * real trip days:
 *  - getDays(): lets a trip day that traces back to a Hub Day
 *    (sourceHubDaySlug) borrow that Day's authored pacing and detect
 *    whether it's since been edited (§4.5 "YOUR VERSION").
 *  - getVisitableDistilleries(): the real, current count of distilleries
 *    a visitor can actually walk into, for the
 *    "Distilleries visited" segments (§3.3 item 3) - read live rather
 *    than hardcoding 11, in case the roster ever changes.
 */
export const dynamic = "force-dynamic";

export default async function TripPage() {
  const [hubDays, distilleries] = await Promise.all([getDays(), getVisitableDistilleries()]);

  return (
    <>
      <PageHeader />
      <TripReview hubDays={hubDays} distilleries={distilleries} />
      <Footer />
    </>
  );
}
