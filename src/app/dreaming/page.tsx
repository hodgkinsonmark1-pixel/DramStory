import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import DreamingPageClient from "./DreamingPageClient";
import { getDistilleries, getJournalPosts } from "@/lib/data";

/** Mobile's standalone "dreaming" destination - see DreamingPageClient's
 *  own header comment for the full story. Same data this timeframe
 *  already needs on desktop (Hero.tsx passes the homepage's own
 *  distilleries/journalPosts straight through), fetched fresh here the
 *  same way /days/page.tsx fetches its own. */
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
