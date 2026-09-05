"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Distillery, ItineraryDay, ItineraryStop, LocalFeature, Tour, TripAccommodation, TripDateMode, TripDates, TripIntake, TripMapView } from "@/lib/types";
import { stopId } from "@/lib/itinerary-stop";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { AREAS } from "@/lib/areas";
import { DREAM_AREAS } from "@/lib/dream-areas";

/* Exported (5 Sep 2026) so sign-out can clear the local trip once it is
   safely in the account - see SignOutButton. */
export const STORAGE_KEY = "dramstory-trip-v2";

/** Which saved trip this browser is editing (5 Sep 2026, named trips).
 *  Deliberately per-browser rather than per-account: someone with the
 *  site open on a laptop and a phone should be able to work on different
 *  trips on each. Shared by TripSync and the account page's list. */
export const ACTIVE_TRIP_KEY = "dramstory-active-trip";

/** Set only while the local trip is known to match what is in the
 *  account (5 Sep 2026). TripSync REMOVES it the instant the trip
 *  changes and re-adds it when a write succeeds, so its presence means
 *  "nothing unsaved", not merely "saved at some point". That distinction
 *  is the whole point: sign-out clears the local trip only when this is
 *  present, and a stale marker would throw away exactly the unsynced
 *  work it exists to protect. */
export const TRIP_SYNCED_KEY = "dramstory-trip-synced";

/** Untouched default - "confirmed: false" keeps anything date-dependent
 *  (weather popup, calendar-date day labels, Local Events pins) hidden
 *  until the visitor actually interacts with the header date control.
 *  Deliberately blank (not pre-filled with today) so the header's date
 *  inputs render empty on first arrival, rather than looking like a
 *  choice has already silently been made for the visitor. */
function defaultTripDates(): TripDates {
  return { mode: "range", startDate: "", endDate: "", month: "", confirmed: false };
}

/** Site-wide "where are you staying, how long, which distilleries"
 *  answers - asked once on the homepage question block and read
 *  everywhere from there on (distillery pages, area pages, /stays,
 *  Local Features, and eventually /days' own ranking - see
 *  docs/days-trip-flow-handoff.md §2.2/§3.1). picks is a RANKING input,
 *  never a filter: this phase only captures and persists it, Phase 2's
 *  /days rebuild is what actually reorders on it. */
/** The hero sentence's first clause (docs/hero-handoff.md §3.1) - each
 *  option changes both the shape of the sentence (which later clauses
 *  apply) and what the eventual two-state column returns. "planning" is
 *  the only one that uses base/nights/picks; "today"/"dreaming" use
 *  todayNear/dreamArea instead. */
export type Timeframe = "planning" | "today" | "dreaming";

export interface TripAnswers {
  /** Hero sentence clause 1. Defaults to "planning" - the fullest form of
   *  the sentence, and the only one the rest of the site (picks-ranked
   *  /days, site-wide base) currently does anything with. */
  timeframe: Timeframe;
  /** A FEATURED_STAYS slug when baseKind is "hotel", an AREAS slug when
   *  baseKind is "area" - always a real, linkable place. There is
   *  deliberately no "anywhere on Islay" option (per the design doc: an
   *  unranked list is the one thing the homepage question exists to
   *  avoid). Only meaningful when timeframe is "planning". */
  base: string;
  baseKind: "hotel" | "area";
  /** Defaults to 3 - matches FEATURED_STAYS[0] (The Machrie) already
   *  being addDay()'s own fallback default, so this formalises an
   *  existing implicit default rather than introducing a new one. Only
   *  meaningful when timeframe is "planning". */
  nights: number;
  /** Distillery slugs the visitor said they'd like to see - reorders
   *  Phase 2's /days list and never hides a day. Empty means "any
   *  distillery". Only meaningful when timeframe is "planning". */
  picks: string[];
  /** Hero sentence's second clause when timeframe is "dreaming" - a
   *  src/lib/dream-areas.ts id ("I'm drawn to {name}"). Optional in the
   *  type only because a visitor who has never touched the dreaming
   *  clause has no answer yet; DEFAULT_TRIP_ANSWERS always supplies one
   *  once timeframe becomes "dreaming" so the sentence is never blank. */
  dreamArea?: string;
  /** Hero sentence's second clause when timeframe is "today" - a
   *  src/lib/areas.ts slug ("near {name}"). Session-scoped per the design
   *  doc (§4.2: "persists nowhere - it is a today thing") - kept in this
   *  same object for now since Phase 1 only needs it to render the
   *  sentence; a future phase may choose to exclude it from persistence
   *  rather than add a second store. */
  todayNear?: string;
  /** The visitor's ACTUAL position, when they used "Use my location"
   *  rather than picking a village (03 Sep 2026, Mark's call).
   *
   *  WHY BOTH. todayNear is a village slug, and there are only three
   *  areas across a 25-mile island - so bucketing a real fix to the
   *  nearest one threw away most of its value. buildTodaySchedule only
   *  ever wanted { lat, lng } (it never sees a slug), so a real point
   *  can go straight in and every drive time is then measured from
   *  where the visitor is standing rather than from a village centre
   *  up to ten miles away.
   *
   *  todayNear stays as the fallback and as what a village pick sets;
   *  the two are mutually exclusive and setAnswersTodayNear clears this
   *  one. Read them through resolveTodayOrigin() rather than testing
   *  for this field at a call site. */
  todayPoint?: { lat: number; lng: number };
  /** HOW that point was set - the device found it, or the visitor tapped
   *  the map. Kept because the sentence says different things about the
   *  two ("I'm using my location" against "I've dropped a pin") and
   *  coordinates alone cannot tell them apart. Undefined whenever
   *  todayPoint is. */
  todayPointSource?: "device" | "pin";
}

