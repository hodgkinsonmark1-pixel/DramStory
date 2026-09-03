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
  resolveTodayOrigin,
  findBaseAccommodation,
} from "@/lib/trip-answers";
import { AnswersSheets, type AnswersSheetName } from "@/components/home/AnswersSheets";
import { HeroSentenceSheets, type HeroSentenceSheetName } from "@/components/home/HeroSentenceSheets";
import { HeroDaysColumn } from "@/components/home/HeroDaysColumn";
import { HeroDreamingColumn } from "@/components/home/HeroDreamingColumn";
import { HeroTodayColumn } from "@/components/home/HeroTodayColumn";
import { buildTodaySchedule, formatClockTime } from "@/lib/today-schedule";
import { AREAS } from "@/lib/areas";
import { locateNearestArea } from "@/lib/nearest-area";
import { DREAM_AREAS } from "@/lib/dream-areas";
import type { Distillery, HubDay, JournalPost, LocalFeature } from "@/lib/types";

type SheetName = "timeframe" | "base" | "nights" | "picks" | "dreamArea" | "todayNear" | null;

const REFLOW_WIDTH_PX = 600;

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  planning: "I'm planning a trip",
  today: "I'm on Islay today",
  dreaming: "I'm just dreaming",
};

/* The desktop menu's own rows. Label and note deliberately match
   HeroSentenceSheets' TIMEFRAME_OPTIONS word for word - the same three
   choices with the same descriptions, so desktop and mobile are one
   control in two shapes rather than two controls that have drifted.
   Not imported from there because that module does not export it, and
   exporting it would make a component's internal list part of its API
   for the sake of three lines. */
