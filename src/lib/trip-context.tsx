"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Distillery, ItineraryDay, LocalFeature, Tour, TripAccommodation, TripIntake } from "@/lib/types";
import { stopId } from "@/lib/itinerary-stop";

const STORAGE_KEY = "dramstory-trip-v2";

interface StoredTrip {
  days: ItineraryDay[];
  intake: TripIntake | null;
}

interface TripContextValue {
  days: ItineraryDay[];
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
  addStop: (dayIndex: number, distillery: Distillery) => void;
  /** Adds a Natural Feature (beach/walk/bike route/local gem) as a stop -
   *  the map popup's "+ Add to Trip" button for these. */
  addFeatureStop: (dayIndex: number, feature: LocalFeature) => void;
  /** Removes any stop (distillery or feature) by its stopId(). */
  removeStop: (dayIndex: number, id: string) => void;
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, intake }));
    } catch {
      // Storage full or unavailable - the trip still works for this
      // session, it just won't survive a reload.
    }
  }, [days, intake, ready]);

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
        intake,
        ready,
        initDays,
        completeIntake,
        resetTrip,
        addDay,
        removeDay,
        addStop,
        addFeatureStop,
        removeStop,
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