/** What the homepage block and the /days answers bar show before a
 *  visitor has touched anything - "Deep links from search show
 *  defaults; never blank" per the design doc's §3.2. Matches addDay()'s
 *  own existing fallback (FEATURED_STAYS[0], 3 nights). */
export const DEFAULT_TRIP_ANSWERS: TripAnswers = {
  timeframe: "planning",
  base: FEATURED_STAYS[0].slug,
  baseKind: "hotel",
  nights: 3,
  picks: [],
  dreamArea: DREAM_AREAS[0].id,
  todayNear: AREAS[0].slug,
};

export interface StoredTrip {
  days: ItineraryDay[];
  intake: TripIntake | null;
  currentDayIndex: number;
  mapView: TripMapView | null;
  tripDates: TripDates | null;
  answers: TripAnswers | null;
  /** Has this visitor ever pressed "Show me the days" from the planning
   *  hero (docs/hero-handoff.md §2.4)? Once true, the hero renders
   *  straight into state two on every future visit - "once you've seen
   *  days, the poster is a downgrade." Separate from `answers` itself
   *  (which can be null/default with no reveal, or set with no reveal -
   *  a visitor can open a sheet and change an answer from the poster
   *  without ever pressing the button). */
  heroRevealed?: boolean;
  /** Dreaming's mobile-only shortlist (11 Aug 2026) - see
   *  TripContextValue.shortlist for the full story. Reuses ItineraryStop
   *  verbatim rather than a new type - a shortlisted item is exactly a
   *  stop's data (distillery/feature, no tour/note/customMinutes set
   *  yet) before it's been placed on any day. */
  shortlist?: ItineraryStop[];
}

