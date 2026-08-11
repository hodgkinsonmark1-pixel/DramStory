"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "./SiteHeader";
import { useBackgroundVideoVisible } from "@/lib/background-video-context";
import { useTrip, DEFAULT_TRIP_ANSWERS, type Timeframe } from "@/lib/trip-context";
import {
  baseDisplayName,
  basePreposition,
  describePicks,
  dreamAreaDisplayName,
  villageDisplayName,
  findBaseAccommodation,
} from "@/lib/trip-answers";
import { AnswersSheets, type AnswersSheetName } from "@/components/home/AnswersSheets";
import { HeroSentenceSheets, type HeroSentenceSheetName } from "@/components/home/HeroSentenceSheets";
import { AREAS } from "@/lib/areas";
import { DREAM_AREAS } from "@/lib/dream-areas";
import type { Distillery } from "@/lib/types";

type SheetName = "timeframe" | "base" | "nights" | "picks" | "dreamArea" | "todayNear" | null;

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  planning: "I'm planning a trip",
  today: "I'm on Islay today",
  dreaming: "I'm just dreaming",
};

/**
 * The desktop homepage hero (docs/hero-handoff.md, Phase 1 of
 * docs/hero-handoff.md §9). Replaces the old two-question arrangement -
 * a "Where are you in your story?" timeframe picker here, plus a
 * separate "Plan your trip" sentence in AnswersBlock.tsx below it, both
 * landing on /days - with one sentence. The timeframe is now the
 * sentence's own first clause.
 *
 * Phase 1 is state one only: the sentence reads and writes
 * trip.answers (see trip-context.tsx's TripAnswers), pre-filled so
 * "Show me the days" is always safe to press without deciding anything,
 * and pressing it still navigates to /days exactly as the old two
 * components did - no in-place reflow yet. That's Phase 2.
 *
 * "today"/"dreaming" already have their own second clause (near a
 * village / drawn to an area) so the sentence reads correctly for all
 * three timeframes now, even though the column each would eventually
 * return (stops-with-times / reading) doesn't exist until Phases 3-4.
 */
