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
          sentence into one hero sentence. Phase 2 adds the planning
          timeframe's state-two reflow - the hero needs `days` itself now
          (not just distilleries) to rank/highlight its own compact days
          column, same getDays() the /days page already uses. */}
      <Hero days={days} distilleries={distilleries} />
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
