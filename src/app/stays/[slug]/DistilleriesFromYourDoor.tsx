"use client";

import Image from "next/image";
import Link from "next/link";
import type { Distillery } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";

function DistilleryDoorCard({ distillery: d, driveTimeMinutes }: { distillery: Distillery; driveTimeMinutes: number }) {
  const trip = useTrip();
  const stopDays = trip.ready ? trip.findStopDays(d.slug) : [];
  const inJourney = stopDays.length > 0;
  const safeCurrentDayIndex = Math.min(trip.currentDayIndex, Math.max(0, trip.days.length - 1));

  // Same toggle-add pattern as the distillery page's own "+ Add to
  // Journey" button (DistilleryPageClient.tsx) - added to whichever day
  // is currently open, removed from every day it's on if already added.
  function toggleAdd() {
    trip.initDays(1);
    if (inJourney) {
      for (const dayIndex of stopDays) trip.removeStop(dayIndex, d.slug);
    } else {
      trip.addStop(safeCurrentDayIndex, d);
    }
  }

  return (
    <div className="stay-door-card">
      <Link href={`/distilleries/${d.slug}`} className="stay-door-card-img-link">
        <div className="stay-door-card-img-wrap">
          {d.image ? (
            <Image src={d.image} alt={d.name} fill unoptimized style={{ objectFit: "cover" }} />
          ) : (
            <div className="stay-door-card-img-fallback" />
          )}
          <span className="stay-door-card-time">{driveTimeMinutes} min</span>
        </div>
      </Link>
      <div className="stay-door-card-body">
        <Link href={`/distilleries/${d.slug}`} className="stay-door-card-name">
          {d.name}
        </Link>
        {d.tagline && <div className="stay-door-card-tagline">{d.tagline}</div>}
        <div className="stay-door-card-foot">
          {d.priceFrom && <span className="stay-door-card-price">Tours from {d.priceFrom}</span>}
          <button type="button" className="stay-door-card-add" onClick={toggleAdd}>
            {inJourney ? "✓ Added" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "Distilleries from your door" - the four nearest distilleries by real
 * drive time (FeaturedStay.nearestDistilleries, sourced from the Stay
 * Distillery Distances junction table added 05 Aug 2026). Hotel-page-only
 * - shows a quiet "pending" state rather than nothing when no distances
 * have been entered yet for this hotel, same pattern used elsewhere on
 * this page for content that's still being sourced.
 */
export default function DistilleriesFromYourDoor({
  nearest,
}: {
  nearest: { distillery: Distillery; driveTimeMinutes: number }[];
}) {
  return (
    <div className="stay-door-section">
      <div className="stay-door-head">
        <div className="stay-door-title">Distilleries from your door</div>
        <Link href="/distilleries" className="stay-door-see-all">
          See all on the map &rarr;
        </Link>
      </div>
      {nearest.length > 0 ? (
        <div className="stay-door-grid">
          {nearest.map(({ distillery, driveTimeMinutes }) => (
            <DistilleryDoorCard key={distillery.slug} distillery={distillery} driveTimeMinutes={driveTimeMinutes} />
          ))}
        </div>
      ) : (
        <p className="stay-door-pending">Nearest-distillery drive times for this hotel are being added.</p>
      )}
    </div>
  );
}
