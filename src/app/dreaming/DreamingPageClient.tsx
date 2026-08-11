"use client";

import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import { dreamAreaDisplayName } from "@/lib/trip-answers";
import { HeroDreamingColumn } from "@/components/home/HeroDreamingColumn";
import { DREAM_AREAS } from "@/lib/dream-areas";
import type { Distillery, JournalPost } from "@/lib/types";

/**
 * Mobile's standalone "dreaming" destination (11 Aug 2026, Mark's
 * request during his first live mobile review). §8 of hero-handoff.md
 * has mobile navigate away rather than reveal in place, same as
 * planning already does via /days - but until today, dreaming and
 * today both silently fell back to /days too, which only ever reads
 * planning's own answers (base/nights/picks) and ignores dreamArea/
 * todayNear entirely. Mark's own words: "the logic would be the same
 * as desktop version, but it would need to open on a new page rather
 * than split page - essentially the same as the planning a trip
 * process." This page is that - it hosts the exact same
 * HeroDreamingColumn used in desktop's split-screen reveal (same chip
 * row, same area card, same "build it on the map" link - including its
 * own in-place area-switching, so a visitor can change their mind here
 * without going back to the homepage), just as a full page instead of
 * a right-hand column.
 *
 * A thin client wrapper rather than folding this into page.tsx directly
 * - dreamArea only exists in trip context (localStorage-backed), which
 * a Server Component can't read.
 */
export default function DreamingPageClient({
  distilleries,
  journalPosts,
}: {
  distilleries: Distillery[];
  journalPosts: JournalPost[];
}) {
  const trip = useTrip();
  // Same fallback Hero.tsx itself uses (DREAM_AREAS[0].id, not
  // DEFAULT_TRIP_ANSWERS) - a deep link here with nothing chosen yet
  // still needs a sensible area rather than rendering blank.
  const dreamArea = trip.answers?.dreamArea ?? DREAM_AREAS[0].id;
  const dreamAreaName = dreamAreaDisplayName(dreamArea);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div className="days-answers-bar">
        <div className="days-answers-bar-text">
          <div className="days-answers-bar-kicker">Your answer</div>
          <div className="days-answers-bar-value">I&apos;m just dreaming, drawn to {dreamAreaName}</div>
        </div>
        {/* Links back to the homepage sentence control to change the
            timeframe itself (dreaming -> planning/today) - changing just
            the area doesn't need this, since the chip row below already
            does that in place. */}
        <Link href="/" className="days-answers-bar-change">
          Change
        </Link>
      </div>

      <HeroDreamingColumn dreamAreaId={dreamArea} distilleries={distilleries} journalPosts={journalPosts} />
    </div>
  );
}
