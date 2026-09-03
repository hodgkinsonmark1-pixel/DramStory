"use client";

import type { Timeframe } from "@/lib/trip-context";
import { useState } from "react";
import { AREAS } from "@/lib/areas";
import { locateNearestArea } from "@/lib/nearest-area";
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
  return <TodayNearSheet todayNear={todayNear} onClose={onClose} onSelectTodayNear={onSelectTodayNear} />;
}

/**
 * "Where on Islay are you?" - split into its own component 03 Sep 2026
 * because it now holds state (the geolocation attempt) and the parent is
 * a pure switch over openSheet.
 *
 * THE LOCATION OPTION IS NEW HERE, and this is the fix Mark asked for:
 * desktop had "Use my location instead" under the today note, inside the
 * state-two reflow, which is gated on !isMobileViewport - so a phone,
 * the device someone is actually holding while standing on Islay, had no
 * location control anywhere. This sheet is the ONLY way todayNear is
 * ever set (HeroTodayColumn has no in-place village control, and /today
 * links back here), so putting it here reaches both platforms at once.
 *
 * Same contract as every other geolocation call on this site: a
 * convenience ABOVE the list, never a replacement for it, and every
 * failure falls back to the list rather than to an error screen.
 */
function TodayNearSheet({
  todayNear,
  onClose,
  onSelectTodayNear,
}: {
  todayNear: string;
  onClose: () => void;
  onSelectTodayNear: (todayNear: string) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  function useMyLocation() {
    setLocating(true);
    setLocateError(null);
    locateNearestArea(
      (slug) => {
        setLocating(false);
        onSelectTodayNear(slug);
      },
      (reason) => {
        setLocating(false);
        setLocateError(
          reason === "unsupported"
            ? "Location isn't available in this browser — pick from the list instead."
            : "Couldn't get your location — pick from the list instead."
        );
      }
    );
  }

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

        <button type="button" className="answers-locate-row" onClick={useMyLocation} disabled={locating}>
          <span className="answers-locate-name">{locating ? "Finding you…" : "📍 Use my location"}</span>
          <span className="answers-locate-note">We&rsquo;ll pick the nearest village.</span>
        </button>
        {locateError && <p className="answers-locate-error">{locateError}</p>}

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
