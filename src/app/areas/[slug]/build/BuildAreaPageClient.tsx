"use client";

import Link from "next/link";
import DreamingShortlistSection from "@/components/home/DreamingShortlistSection";
import type { Area, Distillery, LocalFeature } from "@/lib/types";

/**
 * Mobile's dedicated map+shortlist page for an Area's "Everything in
 * {region} on the map" link (11 Aug 2026) - same story and same reused
 * components as /dreaming/build and /today/build, just centred on this
 * Area's own coordinate rather than a dream area or today's village.
 * Reached via AreaClient.tsx's openRegionOnMap, mobile only - desktop
 * keeps the existing window.open("/journey?resume=1&showAll=1", ...)
 * behaviour untouched.
 *
 * Shows the full island's distilleries/local features (not just this
 * Area's own), same as the desktop version does - "everything on the
 * map" was always the whole dataset, just centred/zoomed here, not a
 * region-filtered subset. No day/accommodation is pre-seeded (unlike the
 * desktop flow) - shortlisted items get committed to a day from this
 * page itself, same pattern as the other two build pages.
 */
export default function BuildAreaPageClient({
  area,
  distilleries,
  localFeatures,
}: {
  area: Area;
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
}) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div className="days-answers-bar">
        <div className="days-answers-bar-text">
          <div className="days-answers-bar-kicker">Exploring</div>
          <div className="days-answers-bar-value">{area.name}</div>
        </div>
        <Link href={`/areas/${area.slug}`} className="days-answers-bar-change">
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
        Everything <em style={{ fontStyle: "italic", color: "var(--amber)" }}>nearby</em>
      </h1>
      <p style={{ fontSize: 14, color: "var(--peat)", marginBottom: 18 }}>
        Tap a distillery or local spot to shortlist it, then add each one to a day when you&apos;re ready.
      </p>

      <DreamingShortlistSection
        distilleries={distilleries}
        localFeatures={localFeatures}
        center={{ lat: area.lat, lng: area.lng }}
      />
    </div>
  );
}
