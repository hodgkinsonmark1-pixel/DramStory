import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import DreamingPageClient from "./DreamingPageClient";
import { getDistilleries, getJournalPosts, getLocalFeatures } from "@/lib/data";

/** Mobile's standalone "dreaming" destination - see DreamingPageClient's
 *  own header comment for the full story. Same distilleries/journalPosts
 *  data this timeframe already needs on desktop (Hero.tsx passes the
 *  homepage's own straight through), fetched fresh here the same way
 *  /days/page.tsx fetches its own. localFeatures added 11 Aug 2026 for
 *  the mobile-only map+shortlist section (DreamingShortlistSection). */
export const dynamic = "force-dynamic";

export default async function DreamingPage() {
  const [distilleries, journalPosts, localFeatures] = await Promise.all([
    getDistilleries(),
    getJournalPosts(),
    getLocalFeatures(),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />
      <DreamingPageClient distilleries={distilleries} journalPosts={journalPosts} localFeatures={localFeatures} />
      <Footer />
    </div>
  );
}
