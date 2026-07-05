"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Distillery, ItineraryDay, Tour } from "@/lib/types";

const STORAGE_KEY = "dramstory-trip-v1";

interface TripContextValue {
  days: ItineraryDay[];
  /** True once the saved trip has been read from localStorage - avoids a
   *  flash of "no days yet" before hydration catches up. */
  ready: boolean;
  initDays: (count: number) => void;
  addDay: () => void;
  removeDay: (index: number) => void;
  addStop: (dayIndex: number, distillery: Distillery) => void;
  removeStop: (dayIndex: number, distillerySlug: string) => void;
  /** Sets (or clears, if tour is undefined) the specific tour booked for a
   *  distillery on a given day - this is what "+ Add to Journey" on a
   *  distillery's own tour cards writes to. If the distillery isn't on
   *  that day yet, it's added. */
  setTourForStop: (dayIndex: number, distillery: Distillery, tour: Tour | undefined) => void;
  /** Finds every day a distillery currently appears on - used by the
   *  distillery page to show "already in your journey" state. */
  findStopDays: (distillerySlug: string) => number[];
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setDays(JSON.parse(raw));
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    } catch {
      // Storage full or unavailable - the trip still works for this
      // session, it just won't survive a reload.
    }
  }, [days, ready]);

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
        i === dayIndex && !day.stops.some((s) => s.distillery.slug === distillery.slug)
          ? { ...day, stops: [...day.stops, { distillery }] }
          : day
      )
    );
  }, []);

  const removeStop = useCallback((dayIndex: number, distillerySlug: string) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex ? { ...day, stops: day.stops.filter((s) => s.distillery.slug !== distillerySlug) } : day
      )
    );
  }, []);

  const setTourForStop = useCallback((dayIndex: number, distillery: Distillery, tour: Tour | undefined) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const exists = day.stops.some((s) => s.distillery.slug === distillery.slug);
        const stops = exists
          ? day.stops.map((s) => (s.distillery.slug === distillery.slug ? { ...s, tour } : s))
          : [...day.stops, { distillery, tour }];
        return { ...day, stops };
      })
    );
  }, []);

  const findStopDays = useCallback(
    (distillerySlug: string) => {
      return days
        .map((day, i) => (day.stops.some((s) => s.distillery.slug === distillerySlug) ? i : -1))
        .filter((i) => i !== -1);
    },
    [days]
  );

  return (
    <TripContext.Provider
      value={{ days, ready, initDays, addDay, removeDay, addStop, removeStop, setTourForStop, findStopDays }}
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
