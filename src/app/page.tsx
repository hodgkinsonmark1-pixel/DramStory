import Hero from "@/components/Hero";
import HowToBuildStory from "@/components/home/HowToBuildStory";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import FeaturedContent from "@/components/home/FeaturedContent";
import LatestJournal from "@/components/home/LatestJournal";
import Footer from "@/components/Footer";
import { getDistilleries, getLocalEvents, getJournalPosts, getDays, getLocalFeatures } from "@/lib/data";

export default async function HomePage() {
  const [distilleries, localEvents, journalPosts, days, localFeatures] = await Promise.all([
    getDistilleries(),
    getLocalEvents(),
    getJournalPosts(),
    getDays(),
    getLocalFeatures(),
  ]);

  return (
    <>
      {/* Desktop hero (docs/hero-handoff.md). Phase 1 folded the old
          "Where are you in your story?" + separate "Plan your trip"
          sentence into one hero sentence. Phase 2 added planning's
          state-two reflow (needs `days`). Phase 3 added dreaming's
          (reuses `journalPosts`, already fetched below for
          LatestJournal). Phase 4 adds today's (needs `localFeatures` for
          its trailing free-stop slot - getLocalFeatures() is React
          cache()-wrapped, so this doesn't cost a second Airtable fetch;
          getDays() already calls it internally too). */}
      <Hero days={days} distilleries={distilleries} journalPosts={journalPosts} localFeatures={localFeatures} />
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
