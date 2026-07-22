"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Distillery, ItineraryDay, LocalFeature, Tour, TripAccommodation, TripDateMode, TripDates, TripIntake, TripMapView } from "@/lib/types";
import { stopId } from "@/lib/itinerary-stop";
import { FEATURED_STAYS } from "@/lib/featured-stays";

const STORAGE_KEY = "dramstory-trip-v2";

/** Untouched default - "confirmed: false" keeps anything date-dependent
 *  (weather popup, calendar-date day labels, Local Events pins) hidden
 *  until the visitor actually interacts with the header date control.
 *  Deliberately blank (not pre-filled with today) so the header's date
 *  inputs render empty on first arrival, rather than looking like a
 *  choice has already silently been made for the visitor. */
function defaultTripDates(): TripDates {
  return { mode: "range", startDate: "", endDate: "", month: "", confirmed: false };
}

interface StoredTrip {
  days: ItineraryDay[];
  intake: TripIntake | null;
  currentDayIndex: number;
  mapView: TripMapView | null;
  tripDates: TripDates | null;
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
   *  an ordinary "+ Add day" from the workspace toolbar. */
  addDay: (sourceHubDaySlug?: string) => void;
  removeDay: (index: number) => void;
  /** Moves a day earlier/later in the trip without touching what's inside
   *  it - re-labels every day by its new position afterwards (labels are
   *  positional, e.g. "Day 2", not a fixed identity) and moves
   *  currentDayIndex along with the day being reordered so the visitor's
   *  view follows it rather than jumping to whatever now sits at the old
   *  index. */
  moveDay: (index: number, direction: -1 | 1) => void;
  addStop: (dayIndex: number, distillery: Distillery) => void;
  /** Adds a Natural Feature (beach/walk/bike route/local gem) as a stop -
   *  the map popup's "+ Add to Trip" button for these. */
  addFeatureStop: (dayIndex: number, feature: LocalFeature) => void;
  /** Removes any stop (distillery or feature) by its stopId(). */
  removeStop: (dayIndex: number, id: string) => void;
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
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [intake, setIntake] = useState<TripIntake | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [mapView, setMapView] = useState<TripMapView | null>(null);
  const [tripDates, setTripDates] = useState<TripDates>(defaultTripDates);
  const [ready, setReady] = useState(false);

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
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        applyStoredTrip(JSON.parse(raw));
      }
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, intake, currentDayIndex, mapView, tripDates }));
    } catch {
      // Storage full or unavailable - the trip still works for this
      // session, it just won't survive a reload.
    }
  }, [days, intake, currentDayIndex, mapView, tripDates, ready]);

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

  const addDay = useCallback((sourceHubDaySlug?: string) => {
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
  }, []);

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

  const addStop = useCallback((dayIndex: number, distillery: Distillery) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex && !day.stops.some((s) => stopId(s) === distillery.slug)
          ? { ...day, stops: [...day.stops, { kind: "distillery" as const, distillery }] }
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
      prev.map((day, i) => (i === dayIndex ? { ...day, stops: day.stops.filter((s) => stopId(s) !== id) } : day))
    );
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
        i === dayIndex ? { ...day, stops: day.stops.map((s) => (stopId(s) === id ? { ...s, note } : s)) } : day
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
        moveStop,
        setStopMinutes,
        setStopNote,
        setTourForStop,
        findStopDays,
        setAccommodation,
        setAccommodationFromDay,
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