export default function Hero({ distilleries }: { distilleries: Distillery[] }) {
  const router = useRouter();
  const trip = useTrip();
  // Claims the shared background video (see SiteBackgroundVideo) for as
  // long as the homepage Hero is mounted - the actual <video> element
  // lives once in the root layout, not here.
  useBackgroundVideoVisible(true);
  const [tagVis, setTagVis] = useState(false);
  const [chevVis, setChevVis] = useState(false);
  const [sentVis, setSentVis] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetName>(null);

  useEffect(() => {
    // Same timing as the arrangement this replaces: headline first, then
    // the sentence and button together at 0.8s rather than a slower
    // multi-second reveal - a visitor can start answering immediately.
    const t1 = setTimeout(() => setTagVis(true), 400);
    const t2 = setTimeout(() => setChevVis(true), 400);
    const t3 = setTimeout(() => {
      setSentVis(true);
      setChevVis(false);
    }, 800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  // Displayed answers fall back to DEFAULT_TRIP_ANSWERS whenever
  // trip.answers is null (first visit / never touched this block) -
  // "the answers are pre-filled" (§2.1), never a blank form.
  const timeframe = trip.answers?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe;
  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const picks = trip.answers?.picks ?? DEFAULT_TRIP_ANSWERS.picks;
  // dreamArea/todayNear are optional on TripAnswers itself (a visitor who
  // has never opened these clauses has no answer yet) - falling back
  // straight to each list's own first entry keeps this the same
  // "never blank" shape as base/nights/picks above, without a non-null
  // assertion on DEFAULT_TRIP_ANSWERS' matching (also-optional) fields.
  const dreamArea = trip.answers?.dreamArea ?? DREAM_AREAS[0].id;
  const todayNear = trip.answers?.todayNear ?? AREAS[0].slug;

  const baseName = baseDisplayName(base, baseKind);
  const picksLabel = describePicks(picks, distilleries);
  const dreamAreaName = dreamAreaDisplayName(dreamArea);
  const villageName = villageDisplayName(todayNear);

  const answersSheetOpen: AnswersSheetName =
    openSheet === "base" || openSheet === "nights" || openSheet === "picks" ? openSheet : null;
  const heroSheetOpen: HeroSentenceSheetName =
    openSheet === "timeframe" || openSheet === "dreamArea" || openSheet === "todayNear" ? openSheet : null;

  function selectTimeframe(next: Timeframe) {
    trip.setAnswersTimeframe(next);
    setOpenSheet(null);
  }

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

  function selectDreamArea(next: string) {
    trip.setAnswersDreamArea(next);
    setOpenSheet(null);
  }

  function selectTodayNear(next: string) {
    trip.setAnswersTodayNear(next);
    setOpenSheet(null);
  }

  return (
    <div className="hero">
      <div className="hero-overlay" />

      <SiteHeader transparent logoSize={48} />

      <div className="hero-content">
        <h1 className={"hero-tagline" + (tagVis ? " visible" : "")}>
          Where <em>whisky adventures</em>
          <br />
          begin
        </h1>
        <p className={"hero-standfirst" + (tagVis ? " visible" : "")}>
          Islay, planned by people who&apos;ve driven every one of these roads.
        </p>

        <div className={"hero-sentence-block" + (sentVis ? " visible" : "")}>
          <div className="hero-kicker">Plan your trip</div>
          <p className="hero-sentence">
            <button
              type="button"
              className="hero-sentence-clause"
              aria-haspopup="dialog"
              aria-expanded={openSheet === "timeframe"}
              aria-label={`Change where you are in your story: ${TIMEFRAME_LABEL[timeframe]}`}
              onClick={() => setOpenSheet("timeframe")}
            >
              {TIMEFRAME_LABEL[timeframe]}
            </button>

            {timeframe === "planning" && (
              <>
                {", staying "}
                <button
                  type="button"
                  className="hero-sentence-clause"
                  aria-haspopup="dialog"
                  aria-expanded={openSheet === "base"}
                  aria-label={`Change where you're staying: ${baseName}`}
                  onClick={() => setOpenSheet("base")}
                >
                  {basePreposition(baseKind)} {baseName}
                </button>
                {" for "}
                <button
                  type="button"
                  className="hero-sentence-clause"
                  aria-haspopup="dialog"
                  aria-expanded={openSheet === "nights"}
                  aria-label={`Change how many days: ${nights}`}
                  onClick={() => setOpenSheet("nights")}
                >
                  {nights} {nights === 1 ? "day" : "days"}
                </button>
                {", and I'd like to see "}
                <button
                  type="button"
                  className="hero-sentence-clause"
                  aria-haspopup="dialog"
                  aria-expanded={openSheet === "picks"}
                  aria-label={`Change which distilleries: ${picksLabel}`}
                  onClick={() => setOpenSheet("picks")}
                >
                  {picksLabel}
                </button>
                .
              </>
            )}

            {timeframe === "today" && (
              <>
                {", near "}
                <button
                  type="button"
                  className="hero-sentence-clause"
                  aria-haspopup="dialog"
                  aria-expanded={openSheet === "todayNear"}
                  aria-label={`Change where on Islay: ${villageName}`}
                  onClick={() => setOpenSheet("todayNear")}
                >
                  {villageName}
                </button>
                .
              </>
            )}

            {timeframe === "dreaming" && (
              <>
                {" about Islay, and I'm drawn to "}
                <button
                  type="button"
                  className="hero-sentence-clause"
                  aria-haspopup="dialog"
                  aria-expanded={openSheet === "dreamArea"}
                  aria-label={`Change what you're drawn to: ${dreamAreaName}`}
                  onClick={() => setOpenSheet("dreamArea")}
                >
                  {dreamAreaName}
                </button>
                .
              </>
            )}
          </p>

          <button
            type="button"
            className="hero-action-btn hero-action-primary hero-sentence-cta"
            onClick={() => router.push("/days")}
          >
            Show me the days
          </button>
        </div>
      </div>

      <div className={"scroll-hint" + (chevVis ? " visible" : " hidden")}>
        <div className="chevron-anim" />
      </div>

      <HeroSentenceSheets
        openSheet={heroSheetOpen}
        onClose={() => setOpenSheet(null)}
        timeframe={timeframe}
        dreamArea={dreamArea}
        todayNear={todayNear}
        onSelectTimeframe={selectTimeframe}
        onSelectDreamArea={selectDreamArea}
        onSelectTodayNear={selectTodayNear}
      />
      <AnswersSheets
        openSheet={answersSheetOpen}
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
    </div>
  );
}
