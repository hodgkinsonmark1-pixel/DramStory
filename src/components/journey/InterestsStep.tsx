"use client";

import { Suspense, useState } from "react";
import type { Distillery, InterestCategoryId, JournalPost, LocalEvent } from "@/lib/types";
import { INTEREST_CATEGORIES } from "@/lib/journey-options";
import SiteHeader from "@/components/SiteHeader";
import BackgroundImage from "@/components/BackgroundImage";
import HomeSectionsBelowFold from "@/components/home/HomeSectionsBelowFold";

interface InterestsStepProps {
  /** For the below-the-fold "Get to know" and Classic Journeys sections. */
  distilleriesPromise: Promise<Distillery[]>;
  localEventsPromise: Promise<LocalEvent[]>;
  journalPostsPromise: Promise<JournalPost[]>;
  onNext: (interests: InterestCategoryId[]) => void;
  onBack: () => void;
}

// Distilleries is the anchor of the whole site and isn't a real choice, so
// it's not shown as a card here at all — it still exists in the shared
// config (as alwaysOn) for reuse as the first pill in the map's filter bar.
const SELECTABLE_CATEGORIES = INTEREST_CATEGORIES.filter((c) => !c.alwaysOn);

/**
 * Q3 (step 3 of 3) - "What matters most to your trip?"
 * The 5 real categories laid out side by side, multi-select - real trips
 * combine interests rather than picking just one.
 */
export default function InterestsStep({ distilleriesPromise, localEventsPromise, journalPostsPromise, onNext, onBack }: InterestsStepProps) {
  const [selected, setSelected] = useState<Set<InterestCategoryId>>(new Set());

  function toggle(id: InterestCategoryId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
    <div className="journey-screen">
      <BackgroundImage />
      <div className="hero-overlay" />
      <SiteHeader transparent logoSize={48} />

      <div className="journey-header">
        <div className="journey-eyebrow">Building your journey — step 3 of 3</div>
        <h1 className="journey-title">
          What matters most to <em>your</em> trip?
        </h1>
      </div>

      <div className="progress-dots">
        <div className="dot done" />
        <div className="dot done" />
        <div className="dot active" />
      </div>

      <div className="q-cards q-cards-row">
        {SELECTABLE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={"q-card interest-card" + (selected.has(c.id) ? " selected" : "")}
            onClick={() => toggle(c.id)}
          >
            <span className="card-icon">{c.icon}</span>
            <span className="card-label">{c.label}</span>
            <span className="interest-card-summary">{c.subcategories.join(" · ")}</span>
          </button>
        ))}
      </div>

      <button className="journey-next-btn" onClick={() => onNext(Array.from(selected))}>
        Start my story
      </button>
      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>

    {/* Below-the-fold homepage sections (July 2026) - see LocationStep
        for the full reasoning; same treatment here for Q3. */}
    <Suspense fallback={null}>
      <HomeSectionsBelowFold
        distilleriesPromise={distilleriesPromise}
        localEventsPromise={localEventsPromise}
        journalPostsPromise={journalPostsPromise}
      />
    </Suspense>
    </>
  );
}
