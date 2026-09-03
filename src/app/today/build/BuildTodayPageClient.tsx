"use client";

import Link from "next/link";
import { resolveTodayOrigin } from "@/lib/trip-answers";
import { useTrip } from "@/lib/trip-context";
import DreamingShortlistSection from "@/components/home/DreamingShortlistSection";
import type { Distillery, LocalFeature } from "@/lib/types";

/**
 * Mobile's dedicated map+shortlist page for the "today" timeframe (11 Aug
 * 2026) - same story and same reused components as /dreaming/build's
 * BuildTripPageClient, just centred on the village the visitor said
 * they're near today (todayNear) instead of a dream area. Reached via
 * HeroTodayColumn's "See what's nearby on the map" link, mobile only -
 * see that component's own isMobileViewport branch.
 *
 * Unlike dreaming (which has no dates and genuinely no plan yet), today
 * already has a live schedule on HeroTodayColumn itself - this page is
 * deliberately just the free-browse map+shortlist companion to that, not
 * a replacement for it. resolveTodayOrigin/AREAS are the same lookup
 * TodayPageClient and HeroTodayColumn already use for todayNear -> real
 * village name/coords, no new data needed.
 */
export default function BuildTodayPageClient({
  distilleries,
  localFeatures,
}: {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
}) {
  const trip = useTrip();
  /* Same resolution as the homepage and /today - so a dropped pin
     centres this map on the visitor rather than on a village up to ten
     miles away. */
  const todayOrigin = resolveTodayOrigin(trip.answers ?? {});
  const village = todayOrigin;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div className="days-answers-bar">
        <div className="days-answers-bar-text">
          <div className="days-answers-bar-kicker">{todayOrigin.kind === "town" ? "Near" : "Your location"}</div>
          <div className="days-answers-bar-value">{todayOrigin.label}</div>
        </div>
        <Link href="/today" className="days-answers-bar-change">
          Back
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 300,
          fontSize: "clamp(26px, 6vw, 34px)",
          color: "var(--dark)",
          margin: "20px 0 6px",
          letterSpacing: "-0.01em",
        }}
      >
        See what&apos;s <em style={{ fontStyle: "italic", color: "var(--amber)" }}>nearby</em>
      </h1>
      <p style={{ fontSize: 14, color: "var(--peat)", marginBottom: 18 }}>
        Tap a distillery or local spot to shortlist it, then add each one to a day when you&apos;re ready.
      </p>

      <DreamingShortlistSection distilleries={distilleries} localFeatures={localFeatures} center={village} />
    </div>
  );
}
