import Hero from "@/components/Hero";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import HomeDayPlans from "@/components/home/HomeDayPlans";
import HomeDistilleries from "@/components/home/HomeDistilleries";
import WhenToGo from "@/components/home/WhenToGo";
import WhereToStay from "@/components/home/WhereToStay";
import TripEssentials from "@/components/journey/TripEssentials";
import LatestJournal from "@/components/home/LatestJournal";
import Footer from "@/components/Footer";
import { getVisitableDistilleries, getLocalEvents, getJournalPosts, getDays, getJourneys, getLocalFeatures, getAreas, getFeaturedStays, getSeasons, getMonths } from "@/lib/data";

export default async function HomePage() {
  const [distilleries, localEvents, journalPosts, days, journeys, localFeatures, areas, featuredStays, seasons, months] = await Promise.all([
    // Visitable only - every distillery on this page (the hero's
    // "which distilleries" picks, the Discover cards) is presented as
    // somewhere to go. See getVisitableDistilleries.
    getVisitableDistilleries(),
    getLocalEvents(),
    getJournalPosts(),
    getDays(),
    // The Classic Journeys section reads the real Journeys table now
    // (17 Aug 2026) rather than a hardcoded array - same getJourneys()
    // call /journeys/[slug] renders from, React cache()-wrapped, so the
    // two can't disagree and this isn't a second Airtable round-trip.
    getJourneys(),
    getLocalFeatures(),
    getAreas(),
    getFeaturedStays(),
    getSeasons(),
    getMonths(),
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
      <ClassicJourneys journeys={journeys} />
      {/* Day plans sit directly under the journeys, per the owner's
          30 Aug 2026 layout: the whole-trip commitment first, the
          one-day-at-a-time alternative immediately after it. Reuses
          the `days` already fetched above for the hero - no second
          Airtable round-trip. */}
      <HomeDayPlans days={days} />
      {/* Where to stay sits directly under the day plans (30 Aug 2026,
          Mark's layout): the three planning steps - a whole journey, a
          single day, a bed - run together, and discovery comes after
          them rather than between them. It was previously below "Get to
          know Islay", which put a browse section in the middle of the
          decision. */}
      <WhereToStay areas={areas} featuredStays={featuredStays} />
      {/* The distilleries, after the bed - a visitor picks a shape of
          trip, then days, then somewhere to sleep, and only then browses
          what is actually on the island. FeaturedContent keeps the events
          half; its distillery half moved here on 30 Aug 2026. */}
      <HomeDistilleries distilleries={distilleries} journalPosts={journalPosts} />
      {/* When to go, below the distilleries. It takes the events over
          from FeaturedContent - the same list, but shown against the
          shape of the year rather than as a loose column. */}
      <WhenToGo seasons={seasons} months={months} localEvents={localEvents} journalPosts={journalPosts} />
      {/* FeaturedContent is no longer on the homepage (30 Aug 2026). Its
          distilleries became HomeDistilleries and its events became the
          What's on column of WhenToGo, so rendering it here would have
          put the same three events on the page twice. The component
          still exists and still renders on the two /journey steps via
          HomeSectionsBelowFold, which were not part of this brief. */}
      <TripEssentials />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
