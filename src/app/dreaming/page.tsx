import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import DreamingPageClient from "./DreamingPageClient";
import { getDistilleries, getJournalPosts } from "@/lib/data";

/** Mobile's standalone "dreaming" destination - see DreamingPageClient's
 *  own header comment for the full story. Same distilleries/journalPosts
 *  data this timeframe already needs on desktop (Hero.tsx passes the
 *  homepage's own straight through), fetched fresh here the same way
 *  /days/page.tsx fetches its own. The map+shortlist experience lives on
 *  its own /dreaming/build page (11 Aug 2026, Mark's follow-up request -
 *  a "Create my trip" button here links out to it rather than embedding
 *  it inline), so this page doesn't need localFeatures itself. */
export const dynamic = "force-dynamic";

export default async function DreamingPage() {
  const [distilleries, journalPosts] = await Promise.all([getDistilleries(), getJournalPosts()]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />
      <DreamingPageClient distilleries={distilleries} journalPosts={journalPosts} />
      <Footer />
    </div>
  );
}
