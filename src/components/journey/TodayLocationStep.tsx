"use client";

import { Suspense, useState } from "react";
import type { Distillery } from "@/lib/types";
import { TODAY_EXCLUDED_DISTILLERY_SLUGS } from "@/lib/journey-options";
import SiteHeader from "@/components/SiteHeader";
import BackgroundImage from "@/components/BackgroundImage";
import { DistilleryPicker } from "./LocationStep";

interface TodayLocationStepProps {
  distilleriesPromise: Promise<Distillery[]>;
  onNext: (distillerySlug: string) => void;
  onBack: () => void;
}

/**
 * "Today" timing's own lightweight location question, added 21 July 2026.
 *
 * Not the full Q2 (LocationStep) - that asks "where does your story take
 * you" across regions/airport/a specific distillery, which is the wrong
 * question for someone who's already on Islay right now. This asks one
 * narrower thing - "which distillery are you nearest to right now" - so
 * JourneyFlow has a real starting point to rank the rest of today's
 * suggestions (nearby stops, or nearby Local Features once it's too late
 * for a fresh tour) against. See JourneyFlow's seedTodayDay for what this
 * feeds into.
 *
 * Deliberately no time question here - the current hour is read straight
 * off the device clock once this resolves, not asked, so "today" stays a
 * genuine one-question flow like planning/dreaming already are.
 *
 * "Use my location" is a convenience on top of the dropdown, not a
 * replacement for it - reverse-geocoding isn't needed, just a straight
 * haversine match against distillery coordinates (done back in
 * JourneyFlow, which already has the resolved distillery list). Any
 * failure here (denied permission, no support, timeout) just falls back
 * silently to the dropdown - it's never the only way to answer.
 */
export default function TodayLocationStep({ distilleriesPromise, onNext, onBack }: TodayLocationStepProps) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function handleUseMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location isn't available in this browser - no problem, just pick from the list below.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Plain await + array filter here, not React's use() - this runs
        // inside an event-handler callback, not during render, so there's
        // no restriction on filtering the resolved array directly (unlike
        // DistilleryPicker below, which filters via its own excludeSlugs
        // prop instead of a derived promise - see that component's
        // comment for why).
        const distilleries = (await distilleriesPromise).filter(
          (d) => !TODAY_EXCLUDED_DISTILLERY_SLUGS.includes(d.slug)
        );
        if (distilleries.length === 0) {
          setLocating(false);
          setLocationError("Couldn't match that to a distillery - pick from the list below instead.");
          return;
        }
        let nearest = distilleries[0];
        let nearestDistSq = Infinity;
        for (const d of distilleries) {
          // Simple squared-degree comparison, not a real distance - fine
          // here since it's only used to rank, never displayed or used
          // for drive-time math (that's estimatedDriveMinutes, used later
          // in JourneyFlow once a starting distillery is actually chosen).
          const distSq = (d.lat - latitude) ** 2 + (d.lng - longitude) ** 2;
          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = d;
          }
        }
        setLocating(false);
        onNext(nearest.slug);
      },
      () => {
        setLocating(false);
        setLocationError("Couldn't get your location - no problem, just pick from the list below.");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="journey-screen">
      <BackgroundImage />
      <div className="hero-overlay" />
      <SiteHeader transparent logoSize={48} />

      <div className="journey-header">
        <div className="journey-eyebrow">One quick thing</div>
        <h1 className="journey-title">
          Which distillery are you <em>nearest to</em> right now?
        </h1>
      </div>

      <div className="q-cards">
        <button className="q-card" onClick={handleUseMyLocation} disabled={locating}>
          {locating ? "Finding you…" : "📍 Use my location"}
        </button>

        {locationError && (
          <div className="location-notice">
            {locationError}
            <button className="location-notice-dismiss" onClick={() => setLocationError(null)} aria-label="Dismiss">
              &times;
            </button>
          </div>
        )}

        <Suspense fallback={<div className="q-card location-inline-input">Loading distilleries…</div>}>
          <DistilleryPicker
            distilleriesPromise={distilleriesPromise}
            excludeSlugs={TODAY_EXCLUDED_DISTILLERY_SLUGS}
            onNext={(answer) => {
              if (answer.kind === "distillery") onNext(answer.distillerySlug);
            }}
          />
        </Suspense>
      </div>

      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