interface TripContextValue {
  days: ItineraryDay[];
  /** Which day is currently being viewed/edited - shared across the whole
   *  app (not just local Workspace state) so that adding a distillery or
   *  tour from that distillery's own page lands on the day the visitor was
   *  actually looking at, and so navigating away to a distillery page and
   *  back to /journey returns to the same day rather than resetting to
   *  Day 1. Persisted alongside days/intake for the same reason. */
  currentDayIndex: number;
  setCurrentDayIndex: (index: number) => void;
  /** Where the map is panned/zoomed to - persisted for the same reason as
   *  currentDayIndex: leaving to view a distillery and coming back should
   *  return to the same view, not reset to the default island-wide
   *  center every time. Null until the map has been interacted with at
   *  least once. */
  mapView: TripMapView | null;
  setMapView: (view: TripMapView) => void;
  /** When the visitor is/will be visiting - set via the workspace header,
   *  not gated to any one subtab. See TripDates for what reads it. */
  tripDates: TripDates;
  /** Switches between a specific date range and a looser month, without
   *  otherwise changing what's selected. Deliberately does NOT set
   *  confirmed - that only flips once an actual date/month is picked, so
   *  merely toggling the mode doesn't summon the weather popup. */
  setDateMode: (mode: TripDateMode) => void;
  /** Sets a specific start/end date and marks tripDates confirmed. */
  setDateRange: (startDate: string, endDate: string) => void;
  /** Sets a "YYYY-MM" month and marks tripDates confirmed. */
  setDateMonth: (month: string) => void;
  /** The completed Q2/Step3/Q4 answers, once the visitor has been through
   *  the intake flow at least once - lets "Back to your journey" (from a
   *  distillery page) jump straight to the workspace instead of
   *  restarting the questions, since this is what was previously missing. */
  intake: TripIntake | null;
  /** True once the saved trip has been read from localStorage - avoids a
   *  flash of "no days yet" before hydration catches up. */
  ready: boolean;
  /** The whole trip as one serialisable object - the same shape written
   *  to localStorage. Added 4 Sep 2026 for account sync: TripSync reads
   *  this to push a signed-in visitor's trip to Supabase, rather than
   *  reassembling the eight pieces of state at a call site and drifting
   *  from what localStorage stores. */
  snapshot: StoredTrip;
  /** Replace the whole trip at once. Used when a signed-in visitor's
   *  account trip is loaded and should win over whatever this browser
   *  had. Deliberately blunt, same as the cross-tab sync: this app has
   *  one tab actively editing at a time and does not attempt to merge
   *  concurrent edits. */
  replaceTrip: (stored: StoredTrip) => void;
  /** Which account trip is being edited in this browser, or null when
   *  signed out / not yet resolved (5 Sep 2026).
   *
   *  IT LIVES HERE RATHER THAN ONLY IN localStorage because a pointer
   *  nobody re-reads is not a switch. TripsList used to write the key and
   *  navigate, which moved the pointer and nothing else: TripSync's load
   *  effect did not depend on it, so the previous trip stayed on screen
   *  and the next edit was written back to the previous row. Holding it
   *  as state is what makes choosing a trip actually change the trip. */
  activeTripId: string | null;
  /** Point this browser at a different account trip. TripSync notices and
   *  fetches that row's contents; callers do not load the payload
   *  themselves, so there is exactly one path that decides what the trip
   *  currently is. Pass null to stop tracking a row (sign-out). */
  setActiveTrip: (id: string | null) => void;
  initDays: (count: number) => void;
  /** Grows the day list to match a target count if it's currently
   *  shorter, preserving every existing day and its stops - used when the
   *  visitor sets a specific date range in the header, now that there's
   *  no longer a separate "how long" question to seed the day count
   *  from. Deliberately grow-only: a narrower range never auto-removes
   *  days (and their stops) - shrinking stays a manual "Remove" action.
   *  A no-op if the count already matches or is smaller. */
  syncDayCount: (targetCount: number) => void;
  completeIntake: (intake: TripIntake) => void;
  /** Clears the saved trip and intake entirely - used by "Start over". */
  resetTrip: () => void;
  /** sourceHubDaySlug tags the new day as having come from a specific
   *  Days Hub day - see ItineraryDay.sourceHubDaySlug for why. Omit for
   *  an ordinary "+ Add day" from the workspace toolbar.
   *
   *  Returns the index the day landed at, so callers building it out
   *  (addStop/setTourForStop/addFeatureStop) don't have to separately
   *  guess where it went. Normally that's just the old length (appended
   *  at the end) - but if sourceHubDaySlug is given AND every existing
   *  day is still genuinely untouched (no stops, no sourceHubDaySlug of
   *  its own - e.g. the blank days Workspace.tsx's own initDays seeds for
   *  a fresh /journey visit with nothing chosen yet), those are collapsed
   *  down to the one real day being added, at index 0, rather than
   *  appended after (11 Aug 2026, Mark's request: hero/DaysHub/Area "add
   *  this real day" actions were landing as Day 2+ because untouched
   *  blank days still counted ahead of it). A manual, slug-less
   *  "+ Add day" always appends as before - only adding an actual curated
   *  day collapses the blanks. */
  addDay: (sourceHubDaySlug?: string) => number;
  removeDay: (index: number) => void;
  /** Moves a day earlier/later in the trip without touching what's inside
   *  it - re-labels every day by its new position afterwards (labels are
   *  positional, e.g. "Day 2", not a fixed identity) and moves
   *  currentDayIndex along with the day being reordered so the visitor's
   *  view follows it rather than jumping to whatever now sits at the old
   *  index. */
  moveDay: (index: number, direction: -1 | 1) => void;
  /** anchor marks this stop as the reason the day exists (Days/Trip flow
   *  Phase 4) - passed through from a HubDay's own stop.anchor when
   *  copying a Hub Day into the trip (see DaysHubGrid.tsx's
   *  handleAddToTrip and resetDayToHub). Omit (or false) for an ordinary
   *  stop added freehand in the planner - anchors are never droppable/
   *  swappable in the day screen's editing UI. */
  addStop: (dayIndex: number, distillery: Distillery, anchor?: boolean) => void;
  /** Adds a Natural Feature (beach/walk/bike route/local gem) as a stop -
   *  the map popup's "+ Add to Trip" button for these. */
  addFeatureStop: (dayIndex: number, feature: LocalFeature) => void;
  /** Removes any stop (distillery or feature) by its stopId(). */
  removeStop: (dayIndex: number, id: string) => void;
  /** Dreaming's mobile-only shortlist (11 Aug 2026, Mark's request after
   *  reviewing mobile: the desktop map lets a visitor add straight to a
   *  day, but that assumes days already exist / are worth committing to
   *  yet - a "dreaming" mobile visitor is still browsing, not building
   *  an itinerary. This is a lightweight in-between: tap a pin, shortlist
   *  it, decide which day it belongs to later (see the commit helpers
   *  below) rather than being forced to place it immediately. Entirely
   *  separate from any day's stops until explicitly committed - nothing
   *  here shows up in /trip or the itinerary panel until then. */
  shortlist: ItineraryStop[];
  addDistilleryToShortlist: (distillery: Distillery) => void;
  addFeatureToShortlist: (feature: LocalFeature) => void;
  removeFromShortlist: (id: string) => void;
  /** Swaps a stop with its neighbor - lets a visitor reorder a day without
   *  deleting and re-adding (which would also lose any picked tour). */
  moveStop: (dayIndex: number, stopIndex: number, direction: -1 | 1) => void;
  /** Sets a visitor-adjusted visit duration for a stop (the +/- toggle
   *  next to "~X visit"). */
  setStopMinutes: (dayIndex: number, id: string, minutes: number) => void;
  setStopNote: (dayIndex: number, id: string, note: string) => void;
  /** Sets (or clears, if tour is undefined) the specific tour booked for a
   *  distillery on a given day - this is what "+ Add to Journey" on a
   *  distillery's own tour cards writes to. If the distillery isn't on
   *  that day yet, it's added. */
  setTourForStop: (dayIndex: number, distillery: Distillery, tour: Tour | undefined) => void;
  /** Finds every day a distillery currently appears on - used by the
   *  distillery page to show "already in your journey" state. */
  findStopDays: (distillerySlug: string) => number[];
  /** Sets (or clears, if undefined) where a day starts/ends - see
   *  TripAccommodation for why this is a place, not a booking. Only ever
   *  touches the one day it's given - used internally to seed a sensible
   *  default (addDay/syncDayCount/AccommodationControl's own no-stay-set
   *  fallback), NOT for a visitor actually changing where they're
   *  staying - see setAccommodationFromDay for that. */
  setAccommodation: (dayIndex: number, accommodation: TripAccommodation | undefined) => void;
  /** What AccommodationControl's dropdown/search actually calls when a
   *  visitor picks somewhere to stay (22 July 2026, scope-confirm prompt
   *  reworked 23 July 2026). Most trips use one base for the whole stay,
   *  so scope defaults to "all" - every day in the trip gets this
   *  accommodation, not just the one being edited. "fromHere" is the
   *  explicit opt-in - a two-button prompt AccommodationControl shows
   *  right after a place is picked (only when there's an earlier day for
   *  it to matter for) - for a visitor who's deliberately splitting their
   *  stay across two bases - updates dayIndex and every day AFTER it,
   *  leaving earlier days untouched. */
  setAccommodationFromDay: (dayIndex: number, accommodation: TripAccommodation, scope: "all" | "fromHere") => void;
  /** Site-wide "where/how long/which distilleries" answers - null until
   *  the visitor has touched the homepage question block at least once.
   *  Consumers should treat null the same as DEFAULT_TRIP_ANSWERS (see
   *  that constant) rather than rendering a blank state - "deep links
   *  show defaults; never blank" per the design doc. */
  answers: TripAnswers | null;
  /** Sets the base answer AND calls setAccommodationFromDay(0, ..., "all")
   *  so the stated answer and the actual itinerary never disagree (per
   *  the design doc's §2.2). accommodation is the full place (name/lat/
   *  lng) the caller already has from FEATURED_STAYS or AREAS. Fills in
   *  every other answer from the current answers (or the defaults, if
   *  unset) so setting the base alone doesn't reset them. */
  setAnswersBase: (base: string, baseKind: "hotel" | "area", accommodation: TripAccommodation) => void;
  /** Sets the nights answer, leaving everything else untouched. */
  setAnswersNights: (nights: number) => void;
  /** Replaces the picks answer wholesale - callers own their own
   *  toggle/multi-select logic and pass the resulting full array. */
  setAnswersPicks: (picks: string[]) => void;
  /** Sets the hero sentence's first clause. Leaves base/nights/picks/
   *  dreamArea/todayNear untouched even when they stop applying to the
   *  new timeframe - switching back preserves what was there before,
   *  rather than resetting it to the default each time. */
  setAnswersTimeframe: (timeframe: Timeframe) => void;
  /** Sets the dreaming clause's area (a dream-areas.ts id). */
  setAnswersDreamArea: (dreamArea: string) => void;
  /** Sets the today clause's village (an areas.ts slug). */
  setAnswersTodayNear: (todayNear: string) => void;
  setAnswersTodayPoint: (todayPoint: { lat: number; lng: number }, source: "device" | "pin") => void;
  /** See StoredTrip.heroRevealed - whether the planning hero has ever
   *  reflowed into state two for this visitor. Write-only in the sense
   *  that nothing currently sets it back to false except resetTrip. */
  heroRevealed: boolean;
  setHeroRevealed: (revealed: boolean) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [intake, setIntake] = useState<TripIntake | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [mapView, setMapView] = useState<TripMapView | null>(null);
  const [tripDates, setTripDates] = useState<TripDates>(defaultTripDates);
  const [answers, setAnswers] = useState<TripAnswers | null>(null);
  const [heroRevealed, setHeroRevealedState] = useState(false);
  const [shortlist, setShortlist] = useState<ItineraryStop[]>([]);
  const [ready, setReady] = useState(false);
  const [activeTripId, setActiveTripIdState] = useState<string | null>(null);

