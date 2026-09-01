import Hero from "@/components/Hero";
import ClassicJourneys from "@/components/home/ClassicJourneys";
import HomeDayPlans from "@/components/home/HomeDayPlans";
import FourMoods from "@/components/home/FourMoods";
import HomeDistilleries from "@/components/home/HomeDistilleries";
import WhenToGo from "@/components/home/WhenToGo";
import WhatsOn from "@/components/home/WhatsOn";
import WhereToStay from "@/components/home/WhereToStay";
import BeforeYouGo from "@/components/home/BeforeYouGo";
import Footer from "@/components/Footer";
import {
  getDistilleries,
  getVisitableDistilleries,
  getLocalEvents,
  getJournalPosts,
  getDays,
  getJourneys,
  getLocalFeatures,
  getAreas,
  getFeaturedStays,
  getSeasons,
  getMonths,
  getPracticalities,
  getCostLines,
} from "@/lib/data";

export default async function HomePage() {
  const [
    distilleries,
    allDistilleries,
    localEvents,
    journalPosts,
    days,
    journeys,
    localFeatures,
    areas,
    featuredStays,
    seasons,
    months,
    practicalities,
    costLines,
  ] = await Promise.all([
    // Visitable only - the hero's picks and the four moods present every
    // distillery as somewhere to go. See getVisitableDistilleries.
    getVisitableDistilleries(),
    // EVERY published record, for the distillery wall alone. Its eyebrow
    // says "thirteen in all", and Laggan Bay and Portintruan are exactly
    // the two the visitable filter removes. Both calls are React
    // cache()-wrapped over the same fetch, so this is not a second
    // Airtable round-trip.
    getDistilleries(),
    getLocalEvents(),
    getJournalPosts(),
    getDays(),
    getJourneys(),
    getLocalFeatures(),
    getAreas(),
    getFeaturedStays(),
    getSeasons(),
    getMonths(),
    getPracticalities(),
    getCostLines(),
  ]);

  return (
    <>
      {/* Desktop hero (docs/hero-handoff.md). Untouched by the 01 Sep
          2026 final design, which covers every section BELOW the hero -
          on mobile explicitly so, per Mark. */}
      <Hero days={days} distilleries={distilleries} journalPosts={journalPosts} localFeatures={localFeatures} />

      {/* SECTION ORDER is the final design's own (cover sheet, page 1):
          hero, classic tours, days, four moods, where to stay,
          distilleries, when to go, what's on, before you go, newsletter,
          footer. Two changes from what was live: What's on is its own
          section rather than a column of When to go, and the cost strip
          is no longer a section at all - it is the last block inside
          Before you go. The newsletter sits above the footer and lives
          in Footer.tsx, which is why neither appears here. */}
      <ClassicJourneys journeys={journeys} />
      <HomeDayPlans days={days} />
      {/* featuredStays is needed for the "your base marked" pin: the map
          reads the same trip answer Where to stay does, and has to
          resolve it to real coordinates. */}
      <FourMoods distilleries={distilleries} featuredStays={featuredStays} />
      <WhereToStay areas={areas} featuredStays={featuredStays} />
      <HomeDistilleries distilleries={allDistilleries} />
      <WhenToGo seasons={seasons} months={months} localEvents={localEvents} />
      <WhatsOn localEvents={localEvents} />
      <BeforeYouGo
        practicalities={practicalities}
        days={days}
        journalPosts={journalPosts}
        costLines={costLines}
        distilleries={distilleries}
        journeys={journeys}
      />
      <Footer />
    </>
  );
}
