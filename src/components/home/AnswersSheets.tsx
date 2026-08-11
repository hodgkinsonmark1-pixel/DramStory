"use client";

import type { Distillery } from "@/lib/types";
import { BASE_SHEET_STAYS, BASE_SHEET_AREAS, FEATURED_STAY_NOTES, AREA_NOTES } from "@/lib/trip-answers";

const NIGHTS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export type AnswersSheetName = "base" | "nights" | "picks" | null;

/**
 * The three TripAnswers sheets (base / nights / picks) - shared between
 * the homepage hero's sentence control (Hero.tsx) and the /days answers
 * bar's "Change" control (DaysAnswersBar.tsx) so both edit the same
 * answer the same way instead of two hand-rolled copies drifting apart.
 * Reuses the existing .tour-picker-backdrop/.tour-picker-modal pattern
 * (journey-extra.css) - see Hero.tsx's own header comment for why.
 */
export function AnswersSheets({
  openSheet,
  onClose,
  base,
  baseKind,
  nights,
  picks,
  distilleries,
  onSelectBase,
  onSelectNights,
  onTogglePick,
}: {
  openSheet: AnswersSheetName;
  onClose: () => void;
  base: string;
  baseKind: "hotel" | "area";
  nights: number;
  picks: string[];
  distilleries: Distillery[];
  onSelectBase: (base: string, baseKind: "hotel" | "area") => void;
  onSelectNights: (n: number) => void;
  onTogglePick: (slug: string) => void;
}) {
  if (!openSheet) return null;

  if (openSheet === "base") {
    return (
      <div className="tour-picker-backdrop" onClick={onClose}>
        <div
          className="tour-picker-modal"
          role="dialog"
          aria-label="Choose where you're staying"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="tour-picker-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
          <div className="tour-picker-heading">Where are you staying?</div>
          <div className="answers-kicker">Featured places to stay</div>
          {BASE_SHEET_STAYS.map((stay) => {
            const selected = baseKind === "hotel" && base === stay.slug;
            return (
              <button
                key={stay.slug}
                type="button"
                className="answers-base-row"
                onClick={() => onSelectBase(stay.slug, "hotel")}
              >
                <span className={"answers-base-row-name" + (selected ? " selected" : "")}>
                  {stay.name}
                  {selected ? " ✓" : ""}
                </span>
                <span className="answers-base-row-note">{FEATURED_STAY_NOTES[stay.slug]}</span>
              </button>
            );
          })}
          <div className="answers-kicker">Or just an area</div>
          {BASE_SHEET_AREAS.map((area) => {
            const selected = baseKind === "area" && base === area.slug;
            return (
              <button
                key={area.slug}
                type="button"
                className="answers-base-row"
                onClick={() => onSelectBase(area.slug, "area")}
              >
                <span className={"answers-base-row-name" + (selected ? " selected" : "")}>
                  {area.name}
                  {selected ? " ✓" : ""}
                </span>
                <span className="answers-base-row-note">{AREA_NOTES[area.slug]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (openSheet === "nights") {
    return (
      <div className="tour-picker-backdrop" onClick={onClose}>
        <div
          className="tour-picker-modal"
          role="dialog"
          aria-label="How many days"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="tour-picker-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
          <div className="tour-picker-heading">How many days?</div>
          <div className="answers-chip-row">
            {NIGHTS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={"answers-chip" + (nights === n ? " selected" : "")}
                onClick={() => onSelectNights(n)}
              >
                {n} {n === 1 ? "day" : "days"}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // openSheet === "picks"
  return (
    <div className="tour-picker-backdrop" onClick={onClose}>
      <div
        className="tour-picker-modal"
        role="dialog"
        aria-label="Distilleries you'd like to see"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tour-picker-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <div className="tour-picker-heading">Distilleries you&apos;d like to see</div>
        <div className="answers-sheet-hint">This reorders the list — it never hides a day.</div>
        <div className="answers-chip-row">
          {distilleries.map((d) => {
            const selected = picks.includes(d.slug);
            return (
              <button
                key={d.slug}
                type="button"
                className={"answers-chip" + (selected ? " selected" : "")}
                onClick={() => onTogglePick(d.slug)}
              >
                {d.name}
                {selected ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="hero-action-btn hero-action-primary answers-sheet-done"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}
