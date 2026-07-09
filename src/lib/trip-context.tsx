"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Distillery, ItineraryDay, LocalFeature, Tour, TripAccommodation, TripIntake, TripMapView } from "@/lib/types";
import { stopId } from "@/lib/itinerary-stop";

const STORAGE_KEY = "dramstory-trip-v2";

interface StoredTrip {
  days: ItineraryDay[];
  intake: TripIntake | null;
  currentDayIndex: number;
  mapView: TripMapView | null;
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
  /** The completed Q2/Step3/Q4 answers, once the visitor has been through
   *  the intake flow at least once - lets "Back to your journey" (from a
   *  distillery page) jump straight to the workspace instead of
   *  restarting the questions, since this is what was previously missing. */
  intake: TripIntake | null;
  /** True once the saved trip has been read from localStorage - avoids a
   *  flash of "no days yet" before hydration catches up. */
  ready: boolean;
  initDays: (count: number) => void;
  completeIntake: (intake: TripIntake) => void;
  /** Clears the saved trip and intake entirely - used by "Start over". */
  resetTrip: () => void;
  addDay: () => void;
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
  /** Sets (or clears, if tour is undefined) the specific tour booked for a
   *  distillery on a given day - this is what "+ Add to Journey" on a
   *  distillery's own tour cards writes to. If the distillery isn't on
   *  that day yet, it's added. */
  setTourForStop: (dayIndex: number, distillery: Distillery, tour: Tour | undefined) => void;
  /** Finds every day a distillery currently appears on - used by the
   *  distillery page to show "already in your journey" state. */
  findStopDays: (distillerySlug: string) => number[];
  /** Sets (or clears, if undefined) where a day starts/ends - see
   *  TripAccommodation for why this is a place, not a booking. */
  setAccommodation: (dayIndex: number, accommodation: TripAccommodation | undefined) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [intake, setIntake] = useState<TripIntake | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [mapView, setMapView] = useState<TripMapView | null>(null);
  const [ready, setReady] = useState(false);

  // Reads localStorage after mount rather than in a lazy useState
  // initializer deliberately: the server always renders an empty trip
  // (no localStorage there), so if the client's very first render already
  // showed the stored trip, that would be a server/client hydration
  // mismatch. Updating state from an effect after mount is the standard,
  // safe way to hydrate this kind of client-only persisted data.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredTrip = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDays(parsed.days ?? []);
        setIntake(parsed.intake ?? null);
        setCurrentDayIndex(parsed.currentDayIndex ?? 0);
        setMapView(parsed.mapView ?? null);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, intake, currentDayIndex, mapView }));
    } catch {
      // Storage full or unavailable - the trip still works for this
      // session, it just won't survive a reload.
    }
  }, [days, intake, currentDayIndex, mapView, ready]);

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

  const completeIntake = useCallback((newIntake: TripIntake) => {
    setIntake(newIntake);
  }, []);

  const resetTrip = useCallback(() => {
    setDays([]);
    setIntake(null);
    setCurrentDayIndex(0);
    setMapView(null);
  }, []);

  const addDay = useCallback(() => {
    setDays((prev) => [...prev, { id: `day-${prev.length + 1}`, label: `Day ${prev.length + 1}`, stops: [] }]);
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

  return (
    <TripContext.Provider
      value={{
        days,
        currentDayIndex,
        setCurrentDayIndex,
        mapView,
        setMapView,
        intake,
        ready,
        initDays,
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
        setTourForStop,
        findStopDays,
        setAccommodation,
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
