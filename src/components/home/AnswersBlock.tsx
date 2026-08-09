"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Distillery } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { baseDisplayName, describePicks, findBaseAccommodation } from "@/lib/trip-answers";
import { AnswersSheets, type AnswersSheetName } from "@/components/home/AnswersSheets";

/**
 * Homepage question block (days-trip-flow Phase 1, §3.1) - "I'm staying
 * at {base} for {n} days, and I'd like to see {picks}." Dark section
 * directly under Hero, before How to Build Your Story (see page.tsx).
 * Pre-answered on arrival with DEFAULT_TRIP_ANSWERS (The Machrie, 3
 * days, any distillery) - nothing is gated, "Show me the days" always
 * works even if the visitor never opens a sheet.
 *
 * A client component (needs useTrip/interactivity) rendered directly
 * from the server page.tsx, same split as every other interactive
 * homepage section (ClassicJourneys, FeaturedContent, etc. - see
 * src/components/home/) - takes distilleries as a prop rather than
 * fetching them itself, since page.tsx already awaits getDistilleries().
 *
 * The actual base/nights/picks sheets live in AnswersSheets.tsx, shared
 * with the /days answers bar's "Change" control.
 */
export default function AnswersBlock({
  distilleries,
  hubDayCount,
}: {
  distilleries: Distillery[];
  /** Total live Pre-Designed Days (getDays().length) - only used to word
   *  the "you'll get {n} ready-made days either way" sub-line exactly as
   *  the copy deck has it, rather than a vaguer line with the actual
   *  number silently dropped. */
  hubDayCount: number;
}) {
  const trip = useTrip();
  const router = useRouter();
  const [openSheet, setOpenSheet] = useState<AnswersSheetName>(null);

  // Displayed answers fall back to DEFAULT_TRIP_ANSWERS whenever
  // trip.answers is null (first visit / never touched this block) -
  // "pre-answered on arrival", not blank.
  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const picks = trip.answers?.picks ?? DEFAULT_TRIP_ANSWERS.picks;

  const baseName = baseDisplayName(base, baseKind);
  const picksLabel = describePicks(picks, distilleries);

  function selectBase(nextBase: string, nextKind: "hotel" | "area") {
    const acc = findBaseAccommodation(nextBase, nextKind);
    if (!acc) return; // shouldn't happen for anything this sheet itself offers
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
    <section className="answers-section">
      <div className="answers-inner">
        <div className="answers-eyebrow">Plan your trip</div>
        <p className="answers-sentence">
          I&apos;m staying{" "}
          <button
            type="button"
            className="answers-pill"
            aria-haspopup="dialog"
            onClick={() => setOpenSheet("base")}
          >
            at {baseName} ▾
          </button>{" "}
          for{" "}
          <button
            type="button"
            className="answers-pill"
            aria-haspopup="dialog"
            onClick={() => setOpenSheet("nights")}
          >
            {nights} {nights === 1 ? "day" : "days"} ▾
          </button>
          , and I&apos;d like to see{" "}
          <button
            type="button"
            className="answers-pill"
            aria-haspopup="dialog"
            onClick={() => setOpenSheet("picks")}
          >
            {picksLabel} ▾
          </button>
          .
        </p>
        <p className="answers-sub">
          Answer as much or as little as you like — you&apos;ll get {hubDayCount} ready-made days
          either way, in the order that suits you.
        </p>
        <button
          type="button"
          className="hero-action-btn hero-action-primary"
          onClick={() => router.push("/days")}
        >
          Show me the days
        </button>
      </div>

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
    </section>
  );
}
