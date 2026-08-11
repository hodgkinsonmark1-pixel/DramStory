"use client";

import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import { villageDisplayName } from "@/lib/trip-answers";
import { HeroTodayColumn } from "@/components/home/HeroTodayColumn";
import { AREAS } from "@/lib/areas";
import type { Distillery, LocalFeature } from "@/lib/types";

/**
 * Mobile's standalone "today" destination - same story as
 * DreamingPageClient (see its own header comment). Hosts the exact same
 * HeroTodayColumn used in desktop's split-screen reveal (the live
 * clock-based schedule, "Before you drive" note, and the "View on the
 * interactive map" link - already fixed for zoom/walkthrough on 11 Aug
 * 2026), just as a full page instead of a right-hand column.
 *
 * Unlike dreaming's chip row, HeroTodayColumn has no in-place way to
 * change village (todayNear is only ever set via the homepage's own
 * sheet) - so "Change" here is the only way back to that control, not
 * just a courtesy link for changing the timeframe itself.
 */
export default function TodayPageClient({
  distilleries,
  localFeatures,
}: {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
}) {
  const trip = useTrip();
  const todayNear = trip.answers?.todayNear ?? AREAS[0].slug;
  const villageName = villageDisplayName(todayNear);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div className="days-answers-bar">
        <div className="days-answers-bar-text">
          <div className="days-answers-bar-kicker">Your answer</div>
          <div className="days-answers-bar-value">I&apos;m on Islay today, near {villageName}</div>
        </div>
        <Link href="/" className="days-answers-bar-change">
          Change
        </Link>
      </div>

      <HeroTodayColumn todayNear={todayNear} distilleries={distilleries} localFeatures={localFeatures} />
    </div>
  );
}
