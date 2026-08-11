import Hero from "@/components/Hero";
import HowToBuildStory from "@/components/home/HowToBuildStory";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import FeaturedContent from "@/components/home/FeaturedContent";
import LatestJournal from "@/components/home/LatestJournal";
import Footer from "@/components/Footer";
import { getDistilleries, getLocalEvents, getJournalPosts, getDays } from "@/lib/data";

export default async function HomePage() {
  const [distilleries, localEvents, journalPosts, days] = await Promise.all([
    getDistilleries(),
    getLocalEvents(),
    getJournalPosts(),
    getDays(),
  ]);

  return (
    <>
      {/* Desktop hero (docs/hero-handoff.md). Phase 1 folded the old
          "Where are you in your story?" + separate "Plan your trip"
          sentence into one hero sentence. Phase 2 added planning's
          state-two reflow (needs `days`, same getDays() the /days page
          uses). Phase 3 adds dreaming's own reflow, which reuses this
          same `journalPosts` fetch (already awaited below for
          LatestJournal further down the page) rather than fetching it
          twice. */}
      <Hero days={days} distilleries={distilleries} journalPosts={journalPosts} />
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
