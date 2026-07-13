"use client";

import { use } from "react";
import type { Distillery, JournalPost, LocalEvent } from "@/lib/types";
import HowToBuildStory from "./HowToBuildStory";
import ClassicJourneys from "./ClassicJourneys";
import FeaturedContent from "./FeaturedContent";
import LatestJournal from "./LatestJournal";
import Footer from "@/components/Footer";

/**
 * The homepage's below-the-fold content (How it works, Classic Journeys,
 * Get to know [region], Journal, Footer) - reused as-is beneath Q2 and Q3
 * of the intake flow (July 2026) so those steps read as a continuation of
 * the homepage you scroll through, rather than separate, dead-ended pages.
 *
 * Deliberately takes promises + use() rather than plain resolved arrays:
 * LocationStep/InterestsStep need their own above-the-fold question to
 * paint immediately (that's the whole point of deferring these fetches -
 * see journey/page.tsx), so the caller wraps this in its own <Suspense>
 * and this streams in once the underlying Airtable fetches resolve,
 * rather than blocking Q2/Q3's initial render the way an eager await
 * would.
 */
export default function HomeSectionsBelowFold({
  distilleriesPromise,
  localEventsPromise,
  journalPostsPromise,
}: {
  distilleriesPromise: Promise<Distillery[]>;
  localEventsPromise: Promise<LocalEvent[]>;
  journalPostsPromise: Promise<JournalPost[]>;
}) {
  const distilleries = use(distilleriesPromise);
  const localEvents = use(localEventsPromise);
  const journalPosts = use(journalPostsPromise);

  return (
    <>
      <HowToBuildStory />
      <ClassicJourneys distilleries={distilleries} />
      <FeaturedContent distilleries={distilleries} localEvents={localEvents} />
      <LatestJournal posts={journalPosts} />
      <Footer />
    </>
  );
}
