import Hero from "@/components/Hero";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import FeaturedContent from "@/components/home/FeaturedContent";
import WhereToStay from "@/components/home/WhereToStay";
import TripEssentials from "@/components/journey/TripEssentials";
import LatestJournal from "@/components/home/LatestJournal";
import Footer from "@/components/Footer";
import { getDistilleries, getLocalEvents, getJournalPosts, getDays, getLocalFeatures, getAreas, getFeaturedStays } from "@/lib/data";

export default async function HomePage() {
  const [distilleries, localEvents, journalPosts, days, localFeatures, areas, featuredStays] = await Promise.all([
    getDistilleries(),
    getLocalEvents(),
    getJournalPosts(),
    getDays(),
    getLocalFeatures(),
    getAreas(),
    getFeaturedStays(),
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
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      {/* Moved here from the /journey workspace's own below-map section
          (11 Aug 2026, Mark's request) - that section is hidden now
          /journey is a secondary page post-pivot, so "Where to stay" and
          "Before you go" (TripEssentials) live on the homepage instead,
          right after "Get to know Islay" and before the Journal. */}
      <WhereToStay areas={areas} featuredStays={featuredStays} />
      <TripEssentials />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
