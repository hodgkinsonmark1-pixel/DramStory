import Hero from "@/components/Hero";
import AnswersBlock from "@/components/home/AnswersBlock";
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
      <Hero />
      {/* days-trip-flow Phase 1 (§3.1): the homepage question block -
          "I'm staying at X for N days, and I'd like to see Y" - directly
          under Hero, before How to Build Your Story. */}
      <AnswersBlock distilleries={distilleries} hubDayCount={days.length} />
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
