"use client";

import { useCallback, useEffect, useState } from "react";
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
import { HeroTodayColumn } from "@/components/home/HeroTodayColumn";
import { buildTodaySchedule, formatClockTime } from "@/lib/today-schedule";
import { AREAS } from "@/lib/areas";
import { DREAM_AREAS } from "@/lib/dream-areas";
import type { Distillery, HubDay, JournalPost, LocalFeature } from "@/lib/types";

type SheetName = "timeframe" | "base" | "nights" | "picks" | "dreamArea" | "todayNear" | null;

const REFLOW_WIDTH_PX = 600;

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  planning: "I'm planning a trip",
  today: "I'm on Islay today",
  dreaming: "I'm just dreaming",
};

/**
 * The desktop homepage hero (docs/hero-handoff.md, §9's phase order,
 * now complete). Phase 1 replaced the old two-question arrangement with
 * one sentence, timeframe folded in as its first clause. Phase 2 added
 * state two's reflow for PLANNING (video narrows to the left 600px and
 * keeps playing, the sentence shrinks in place, the right half fills
 * with a ranked days column). Phase 3 added DREAMING's own reflow - same
 * mechanism, a reading column (HeroDreamingColumn) anchored to one of
 * dream-areas.ts's four areas instead. Phase 4 (this update) adds
 * TODAY's reflow - HeroTodayColumn, stops with arrival times computed
 * fresh off the device clock (today-schedule.ts) rather than answered.
 *
 * All three timeframes reveal in place now - "Show me the days" never
 * navigates away any more (handleShowDays always calls
 * trip.setHeroRevealed, full stop). Switching the timeframe clause
 * between them just swaps which right-column component shows, without
 * the button needing to be pressed again for each - trip.heroRevealed is
 * one shared "has this visitor ever revealed a reflow" flag, not one per
 * timeframe.
 */
