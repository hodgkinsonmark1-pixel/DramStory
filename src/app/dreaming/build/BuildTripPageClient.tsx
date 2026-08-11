"use client";

import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import { dreamAreaDisplayName } from "@/lib/trip-answers";
import { DREAM_AREAS } from "@/lib/dream-areas";
import DreamingShortlistSection from "@/components/home/DreamingShortlistSection";
import type { Distillery, LocalFeature } from "@/lib/types";

/**
 * Mobile's dedicated map+shortlist page (11 Aug 2026, Mark's follow-up
 * after seeing the map embedded inline on /dreaming: "it needs to be a
 * separate page ... can there be a 'create my trip' option, which then
 * opens with the map and the shortlists"). Reached via /dreaming's
 * "Create my trip" card rather than showing inline there - see
 * HeroDreamingColumn.tsx's mobile branch.
 *
 * Centres the map on whichever area the visitor picked on /dreaming
 * (DREAM_AREAS' own centroid, not the DREAM_AREA_BASE_SLUG Area lookup
 * HeroDreamingColumn's "Where you'd base yourself" card uses) - every
 * area has one, including "north-east" (which has no real /areas/[slug]
 * page to anchor to), so there's no fallback case to handle here.
 */
export default function BuildTripPageClient({
  distilleries,
  localFeatures,
}: {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
}) {
  const trip = useTrip();
  const dreamAreaId = trip.answers?.dreamArea ?? DREAM_AREAS[0].id;
  const area = DREAM_AREAS.find((a) => a.id === dreamAreaId) ?? DREAM_AREAS[0];
  const dreamAreaName = dreamAreaDisplayName(dreamAreaId);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div className="days-answers-bar">
        <div className="days-answers-bar-text">
          <div className="days-answers-bar-kicker">Building around</div>
          <div className="days-answers-bar-value">{dreamAreaName}</div>
        </div>
        <Link href="/dreaming" className="days-answers-bar-change">
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
        Create my <em style={{ fontStyle: "italic", color: "var(--amber)" }}>trip</em>
      </h1>
      <p style={{ fontSize: 14, color: "var(--peat)", marginBottom: 18 }}>
        Tap a distillery or local spot to shortlist it, then add each one to a day when you&apos;re ready.
      </p>

      <DreamingShortlistSection distilleries={distilleries} localFeatures={localFeatures} center={area} />
    </div>
  );
}
