import Hero from "@/components/Hero";
import HowToBuildStory from "@/components/home/HowToBuildStory";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import FeaturedContent from "@/components/home/FeaturedContent";
import LatestJournal from "@/components/home/LatestJournal";
import Footer from "@/components/Footer";
import { getDistilleries, getLocalEvents, getJournalPosts } from "@/lib/data";

export default async function HomePage() {
  const [distilleries, localEvents, journalPosts] = await Promise.all([
    getDistilleries(),
    getLocalEvents(),
    getJournalPosts(),
  ]);

  return (
    <>
      {/* Desktop hero rebuild (docs/hero-handoff.md, Phase 1): the old
          "Where are you in your story?" timeframe picker + separate
          "Plan your trip" sentence block (AnswersBlock, now removed)
          both landed on /days - one door with two locks. The hero now
          asks it once, timeframe folded in as the sentence's first
          clause. */}
      <Hero distilleries={distilleries} />
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
