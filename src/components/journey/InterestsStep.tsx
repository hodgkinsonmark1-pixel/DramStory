"use client";

import { useState } from "react";
import type { InterestCategoryId } from "@/lib/types";
import { INTEREST_CATEGORIES } from "@/lib/journey-options";

interface InterestsStepProps {
  onNext: (interests: InterestCategoryId[]) => void;
  onBack: () => void;
}

/**
 * Q3 — "What matters most to your trip?"
 * Distilleries is always-on (the anchor of the whole site, not a real
 * choice). The other 5 cards are multi-select — real trips combine
 * interests rather than picking just one — and double later as the map's
 * top-bar layer filters, so the subcategory summary shown here is the same
 * list that becomes expandable chips in the workspace.
 */
export default function InterestsStep({ onNext, onBack }: InterestsStepProps) {
  const [selected, setSelected] = useState<Set<InterestCategoryId>>(
    new Set(INTEREST_CATEGORIES.filter((c) => c.alwaysOn).map((c) => c.id))
  );

  function toggle(id: InterestCategoryId, alwaysOn?: boolean) {
    if (alwaysOn) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="journey-screen">
      <div className="journey-header">
        <div className="journey-eyebrow">Step 3 of 3</div>
        <h1 className="journey-title">
          What matters most to <em>your</em> trip?
        </h1>
      </div>

      <div className="progress-dots">
        <div className="dot done" />
        <div className="dot done" />
        <div className="dot active" />
      </div>

      <div className="q-cards">
        {INTEREST_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={"q-card interest-card" + (selected.has(c.id) ? " selected" : "")}
            onClick={() => toggle(c.id, c.alwaysOn)}
            style={c.alwaysOn ? { cursor: "default" } : undefined}
          >
            <span className="card-icon">{c.icon}</span>
            <span className="card-label">
              {c.label}
              {c.alwaysOn && <span style={{ color: "var(--slate)", fontWeight: 400 }}> &middot; always on</span>}
            </span>
            {c.subcategories.length > 0 && (
              <span className="interest-card-summary">{c.subcategories.join(" · ")}</span>
            )}
          </button>
        ))}
      </div>

      <button className="journey-next-btn" onClick={() => onNext(Array.from(selected))}>
        See my map
      </button>
      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
