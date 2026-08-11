"use client";

import type { Timeframe } from "@/lib/trip-context";
import { AREAS } from "@/lib/areas";
import { DREAM_AREAS } from "@/lib/dream-areas";

export type HeroSentenceSheetName = "timeframe" | "dreamArea" | "todayNear" | null;

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string; note: string }[] = [
  { value: "planning", label: "I'm planning a trip", note: "Base, days and picks - the full sentence." },
  { value: "today", label: "I'm on Islay today", note: "We read the clock and show you what fits." },
  { value: "dreaming", label: "I'm just dreaming", note: "No dates - just somewhere to start." },
];

/**
 * The hero sentence's clause-1 (timeframe), and the two clauses that only
 * exist for the "today"/"dreaming" branches (docs/hero-handoff.md §3.1,
 * §4.2, §4.3). Kept separate from AnswersSheets.tsx (base/nights/picks)
 * rather than folding in, since that component is also shared with
 * DaysAnswersBar.tsx on /days - which only ever needs the planning
 * clauses, so it should not have to know about timeframe/dreamArea/
 * todayNear at all.
 */
export function HeroSentenceSheets({
  openSheet,
  onClose,
  timeframe,
  dreamArea,
  todayNear,
  onSelectTimeframe,
  onSelectDreamArea,
  onSelectTodayNear,
}: {
  openSheet: HeroSentenceSheetName;
  onClose: () => void;
  timeframe: Timeframe;
  dreamArea: string;
  todayNear: string;
  onSelectTimeframe: (timeframe: Timeframe) => void;
  onSelectDreamArea: (dreamArea: string) => void;
  onSelectTodayNear: (todayNear: string) => void;
}) {
  if (!openSheet) return null;

  if (openSheet === "timeframe") {
    return (
      <div className="tour-picker-backdrop" onClick={onClose}>
        <div
          className="tour-picker-modal"
          role="dialog"
          aria-label="Where are you in your story?"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="tour-picker-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
          <div className="tour-picker-heading">Where are you in your story?</div>
          {TIMEFRAME_OPTIONS.map((opt) => {
            const selected = timeframe === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className="answers-base-row"
                onClick={() => onSelectTimeframe(opt.value)}
              >
                <span className={"answers-base-row-name" + (selected ? " selected" : "")}>
                  {opt.label}
                  {selected ? " ✓" : ""}
                </span>
                <span className="answers-base-row-note">{opt.note}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (openSheet === "dreamArea") {
    return (
      <div className="tour-picker-backdrop" onClick={onClose}>
        <div
          className="tour-picker-modal"
          role="dialog"
          aria-label="What are you drawn to?"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="tour-picker-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
          <div className="tour-picker-heading">What are you drawn to?</div>
          {DREAM_AREAS.map((area) => {
            const selected = dreamArea === area.id;
            return (
              <button
                key={area.id}
                type="button"
                className="answers-base-row"
                onClick={() => onSelectDreamArea(area.id)}
              >
                <span className={"answers-base-row-name" + (selected ? " selected" : "")}>
                  {area.name[0].toUpperCase() + area.name.slice(1)}
                  {selected ? " ✓" : ""}
                </span>
                <span className="answers-base-row-note">{area.distilleries.join(", ")}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // openSheet === "todayNear"
  return (
    <div className="tour-picker-backdrop" onClick={onClose}>
      <div
        className="tour-picker-modal"
        role="dialog"
        aria-label="Where on Islay are you?"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tour-picker-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <div className="tour-picker-heading">Where on Islay are you?</div>
        {AREAS.map((area) => {
          const selected = todayNear === area.slug;
          return (
            <button
              key={area.slug}
              type="button"
              className="answers-base-row"
              onClick={() => onSelectTodayNear(area.slug)}
            >
              <span className={"answers-base-row-name" + (selected ? " selected" : "")}>
                {area.name}
                {selected ? " ✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