  // Reads localStorage after mount rather than in a lazy useState
  // initializer deliberately: the server always renders an empty trip
  // (no localStorage there), so if the client's very first render already
  // showed the stored trip, that would be a server/client hydration
  // mismatch. Updating state from an effect after mount is the standard,
  // safe way to hydrate this kind of client-only persisted data.
  /** Applies a parsed StoredTrip into state - shared by the initial-load
   *  hydration below and the cross-tab sync effect further down, so both
   *  read the same five fields the same way. */
  function applyStoredTrip(parsed: StoredTrip) {
    setDays(parsed.days ?? []);
    setIntake(parsed.intake ?? null);
    setCurrentDayIndex(parsed.currentDayIndex ?? 0);
    setMapView(parsed.mapView ?? null);
    setTripDates(parsed.tripDates ?? defaultTripDates());
    setAnswers(parsed.answers ?? null);
    setHeroRevealedState(parsed.heroRevealed ?? false);
    setShortlist(parsed.shortlist ?? []);
  }

  /** Writes through to localStorage as well as state, because which trip
   *  is being edited has to survive a reload - and because TripSync reads
   *  the key directly on a cold start, before this provider has told
   *  anyone anything. */
  function setActiveTrip(id: string | null) {
    try {
      if (id) window.localStorage.setItem(ACTIVE_TRIP_KEY, id);
      else window.localStorage.removeItem(ACTIVE_TRIP_KEY);
    } catch {
      // Private mode or full storage. The switch still works for this
      // session; it just will not be remembered next visit.
    }
    setActiveTripIdState(id);
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        applyStoredTrip(JSON.parse(raw));
      }
      const active = window.localStorage.getItem(ACTIVE_TRIP_KEY);
      if (active) setActiveTripIdState(active);
    } catch {
      // Corrupt or inaccessible storage - just start fresh.
    }
    setReady(true);
  }, []);

  // Persist on every change, once past initial load (so we don't
  // immediately overwrite a saved trip with the empty initial state).
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ days, intake, currentDayIndex, mapView, tripDates, answers, heroRevealed, shortlist })
      );
    } catch {
      // Storage full or unavailable - the trip still works for this
      // session, it just won't survive a reload.
    }
  }, [days, intake, currentDayIndex, mapView, tripDates, answers, heroRevealed, shortlist, ready]);

  // Cross-tab live sync (22 July 2026) - added for the Days Hub's
  // "+ Add this day to my trip", which a visitor might reasonably have
  // open in one tab while their actual itinerary/map sits open in
  // another (e.g. opened from the homepage, or via the onboarding
  // walkthrough's "open in new tab" links). Without this, adding a Day
  // in the Days Hub tab only updated that tab's own in-memory state and
  // localStorage - a separately-open itinerary tab had no way to know
  // anything changed, and stayed stale until manually reloaded.
  //
  // The browser's `storage` event fires in every OTHER same-origin tab
  // when localStorage changes (never in the tab that made the change),
  // which is exactly the shape needed here - no polling, no custom
  // messaging channel. Deliberately a blunt "whatever's in storage now
  // wins" sync, same logic as the initial-load hydration above: fine for
  // this app's actual usage pattern (one tab actively edits at a time),
  // not attempting to merge concurrent edits across two simultaneously
  // active tabs.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        applyStoredTrip(JSON.parse(event.newValue));
      } catch {
        // Malformed write from elsewhere - ignore rather than crash.
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const initDays = useCallback((count: number) => {
    setDays((prev) => {
      if (prev.length > 0) return prev; // don't clobber an existing trip
      return Array.from({ length: count }, (_, i) => ({
        id: `day-${i + 1}`,
        label: `Day ${i + 1}`,
        stops: [],
      }));
    });
  }, []);

  const syncDayCount = useCallback((targetCount: number) => {
    setDays((prev) => {
      // Grow-only: a narrower date range never auto-removes days, since
      // that would silently drop any stops already added to them with no
      // warning. Shrinking stays a deliberate manual action via the
      // existing "Remove" button, which the visitor can already see and
      // undo their way out of.
      if (targetCount <= prev.length) return prev;
      // Carries the last existing day's accommodation forward, same
      // reasoning as addDay above (22 July 2026) - without this, these
      // extra days were left with no accommodation at all and only
      // picked one up once AccommodationControl's own no-stay-set
      // fallback ran (which - now also fixed - carries forward too, but
      // setting it here directly avoids that dependency and any render
      // where it's briefly unset).
      const carriedAccommodation = prev[prev.length - 1]?.accommodation;
      const extra = Array.from({ length: targetCount - prev.length }, (_, i) => ({
        id: `day-${prev.length + i + 1}`,
        label: `Day ${prev.length + i + 1}`,
        stops: [] as ItineraryDay["stops"],
        ...(carriedAccommodation ? { accommodation: carriedAccommodation } : {}),
      }));
      return [...prev, ...extra];
    });
  }, []);

  const completeIntake = useCallback((newIntake: TripIntake) => {
    setIntake(newIntake);
  }, []);

  const resetTrip = useCallback(() => {
    setDays([]);
    setIntake(null);
    setCurrentDayIndex(0);
    setMapView(null);
    setTripDates(defaultTripDates());
    // Judgment call (Phase 1, days-trip-flow): "Start over" clears the
    // whole StoredTrip blob answers now lives in, so it clears the
    // site-wide answers too rather than leaving a stale base/nights/
    // picks pointing at a trip that no longer exists. Flagging this
    // since the design doc doesn't explicitly say whether answers should
    // survive a trip reset - easy to change if that's not the intent.
    // Same reasoning extended to heroRevealed (Phase 2): starting over
    // puts the homepage hero back at the poster too, consistent with
    // there being no trip/answers left for state two to show.
    setAnswers(null);
    setHeroRevealedState(false);
  }, []);

  const setDateMode = useCallback((mode: TripDateMode) => {
    // Resets confirmed to false on every mode switch - otherwise switching
    // from a confirmed Month pick straight to Dates (or vice versa) left
    // confirmed:true paired with that mode's still-empty value, which
    // downstream code (calendar-date day labels, the weather popup) took
    // as "a real date is set" and crashed trying to format an empty
    // string as a date. Switching modes now always requires picking the
    // new mode's value again before anything date-dependent reappears.
    setTripDates((prev) => ({ ...prev, mode, confirmed: false }));
  }, []);

  const setDateRange = useCallback((startDate: string, endDate: string) => {
    setTripDates((prev) => ({ ...prev, mode: "range", startDate, endDate, confirmed: true }));
  }, []);

  const setDateMonth = useCallback((month: string) => {
    setTripDates((prev) => ({ ...prev, mode: "month", month, confirmed: true }));
  }, []);

  // isReplacingBlankStarter/resolvedIndex read the outer `days` snapshot
  // (not the setDays updater's `prev`) so the returned index is captured
  // the same "before the state update, off the current snapshot" way
  // every existing caller already computes newDayIndex themselves (see
  // DaysHubGrid.tsx/AreaClient.tsx) - the updater below re-derives the
  // same boolean off its own `prev` purely so the write it performs
  // matches, but the two are expected to agree since both read off the
  // same render's days.
  const addDay = useCallback((sourceHubDaySlug?: string) => {
    const allUntouched = days.length > 0 && days.every((d) => d.stops.length === 0 && !d.sourceHubDaySlug);
    const isCollapsingBlankDays = !!sourceHubDaySlug && allUntouched;
    const resolvedIndex = isCollapsingBlankDays ? 0 : days.length;
    // Every new day needs a real accommodation from the moment it exists
    // (so its route/drive-time totals aren't blank), but it should default
    // to wherever the visitor's ALREADY staying, not reset back to The
    // Machrie every time (22 July 2026 fix - previously always used
    // FEATURED_STAYS[0] regardless of what any existing day already had,
    // so changing Day 1's hotel and then adding Day 2 silently reverted
    // back to The Machrie instead of carrying the change forward). Carries
    // the LAST existing day's accommodation forward; only actually falls
    // back to The Machrie for the very first day of a brand-new trip,
    // when there's nothing yet to carry forward from.
    setDays((prev) => {
      const carriedAccommodation = prev.length > 0 ? prev[prev.length - 1].accommodation : undefined;
      const { name, lat, lng } = carriedAccommodation ?? FEATURED_STAYS[0];
      // Workspace.tsx's own initDays(DEFAULT_STARTING_DAYS) effect seeds
      // real, blank days (no demo content since 11 Aug 2026 - see
      // JourneyFlow.tsx) whenever a visitor reaches /journey with nothing
      // chosen yet. If every existing day is still genuinely untouched
      // (no stops, no sourceHubDaySlug) and a REAL curated day is being
      // added here (always passed via sourceHubDaySlug), collapse those
      // blanks down to the one real day rather than appending after them
      // - otherwise every hero/DaysHub/Area "add this day" would read as
      // Day 2+ even though nothing meaningful was in the earlier ones. A
      // manual, slug-less "+ Add day" (Workspace toolbar, mobile sheet,
      // AreaClient's blank-day actions) always appends as before, since
      // there's no curated content to prioritise over the blanks in
      // that case.
      const prevAllUntouched = prev.length > 0 && prev.every((d) => d.stops.length === 0 && !d.sourceHubDaySlug);
      if (!!sourceHubDaySlug && prevAllUntouched) {
        return [{ id: "day-1", label: "Day 1", stops: [], accommodation: { name, lat, lng }, sourceHubDaySlug }];
      }
      return [
        ...prev,
        {
          id: `day-${prev.length + 1}`,
          label: `Day ${prev.length + 1}`,
          stops: [],
          accommodation: { name, lat, lng },
          ...(sourceHubDaySlug ? { sourceHubDaySlug } : {}),
        },
      ];
    });
    return resolvedIndex;
  }, [days]);

  const removeDay = useCallback((index: number) => {
    setDays((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, label: `Day ${i + 1}` }));
    });
  }, []);

  /** Swaps a day with its neighbor - only the day order changes, every
   *  day keeps its own stops, accommodation, etc. Labels are re-derived
   *  from position afterwards, same as removeDay already does. */
  const moveDay = useCallback((index: number, direction: -1 | 1) => {
    setDays((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((d, i) => ({ ...d, label: `Day ${i + 1}` }));
    });
    setCurrentDayIndex((prevIndex) => {
      if (prevIndex === index) return index + direction;
      if (prevIndex === index + direction) return index;
      return prevIndex;
    });
  }, []);

  const addStop = useCallback((dayIndex: number, distillery: Distillery, anchor?: boolean) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex && !day.stops.some((s) => stopId(s) === distillery.slug)
          ? { ...day, stops: [...day.stops, { kind: "distillery" as const, distillery, ...(anchor ? { anchor: true } : {}) }] }
          : day
      )
    );
  }, []);

  const addFeatureStop = useCallback((dayIndex: number, feature: LocalFeature) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex && !day.stops.some((s) => stopId(s) === feature.id)
          ? { ...day, stops: [...day.stops, { kind: "feature" as const, feature }] }
          : day
      )
    );
  }, []);

  const removeStop = useCallback((dayIndex: number, id: string) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex ? { ...day, stops: day.stops.filter((s) => stopId(s) !== id) } : day
      )
    );
  }, []);

  /** See TripContextValue.shortlist - dedupes the same way addStop/
   *  addFeatureStop already do for a day's own stops. */
  const addDistilleryToShortlist = useCallback((distillery: Distillery) => {
    setShortlist((prev) =>
      prev.some((s) => stopId(s) === distillery.slug) ? prev : [...prev, { kind: "distillery" as const, distillery }]
    );
  }, []);

  const addFeatureToShortlist = useCallback((feature: LocalFeature) => {
    setShortlist((prev) => (prev.some((s) => stopId(s) === feature.id) ? prev : [...prev, { kind: "feature" as const, feature }]));
  }, []);

  const removeFromShortlist = useCallback((id: string) => {
    setShortlist((prev) => prev.filter((s) => stopId(s) !== id));
  }, []);

  /** Swaps a stop with its neighbor in either direction - lets a visitor
   *  fix the order of a day without deleting and re-adding stops (which
   *  also loses any tour already picked for that stop). */
  const moveStop = useCallback((dayIndex: number, stopIndex: number, direction: -1 | 1) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const target = stopIndex + direction;
        if (target < 0 || target >= day.stops.length) return day;
        const stops = [...day.stops];
        [stops[stopIndex], stops[target]] = [stops[target], stops[stopIndex]];
        return { ...day, stops };
      })
    );
  }, []);

  const setStopMinutes = useCallback((dayIndex: number, id: string, minutes: number) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex
          ? { ...day, stops: day.stops.map((s) => (stopId(s) === id ? { ...s, customMinutes: minutes } : s)) }
          : day
      )
    );
  }, []);

  const setStopNote = useCallback((dayIndex: number, id: string, note: string) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex
          ? { ...day, stops: day.stops.map((s) => (stopId(s) === id ? { ...s, note } : s)) }
          : day
      )
    );
  }, []);

  const setTourForStop = useCallback((dayIndex: number, distillery: Distillery, tour: Tour | undefined) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const exists = day.stops.some((s) => s.kind === "distillery" && s.distillery.slug === distillery.slug);
        const stops = exists
          ? day.stops.map((s) =>
              s.kind === "distillery" && s.distillery.slug === distillery.slug ? { ...s, tour } : s
            )
          : [...day.stops, { kind: "distillery" as const, distillery, tour }];
        return { ...day, stops };
      })
    );
  }, []);

  const findStopDays = useCallback(
    (distillerySlug: string) => {
      return days
        .map((day, i) =>
          day.stops.some((s) => s.kind === "distillery" && s.distillery.slug === distillerySlug) ? i : -1
        )
        .filter((i) => i !== -1);
    },
    [days]
  );

  const setAccommodation = useCallback((dayIndex: number, accommodation: TripAccommodation | undefined) => {
    setDays((prev) => prev.map((day, i) => (i === dayIndex ? { ...day, accommodation } : day)));
  }, []);

  const setAccommodationFromDay = useCallback(
    (dayIndex: number, accommodation: TripAccommodation, scope: "all" | "fromHere") => {
      setDays((prev) =>
        prev.map((day, i) => ((scope === "all" || i >= dayIndex) ? { ...day, accommodation } : day))
      );
    },
    []
  );

  const setAnswersBase = useCallback(
    (base: string, baseKind: "hotel" | "area", accommodation: TripAccommodation) => {
      setAnswers((prev) => ({
        timeframe: prev?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe,
        base,
        baseKind,
        nights: prev?.nights ?? DEFAULT_TRIP_ANSWERS.nights,
        picks: prev?.picks ?? DEFAULT_TRIP_ANSWERS.picks,
        dreamArea: prev?.dreamArea ?? DEFAULT_TRIP_ANSWERS.dreamArea,
        todayNear: prev?.todayNear ?? DEFAULT_TRIP_ANSWERS.todayNear,
      todayPoint: prev?.todayPoint,
      todayPointSource: prev?.todayPointSource,
      }));
      // Keeps the stated answer and the actual itinerary in sync (per
      // the design doc's §2.2) - a no-op if day 0 doesn't exist yet
      // (nothing to sync to), same as any other setAccommodationFromDay
      // call before a trip has been started.
      setAccommodationFromDay(0, accommodation, "all");
    },
    [setAccommodationFromDay]
  );

  const setAnswersNights = useCallback((nights: number) => {
    setAnswers((prev) => ({
      timeframe: prev?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe,
      base: prev?.base ?? DEFAULT_TRIP_ANSWERS.base,
      baseKind: prev?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind,
      nights,
      picks: prev?.picks ?? DEFAULT_TRIP_ANSWERS.picks,
      dreamArea: prev?.dreamArea ?? DEFAULT_TRIP_ANSWERS.dreamArea,
      todayNear: prev?.todayNear ?? DEFAULT_TRIP_ANSWERS.todayNear,
      todayPoint: prev?.todayPoint,
      todayPointSource: prev?.todayPointSource,
    }));
  }, []);

  const setAnswersPicks = useCallback((picks: string[]) => {
    setAnswers((prev) => ({
      timeframe: prev?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe,
      base: prev?.base ?? DEFAULT_TRIP_ANSWERS.base,
      baseKind: prev?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind,
      nights: prev?.nights ?? DEFAULT_TRIP_ANSWERS.nights,
      picks,
      dreamArea: prev?.dreamArea ?? DEFAULT_TRIP_ANSWERS.dreamArea,
      todayNear: prev?.todayNear ?? DEFAULT_TRIP_ANSWERS.todayNear,
      todayPoint: prev?.todayPoint,
      todayPointSource: prev?.todayPointSource,
    }));
  }, []);

  const setAnswersTimeframe = useCallback((timeframe: Timeframe) => {
    setAnswers((prev) => ({
      timeframe,
      base: prev?.base ?? DEFAULT_TRIP_ANSWERS.base,
      baseKind: prev?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind,
      nights: prev?.nights ?? DEFAULT_TRIP_ANSWERS.nights,
      picks: prev?.picks ?? DEFAULT_TRIP_ANSWERS.picks,
      dreamArea: prev?.dreamArea ?? DEFAULT_TRIP_ANSWERS.dreamArea,
      todayNear: prev?.todayNear ?? DEFAULT_TRIP_ANSWERS.todayNear,
      todayPoint: prev?.todayPoint,
      todayPointSource: prev?.todayPointSource,
    }));
  }, []);

  const setAnswersDreamArea = useCallback((dreamArea: string) => {
    setAnswers((prev) => ({
      timeframe: prev?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe,
      base: prev?.base ?? DEFAULT_TRIP_ANSWERS.base,
      baseKind: prev?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind,
      nights: prev?.nights ?? DEFAULT_TRIP_ANSWERS.nights,
      picks: prev?.picks ?? DEFAULT_TRIP_ANSWERS.picks,
      dreamArea,
      todayNear: prev?.todayNear ?? DEFAULT_TRIP_ANSWERS.todayNear,
      todayPoint: prev?.todayPoint,
      todayPointSource: prev?.todayPointSource,
    }));
  }, []);

  const setAnswersTodayNear = useCallback((todayNear: string) => {
    setAnswers((prev) => ({
      timeframe: prev?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe,
      base: prev?.base ?? DEFAULT_TRIP_ANSWERS.base,
      baseKind: prev?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind,
      nights: prev?.nights ?? DEFAULT_TRIP_ANSWERS.nights,
      picks: prev?.picks ?? DEFAULT_TRIP_ANSWERS.picks,
      dreamArea: prev?.dreamArea ?? DEFAULT_TRIP_ANSWERS.dreamArea,
      todayNear,
      // Picking a village is an explicit answer, so it replaces a pin
      // rather than sitting behind one. The two are mutually exclusive.
      todayPoint: undefined,
      todayPointSource: undefined,
    }));
  }, []);

  const setAnswersTodayPoint = useCallback((todayPoint: { lat: number; lng: number }, source: "device" | "pin") => {
    setAnswers((prev) => ({
      timeframe: prev?.timeframe ?? DEFAULT_TRIP_ANSWERS.timeframe,
      base: prev?.base ?? DEFAULT_TRIP_ANSWERS.base,
      baseKind: prev?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind,
      nights: prev?.nights ?? DEFAULT_TRIP_ANSWERS.nights,
      picks: prev?.picks ?? DEFAULT_TRIP_ANSWERS.picks,
      dreamArea: prev?.dreamArea ?? DEFAULT_TRIP_ANSWERS.dreamArea,
      todayNear: prev?.todayNear ?? DEFAULT_TRIP_ANSWERS.todayNear,
      todayPoint,
      todayPointSource: source,
    }));
  }, []);

  const setHeroRevealed = useCallback((revealed: boolean) => {
    setHeroRevealedState(revealed);
  }, []);

  return (
    <TripContext.Provider
      value={{
        days,
        currentDayIndex,
        setCurrentDayIndex,
        mapView,
        setMapView,
        tripDates,
        setDateMode,
        setDateRange,
        setDateMonth,
        intake,
        ready,
        initDays,
        syncDayCount,
        completeIntake,
        resetTrip,
        addDay,
        removeDay,
        moveDay,
        addStop,
        addFeatureStop,
        removeStop,
        shortlist,
        addDistilleryToShortlist,
        addFeatureToShortlist,
        removeFromShortlist,
        moveStop,
        setStopMinutes,
        setStopNote,
        setTourForStop,
        findStopDays,
        setAccommodation,
        setAccommodationFromDay,
        answers,
        setAnswersBase,
        setAnswersNights,
        setAnswersPicks,
        setAnswersTimeframe,
        setAnswersDreamArea,
        setAnswersTodayNear,
        setAnswersTodayPoint,
        snapshot: { days, intake, currentDayIndex, mapView, tripDates, answers, heroRevealed, shortlist },
        replaceTrip: applyStoredTrip,
        activeTripId,
        setActiveTrip,
        heroRevealed,
        setHeroRevealed,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
