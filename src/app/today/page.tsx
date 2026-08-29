import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import TodayPageClient from "./TodayPageClient";
import { getVisitableDistilleries, getLocalFeatures } from "@/lib/data";

/** Mobile's standalone "today" destination - see TodayPageClient's own
 *  header comment for the full story. Same data this timeframe already
 *  needs on desktop, fetched fresh here the same way /days/page.tsx
 *  fetches its own. Forced dynamic (not cached) since the whole point
 *  is a schedule computed off "right now". */
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [distilleries, localFeatures] = await Promise.all([getVisitableDistilleries(), getLocalFeatures()]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />
      <TodayPageClient distilleries={distilleries} localFeatures={localFeatures} />
      <Footer />
    </div>
  );
}