const TIMEFRAME_OPTIONS: { value: Timeframe; label: string; note: string }[] = [
  { value: "planning", label: "I'm planning a trip", note: "Base, days and picks - the full sentence." },
  { value: "today", label: "I'm on Islay today", note: "We read the clock and show you what fits." },
  { value: "dreaming", label: "I'm just dreaming", note: "No dates - just somewhere to start." },
];

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
 * On desktop, all three timeframes reveal in place - "Show me the days"
 * calls trip.setHeroRevealed, full stop. Switching the timeframe clause
 * between them just swaps which right-column component shows, without
 * the button needing to be pressed again for each - trip.heroRevealed is
 * one shared "has this visitor ever revealed a reflow" flag, not one per
 * timeframe.
 *
 * §8 of the design doc: "Mobile does not do this... This is a
 * desktop-only behaviour behind a breakpoint, not a shared component.
 * The sentence control itself is shared; the two-state reflow is not."
 * That breakpoint was never actually wired up when Phases 2-4 shipped -
 * confirmed 11 Aug 2026 by grepping this file and every hero-* CSS rule
 * for "mobile"/"@media" and finding nothing, which is what let the fixed
 * 600px desktop split render unmodified on a phone. Fixed here:
 * isMobileViewport (same matchMedia pattern as Workspace.tsx) forces
 * showReflow false and sends handleShowDays to /days instead of
 * revealing in place, on every timeframe alike - exactly what §8 and
 * Phase 1's own original spec ("pressing the button still navigates to
 * /days") describe. dramstory-legacy.css's mobile .hero-answered rules
 * (added same day, before this was found) stay as a defensive fallback
 * for the brief pre-hydration window - real, if usually sub-16ms, same
 * accepted tradeoff Workspace.tsx's own isMobileViewport already makes -
 * rather than something normally reachable now.
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
  const router = useRouter();
  const [tagVis, setTagVis] = useState(false);
  const [chevVis, setChevVis] = useState(false);
  const [sentVis, setSentVis] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetName>(null);
  /* Desktop's inline timeframe menu (see clause 1 below). Separate from
     openSheet on purpose: openSheet drives the modal sheets, and folding
     this in would mean every sheet consumer having to know that one of
     them renders somewhere else entirely. */
  const [tfMenuOpen, setTfMenuOpen] = useState(false);
  // Gates the §6 live-region announcement to only the visitor's own
  // button press this session - never the hydration-driven reveal a
  // returning visitor gets, which isn't a reflow they need told about.
  const [justRevealed, setJustRevealed] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // §8: the two-state reflow is desktop-only, behind a breakpoint - see
  // this file's header comment. Same matchMedia pattern as
  // Workspace.tsx's own isMobileViewport (starts false so server and
  // first client render agree, flips true a moment later on an actual
  // mobile viewport - same accepted brief-flash tradeoff, same 768px
  // breakpoint every other responsive rule in this codebase already
  // uses).
  const MOBILE_BREAKPOINT = 768;
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => {
      setIsMobileViewport(mq.matches);
      /* Crossing into mobile hands clause 1 back to the sheet, so a menu
         left open would be unreachable. Closed here, in the matchMedia
         callback, rather than in an effect keyed on isMobileViewport -
         that is a setState in an effect body, which cascades a render
         and trips react-hooks/set-state-in-effect. A subscription
         callback is exactly where React wants this. */
      if (mq.matches) setTfMenuOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* Outside click and Escape close the inline menu - the two things a
     backdrop gave the sheet for free and an anchored menu has to do for
     itself. Listener only while it is open, and mousedown rather than
     click so the menu closes on press like every other menu on the web.
     Also closed whenever the viewport crosses into mobile, where the
     sheet takes over and a stray open menu would be unreachable. */
  useEffect(() => {
    if (!tfMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const inside = (e.target as HTMLElement | null)?.closest(".hero-tf-inline, .hero-sentence-clause");
      if (!inside) setTfMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTfMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [tfMenuOpen]);

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
  // !isMobileViewport is the §8 breakpoint - forces the poster even for
  // a visitor whose trip.heroRevealed is already true (set on a wider
  // viewport previously), since mobile never shows this reflow at all.
  const showReflow = trip.ready && trip.heroRevealed && !isMobileViewport;

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
  /* One resolution for the whole component: a dropped pin if there is
     one, the picked village otherwise. The sentence reads its label and
     the schedule reads its coordinates, so the two can never disagree
     about where "today" is being measured from. */
  const todayOrigin = resolveTodayOrigin(trip.answers ?? {});

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

  function selectTodayPoint(point: { lat: number; lng: number }) {
    trip.setAnswersTodayPoint(point, "device");
    setOpenSheet(null);
  }

  /** Same answer, sheet left open - see the map's own note in
   *  HeroSentenceSheets. */
  function dropPin(point: { lat: number; lng: number }) {
    trip.setAnswersTodayPoint(point, "pin");
  }

  function handleShowDays() {
    // §8: mobile keeps the single-question hero and navigates away
    // rather than revealing in place. Originally sent every timeframe
    // to /days regardless (the design doc's Phase 1 scope only ever
    // built that one destination) - but /days only reads planning's own
    // answers (base/nights/picks), so a dreaming/today visitor landed
    // somewhere that silently ignored what they'd just answered.
    // Fixed 11 Aug 2026 per Mark's live mobile review: each timeframe
    // now gets its own standalone page hosting the exact same reveal
    // column desktop shows split-screen (HeroDaysColumn/
    // HeroDreamingColumn/HeroTodayColumn) - "the logic would be the
    // same as desktop version... essentially the same as the planning a
    // trip process" (Mark's own words).
    if (isMobileViewport) {
      if (timeframe === "dreaming") {
        router.push("/dreaming");
        return;
      }
      if (timeframe === "today") {
        router.push("/today");
        return;
      }
      router.push("/days");
      return;
    }
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
          village: todayOrigin,
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
    setLocating(true);
    setLocationError(null);
    locateNearestArea(
      (point) => {
        setLocating(false);
        trip.setAnswersTodayPoint(point, "device");
      },
      (reason) => {
        setLocating(false);
        setLocationError(
          reason === "unsupported"
            ? "Location isn't available in this browser — pick from the list instead."
            : "Couldn't get your location — pick from the list instead."
        );
      }
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
              {/* Clause 1 opens an INLINE DROPDOWN on desktop and keeps the
                  centred sheet on mobile (03 Sep 2026, Mark's call).
                  §3 of the handoff always specified "an inline dropdown
                  trigger styled as the sentence's own words"; the centred
                  .tour-picker-modal was a Phase 1 shortcut, reused from the
                  tour picker rather than built. A backdrop that greys the
                  whole hero to change one word is too heavy for a screen
                  with room to show the menu beside the word - which a phone
                  does not have, so mobile keeps the sheet.

                  Timeframe only. The other three clauses keep their sheets
                  on both: base carries a note per hotel and picks is
                  multi-select, neither of which fits a small anchored menu. */}
              <button
                type="button"
                className="hero-sentence-clause"
                aria-haspopup={isMobileViewport ? "dialog" : "true"}
                aria-expanded={isMobileViewport ? openSheet === "timeframe" : tfMenuOpen}
                aria-label={`Change where you are in your story: ${TIMEFRAME_LABEL[timeframe]}`}
                onClick={() => (isMobileViewport ? setOpenSheet("timeframe") : setTfMenuOpen((v) => !v))}
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
                  {/* "and I've dropped a pin" when the visitor used their
                      location, ", near Bowmore" when they picked from the
                      list (03 Sep 2026, Mark's wording). The clause is the
                      same control either way - it still opens the same
                      sheet - so a pin can be swapped back for a village
                      without hunting for a different affordance. */}
                  {todayOrigin.connector}
                  <button
                    type="button"
                    className="hero-sentence-clause"
                    aria-haspopup="dialog"
                    aria-expanded={openSheet === "todayNear"}
                    aria-label={`Change where on Islay: ${todayOrigin.label}`}
                    onClick={() => setOpenSheet("todayNear")}
                  >
                    {todayOrigin.label}
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

            {/* THE THREE OPTIONS, INLINE (03 Sep 2026, Mark's call after
                seeing the dropdown). No panel, no border, no backdrop -
                they read as words over the video, the same way the
                sentence itself does. A white box floating over the hero
                was the thing he objected to, and it was never in the
                spec: section 3 asks for a trigger "styled as the
                sentence's own words", which a card is not.

                In normal flow rather than absolutely positioned, so it
                pushes the button down instead of covering it - nothing
                is hidden behind the thing you just opened.

                Desktop only. A phone keeps the sheet: there is no room
                to expand three options and their notes inside a hero
                that is already the whole screen. */}
            {!isMobileViewport && tfMenuOpen && (
              <div className="hero-tf-inline" role="group" aria-label="Where are you in your story?">
                {/* The three headline options and nothing else (Mark,
                    03 Sep 2026). No repeated question line above them -
                    the clause you just clicked IS the question, and
                    restating it in the hero read as a second one. No
                    per-option notes either: the sentence rewrites itself
                    the moment you choose, which explains each option
                    better than a line of description could. The question
                    still heads the sheet on mobile, where there is no
                    clause left on screen to carry it. */}
                {TIMEFRAME_OPTIONS.map((opt) => {
                  const selected = timeframe === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      className={selected ? "hero-tf-opt is-on" : "hero-tf-opt"}
                      onClick={() => {
                        trip.setAnswersTimeframe(opt.value);
                        setTfMenuOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

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
                {/* Desktop keeps the doc's verbatim "Show me the days"
                    regardless of timeframe - the button only triggers a
                    reveal there, not a destination choice (state two's
                    reflow already differs per timeframe once shown).
                    Mobile actually navigates somewhere different per
                    timeframe now (11 Aug 2026, see handleShowDays), so
                    its label says which - matches Mark's live review
                    request that mobile's answer feel connected to where
                    it actually takes you, not a fixed generic label. */}
                {isMobileViewport
                  ? timeframe === "dreaming"
                    ? "Show me the area"
                    : timeframe === "today"
                      ? "Show me what fits"
                      : "Show me the days"
                  : "Show me the days"}
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
            <HeroTodayColumn origin={todayOrigin} distilleries={distilleries} localFeatures={localFeatures} />
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
        todayPoint={trip.answers?.todayPoint}
        onSelectTimeframe={selectTimeframe}
        onSelectDreamArea={selectDreamArea}
        onSelectTodayNear={selectTodayNear}
        onSelectTodayPoint={selectTodayPoint}
        onDropPin={dropPin}
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
