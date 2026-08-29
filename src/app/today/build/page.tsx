import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import BuildTodayPageClient from "./BuildTodayPageClient";
import { getVisitableDistilleries, getLocalFeatures } from "@/lib/data";

/** Mobile's dedicated map+shortlist destination for the "today" timeframe
 *  - see BuildTodayPageClient's own header comment for the full story.
 *  Same shape as /dreaming/build (11 Aug 2026), reached via
 *  HeroTodayColumn's "See what's nearby on the map" link on mobile.
 *  Same distilleries/localFeatures data fetched fresh here the same way
 *  every other standalone page in this flow does its own. */
export const dynamic = "force-dynamic";

export default async function BuildTodayPage() {
  const [distilleries, localFeatures] = await Promise.all([getVisitableDistilleries(), getLocalFeatures()]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />
      <BuildTodayPageClient distilleries={distilleries} localFeatures={localFeatures} />
      <Footer />
    </div>
  );
}