export default function Hero({
  days,
  distilleries,
  journalPosts,
  localFeatures,
}: {
  days: HubDay[];
  distilleries: Distillery[];
  journalPosts: JournalPost[];
  localFeatures: LocalFeature[];
}) {
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

  // State two exists for all three timeframes now (§9 Phases 2-4).
  // trip.ready gates this, so a returning visitor's very first client
  // paint still renders the poster (matching the server) rather than a
  // hydration mismatch; the reveal effect applies the real stored answer
  // a moment later, same "ready" pattern trip-context uses throughout.
  const showReflow = trip.ready && trip.heroRevealed;

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
    if (!trip.heroRevealed) setJustRevealed(true);
    trip.setHeroRevealed(true);
  }

  const handleAnnounce = useCallback((text: string) => setAnnouncement(text), []);

  // Today's own clock, kept separate from HeroTodayColumn's (§4.2's
  // "computed, never stored" applies here too - day-derivations.ts's own
  // precedent is to recompute at each call site rather than pass one
  // shared value down, so the left column's note and the right column's
  // schedule are two small, independent computations off the same pure
  // buildTodaySchedule() rather than one lifted and threaded through
  // props). Only ticks while the today clause is actually showing.
  const [todayNow, setTodayNow] = useState<Date | null>(null);
  useEffect(() => {
    if (timeframe !== "today") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTodayNow(null);
      return;
    }
    setTodayNow(new Date());
    const id = setInterval(() => setTodayNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [timeframe]);
  const todaySchedule =
    todayNow != null
      ? buildTodaySchedule({
          now: todayNow,
          village: AREAS.find((a) => a.slug === todayNear) ?? AREAS[0],
          distilleries,
          localFeatures,
        })
      : null;

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  /** "Use my location instead" (seen in the reference screenshot under
   *  the today note, not written up in the spec's own prose) - same
   *  geolocation pattern TodayLocationStep.tsx already uses for the
   *  separate /journey "today" flow, adapted to match VILLAGE rather
   *  than nearest distillery, since todayNear is an AREAS slug (§7),
   *  not a distillery. Silent, non-blocking fallback on any failure
   *  (denied permission, unsupported, timeout) - this is a convenience
   *  on top of the sheet, never the only way to answer, same reasoning
   *  as that other component's own version. */
  function handleUseMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location isn't available in this browser — pick from the list instead.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let nearest = AREAS[0];
        let nearestDistSq = Infinity;
        for (const a of AREAS) {
          const distSq = (a.lat - latitude) ** 2 + (a.lng - longitude) ** 2;
          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = a;
          }
        }
        setLocating(false);
        trip.setAnswersTodayNear(nearest.slug);
      },
      () => {
        setLocating(false);
        setLocationError("Couldn't get your location — pick from the list instead.");
      },
      { timeout: 8000 }
    );
  }

  // §11 copy deck, "State two, today" note - verbatim template with the
  // two example numbers (14:20 / two distilleries) swapped for the real
  // clock and the real stop count computed above. The copy deck's own
  // trailing clause ("...if you leave now, or one at an unhurried
  // pace.") is mockup flavour text tied to that one example, not
  // something derivable for every stop count - dropped rather than
  // guessed at; flagging this as the one place Phase 4 doesn't reproduce
  // the deck word-for-word.
  const todayDistilleryCount = todaySchedule
    ? todaySchedule.stops.filter((s) => s.kind === "distillery").length
    : 0;
  const todayCountNote = todaySchedule
    ? `One clause fewer than that, even — we read the clock ourselves. It's ${formatClockTime(
        todaySchedule.nowMinutes
      )}, so there's ${
        todayDistilleryCount === 0
          ? "not really time for a distillery today"
          : todayDistilleryCount === 1
            ? "time for one distillery"
            : `time for ${todayDistilleryCount} distilleries`
      } if you leave now.`
    : "One clause fewer than that, even — we read the clock ourselves.";

  return (
    <div className={"hero" + (showReflow ? " hero-answered" : "")}>
      <div className="hero-left">
        {/* Moved inside .hero-left (was a direct .hero child, sibling of
            .hero-right) - 11 Aug 2026, alongside the stuck-transition fix
            above. .hero-overlay's inset:0 used to size against the WHOLE
            .hero row once reflowed - both columns - not just the video
            side it's meant to darken for text legibility. .hero-right has
            no z-index of its own to lift above .hero-overlay's z-index:1,
            and the overlay has no pointer-events:none, so the answers
            column was sitting visually tinted AND click-blocked underneath
            it. Scoping the overlay to .hero-left's own box (now the same
            position:relative containing block) fixes both at once -
            it can now only ever cover the video, never the off-white
            answers panel, regardless of what width .hero-left settles on. */}
        <div className="hero-overlay" />
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
                  {/* "the" moved out here from dream-areas.ts's own
                      `name` field (11 Aug 2026, Mark's request) - so a
                      chip/header/sheet-option can read a bare "Peated
                      south" as a short label, while the one place that's
                      actually a sentence still reads "...drawn to the
                      peated south." grammatically. */}
                  {" about Islay, and I'm drawn to the "}
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
              <>
                <p className="hero-sentence-note">
                  {timeframe === "dreaming" &&
                    "No dates, no obligation — but a real place, so everything beside it is anchored somewhere and turns into a plan the moment you want one."}
                  {timeframe === "today" && todayCountNote}
                  {timeframe === "planning" &&
                    `Change anything and the days re-order beside you. Nothing is ever hidden — ${days.length}, always.`}
                </p>
                {timeframe === "today" && (
                  <>
                    <button
                      type="button"
                      className="hero-action-btn hero-action-secondary hero-today-locate"
                      onClick={handleUseMyLocation}
                      disabled={locating}
                    >
                      {locating ? "Finding you…" : "📍 Use my location instead"}
                    </button>
                    {locationError && <p className="hero-sentence-note hero-today-locate-error">{locationError}</p>}
                  </>
                )}
              </>
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
          {timeframe === "planning" && (
            <HeroDaysColumn days={days} distilleries={distilleries} announce={justRevealed ? handleAnnounce : undefined} />
          )}
          {timeframe === "dreaming" && (
            <HeroDreamingColumn
              dreamAreaId={dreamArea}
              distilleries={distilleries}
              journalPosts={journalPosts}
              announce={justRevealed ? handleAnnounce : undefined}
            />
          )}
          {timeframe === "today" && (
            <HeroTodayColumn todayNear={todayNear} distilleries={distilleries} localFeatures={localFeatures} />
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
