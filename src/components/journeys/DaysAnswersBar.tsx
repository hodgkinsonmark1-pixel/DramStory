"use client";

import { useState } from "react";
import type { Distillery } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { baseDisplayName, findBaseAccommodation } from "@/lib/trip-answers";
import { AnswersSheets, type AnswersSheetName } from "@/components/home/AnswersSheets";

/**
 * /days answers bar (days-trip-flow Phase 1, §3.2) - sticky dark bar on
 * top of the existing Pre-Designed Days Hub reading the current
 * TripAnswers: "The Machrie · 3 days · any distillery" + Change.
 *
 * "Deep links from search show defaults; never blank" (design doc) - so
 * this reads trip.answers with the same DEFAULT_TRIP_ANSWERS fallback
 * the homepage hero uses, rather than rendering nothing when a visitor lands
 * here without ever having touched the homepage block.
 *
 * "Change" opens a small menu (which of the three answers to edit), then
 * the same shared AnswersSheets the homepage block uses - the simplest
 * implementation that actually lets a visitor view/edit the answer here,
 * without pulling forward any of Phase 2's /days rebuild (ranking,
 * grouping, the trip bar, etc. - still out of scope for this phase).
 */
export default function DaysAnswersBar({ distilleries }: { distilleries: Distillery[] }) {
  const trip = useTrip();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSheet, setOpenSheet] = useState<AnswersSheetName>(null);

  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const picks = trip.answers?.picks ?? DEFAULT_TRIP_ANSWERS.picks;

  const baseName = baseDisplayName(base, baseKind);
  const picksLabel =
    picks.length === 0
      ? "any distillery"
      : `${picks.length} ${picks.length === 1 ? "distillery" : "distilleries"}`;

  function selectBase(nextBase: string, nextKind: "hotel" | "area") {
    const acc = findBaseAccommodation(nextBase, nextKind);
    if (!acc) return;
    trip.setAnswersBase(nextBase, nextKind, { name: acc.name, lat: acc.lat, lng: acc.lng });
    setOpenSheet(null);
  }

  function selectNights(n: number) {
    trip.setAnswersNights(n);
    setOpenSheet(null);
  }

  function togglePick(slug: string) {
    const next = picks.includes(slug) ? picks.filter((p) => p !== slug) : [...picks, slug];
    trip.setAnswersPicks(next);
  }

  return (
    <>
      <div className="days-answers-bar">
        <div className="days-answers-bar-text">
          <div className="days-answers-bar-kicker">Your answers</div>
          <div className="days-answers-bar-value">
            {baseName} · {nights} {nights === 1 ? "day" : "days"} · {picksLabel}
          </div>
        </div>
        <button
          type="button"
          className="days-answers-bar-change"
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
        >
          Change
        </button>
      </div>

      {menuOpen && (
        <div className="tour-picker-backdrop" onClick={() => setMenuOpen(false)}>
          <div
            className="tour-picker-modal"
            role="dialog"
            aria-label="Change your answers"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="tour-picker-close" onClick={() => setMenuOpen(false)} aria-label="Close">
              &times;
            </button>
            <div className="tour-picker-heading">Change your answers</div>
            <button
              type="button"
              className="days-answers-menu-row"
              onClick={() => {
                setMenuOpen(false);
                setOpenSheet("base");
              }}
            >
              Where you&apos;re staying — {baseName}
            </button>
            <button
              type="button"
              className="days-answers-menu-row"
              onClick={() => {
                setMenuOpen(false);
                setOpenSheet("nights");
              }}
            >
              How many days — {nights}
            </button>
            <button
              type="button"
              className="days-answers-menu-row"
              onClick={() => {
                setMenuOpen(false);
                setOpenSheet("picks");
              }}
            >
              Distilleries you&apos;d like to see — {picksLabel}
            </button>
          </div>
        </div>
      )}

      <AnswersSheets
        openSheet={openSheet}
        onClose={() => setOpenSheet(null)}
        base={base}
        baseKind={baseKind}
        nights={nights}
        picks={picks}
        distilleries={distilleries}
        onSelectBase={selectBase}
        onSelectNights={selectNights}
        onTogglePick={togglePick}
      />
    </>
  );
}
