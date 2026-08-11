"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "./SiteHeader";
import { useBackgroundVideoVisible, useBackgroundVideoMask } from "@/lib/background-video-context";
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
import { HeroDaysColumn } from "@/components/home/HeroDaysColumn";
import { HeroDreamingColumn } from "@/components/home/HeroDreamingColumn";
import { AREAS } from "@/lib/areas";
import { DREAM_AREAS } from "@/lib/dream-areas";
import type { Distillery, HubDay, JournalPost } from "@/lib/types";

type SheetName = "timeframe" | "base" | "nights" | "picks" | "dreamArea" | "todayNear" | null;

const REFLOW_WIDTH_PX = 600;

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  planning: "I'm planning a trip",
  today: "I'm on Islay today",
  dreaming: "I'm just dreaming",
};

/**
 * The desktop homepage hero (docs/hero-handoff.md, §9's phase order).
 * Phase 1 replaced the old two-question arrangement with one sentence,
 * timeframe folded in as its first clause. Phase 2 added state two's
 * reflow for PLANNING (video narrows to the left 600px and keeps
 * playing, the sentence shrinks in place, the right half fills with a
 * ranked days column). Phase 3 (this update) adds DREAMING's own reflow
 * - the same mechanism, a different right-column component
 * (HeroDreamingColumn) showing a reading column anchored to one of the
 * four dream-areas.ts areas instead of a days list.
 *
 * "today" is still Phase 1's stand-in behaviour (navigate to /days) -
 * its own reflow (stops with arrival times) is Phase 4. If a visitor
 * reveals the reflow under either "planning" or "dreaming" and then
 * switches the timeframe clause to "today", it drops back to the poster
 * layout for as long as that clause reads "today" -
 * trip.heroRevealed (whether they've EVER revealed either reflow) stays
 * true underneath regardless, so switching back to "planning" or
 * "dreaming" re-shows that one's own column immediately, without the
 * button needing to be pressed again.
 */
export default function Hero({
  days,
  distilleries,
  journalPosts,
}: {
  days: HubDay[];
  distilleries: Distillery[];
  journalPosts: JournalPost[];
}) {
  const router = useRouter();
  const trip = useTrip();
  const [tagVis, setTagVis] = useState(false);
  const [chevVis, setChevVis] = useState(false);
  const [sentVis, setSentVis] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetName>(null);
  // Gates the §6 live-region announcement to only the visitor's own
  // button press this session - never the hydration-driven reveal a
  // returning visitor gets, which isn't a reflow they need told about.
  const [justRevealed, setJustRevealed] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const timeframe = trip.answers?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe;
  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const picks = trip.answers?.picks ?? DEFAULT_TRIP_ANSWERS.picks;
  const dreamArea = trip.answers?.dreamArea ?? DREAM_AREAS[0].id;
  const todayNear = trip.answers?.todayNear ?? AREAS[0].slug;

  // State two exists for planning and dreaming now (§9 Phases 2/3) -
  // "today" still falls through to Phase 1's navigate-to-/days behaviour
  // below. trip.ready gates this too, so a returning visitor's very
  // first client paint still renders the poster (matching the server)
  // rather than a hydration mismatch; the reveal effect applies the real
  // stored answer a moment later, same "ready" pattern trip-context uses
  // throughout.
  const showReflow =
    trip.ready && trip.heroRevealed && (timeframe === "planning" || timeframe === "dreaming");

  useBackgroundVideoVisible(true);
  useBackgroundVideoMask(showReflow ? REFLOW_WIDTH_PX : null);

  useEffect(() => {
    const t1 = setTimeout(() => setTagVis(true), 400);
    const t2 = setTimeout(() => setChevVis(true), 400);
    const t3 = setTimeout(() => {
      setSentVis(true);
      setChevVis(false);
    }, 800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!justRevealed) return;
    const t = setTimeout(() => setJustRevealed(false), 1200);
    return () => clearTimeout(t);
  }, [justRevealed]);

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

  function selectDreamArea(next: string) {
    trip.setAnswersDreamArea(next);
    setOpenSheet(null);
  }

  function selectTodayNear(next: string) {
    trip.setAnswersTodayNear(next);
    setOpenSheet(null);
  }

  function handleShowDays() {
    // "today" has no reflow yet (Phase 4) - falls back to Phase 1's
    // original behaviour. planning/dreaming both reveal in place now.
    if (timeframe === "today") {
      router.push("/days");
      return;
    }
    if (!trip.heroRevealed) setJustRevealed(true);
    trip.setHeroRevealed(true);
  }

  const handleAnnounce = useCallback((text: string) => setAnnouncement(text), []);

  return (
    <div className={"hero" + (showReflow ? " hero-answered" : "")}>
      <div className="hero-overlay" />

      <div className="hero-left">
        <SiteHeader transparent logoSize={48} showLinks={!showReflow} />

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
            <div className="hero-kicker">{showReflow ? "Your answers" : "Plan your trip"}</div>
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

            {showReflow ? (
              <p className="hero-sentence-note">
                {timeframe === "dreaming"
                  ? "No dates, no obligation — but a real place, so everything beside it is anchored somewhere and turns into a plan the moment you want one."
                  : `Change anything and the days re-order beside you. Nothing is ever hidden — ${days.length}, always.`}
              </p>
            ) : (
              <button
                type="button"
                className="hero-action-btn hero-action-primary hero-sentence-cta"
                onClick={handleShowDays}
              >
                Show me the days
              </button>
            )}
          </div>
        </div>

        <div className={"scroll-hint" + (chevVis && !showReflow ? " visible" : " hidden")}>
          <div className="chevron-anim" />
        </div>
      </div>

      {showReflow && (
        <div className="hero-right">
          <SiteHeader showLogo={false} panelStyle />
          {timeframe === "planning" ? (
            <HeroDaysColumn days={days} distilleries={distilleries} announce={justRevealed ? handleAnnounce : undefined} />
          ) : (
            <HeroDreamingColumn
              dreamAreaId={dreamArea}
              distilleries={distilleries}
              journalPosts={journalPosts}
              announce={justRevealed ? handleAnnounce : undefined}
            />
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
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
