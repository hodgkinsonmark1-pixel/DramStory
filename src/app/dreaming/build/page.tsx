import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import BuildTripPageClient from "./BuildTripPageClient";
import { getVisitableDistilleries, getLocalFeatures } from "@/lib/data";

/** Mobile's dedicated map+shortlist destination - see
 *  BuildTripPageClient's own header comment for the full story. Reached
 *  via /dreaming's "Create my trip" card. Same distilleries/localFeatures
 *  data the map needs, fetched fresh here the same way every other
 *  standalone page in this flow (/days, /dreaming, /today) fetches its
 *  own. */
export const dynamic = "force-dynamic";

export default async function BuildTripPage() {
  const [distilleries, localFeatures] = await Promise.all([getVisitableDistilleries(), getLocalFeatures()]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />
      <BuildTripPageClient distilleries={distilleries} localFeatures={localFeatures} />
      <Footer />
    </div>
  );
}
