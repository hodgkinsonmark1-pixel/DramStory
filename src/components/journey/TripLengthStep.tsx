"use client";

import { useState } from "react";
import type { TripLength } from "@/lib/types";
import { TRIP_LENGTHS } from "@/lib/journey-options";
import SiteHeader from "@/components/SiteHeader";
import BackgroundImage from "@/components/BackgroundImage";

interface TripLengthStepProps {
  onNext: (length: TripLength) => void;
  onBack: () => void;
}

/**
 * Step 3 of 4 — "How long will your adventure last?"
 * Matches the approved mockup exactly: eyebrow, title, subtitle, 4 pill
 * options, back link. The chosen length maps to a day count (see
 * TRIP_LENGTHS in journey-options.ts) for when the itinerary panel starts
 * pre-creating Day 1, Day 2, etc.
 */
export default function TripLengthStep({ onNext, onBack }: TripLengthStepProps) {
  const [selected, setSelected] = useState<TripLength | null>(null);

  function handleSelect(id: TripLength) {
    setSelected(id);
    onNext(id);
  }

  return (
    <div className="journey-screen">
      <BackgroundImage />
      <div className="hero-overlay" />
      <SiteHeader logoSize={40} />

      <div className="journey-header">
        <div className="journey-eyebrow">Building your journey &mdash; step 3 of 4</div>
        <h1 className="journey-title">How long will your adventure last?</h1>
        <p style={{ marginTop: 12, color: "rgba(255,255,255,0.85)", fontSize: 15 }}>
          We&rsquo;ll suggest the right number of distilleries
        </p>
      </div>

      <div className="progress-dots">
        <div className="dot done" />
        <div className="dot done" />
        <div className="dot active" />
        <div className="dot" />
      </div>

      <div className="q-cards">
        {TRIP_LENGTHS.map((t) => (
          <button
            key={t.id}
            className={"q-card" + (selected === t.id ? " selected" : "")}
            onClick={() => handleSelect(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
