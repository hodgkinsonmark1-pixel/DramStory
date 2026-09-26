"use client";

import { useEffect, useRef } from "react";
import type Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export interface RouteMapStop {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  /** The day number this stop belongs to - the pin's own label, so the
   *  map reads against the day spine beside it rather than needing a
   *  separate key. Several stops share a number on a multi-stop day. */
  dayNumber: number;
}

interface JourneyRouteMapProps {
  stops: RouteMapStop[];
  /** Where the visitor sleeps, marked with a distinct white pin. Omitted
   *  entirely when the Journey's Base has no real Area record behind it
   *  (Bridgend, as of 13 Aug 2026) - coordinates are never estimated for
   *  a village here, per content-sourcing-standards.md. */
  base?: { name: string; lat: number; lng: number };
  /** The day the map should be showing (16 Sep 2026). Its stops are
   *  framed and drawn full strength; the rest of the route stays on the
   *  map, dimmed, so you keep the shape of the whole trip while reading
   *  one day of it. Undefined frames the entire route, which is what this
   *  map did before. */
  focusDay?: number;
}

/**
 * NEW 13 Aug 2026 - the whole-journey route map in the /journeys/[slug]
 * sidebar. Deliberately a third, static map rather than a variant of
 * either existing one, as the design brief called for:
 *
 *  - JourneyDayMap is single-day and route-drawing (it fetches OSRM road
 *    geometry between one day's stops from one base) - the whole-journey
 *    view spans days that are NOT driven in one run, so drawing road
 *    geometry across them would show a route nobody actually takes.
 *  - MapCanvas is the live trip-editor: clustering, several pin
 *    categories, drag/drop, TripContext. None of that applies to a
 *    read-only summary panel, and pulling it in would drag the planner's
 *    whole module graph onto a content page.
 *
 * So this is the minimum honest thing: every stop across every day,
 * numbered to match its day, plus the bed. No scroll-wheel zoom (it sits
 * mid-page), no routing, no popups beyond the name - the day-by-day
 * detail is the spine to its left, not this.
 *
 * Marker colours are read off the real CSS custom properties at runtime
 * rather than hardcoded, since Leaflet's divIcon HTML is built as a
 * string and can't inherit them - keeps this consistent with
 * docs/hero-handoff.md section 5's "no literal hexes" rule even inside
 * the generated markup.
 */
export default function JourneyRouteMap({ stops, base, focusDay }: JourneyRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  /** Set once the map exists, so the focus effect below can reframe
   *  without re-running the whole init. */
  const frameRef = useRef<((day: number | undefined) => void) | null>(null);
  /** Refitting the whole trip. Separate from `frame` since 26 Sep 2026,
   *  when stepping a day stopped moving the view: only a container resize
   *  reframes now, and it needs a handle on the fit alone. */
  const fitWholeRef = useRef<(() => void) | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  /* The init effect closes over the first render's props and never runs
     again, so the ResizeObserver inside it would reframe on a stale day
     forever. It reads the day through this instead. */
  const focusDayRef = useRef<number | undefined>(focusDay);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const token = (name: string, fallback: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      const navy = token("--navy", "#1A3A4A");
      const stone = token("--stone", "#E8E2D6");
      const white = token("--white", "#FFFFFF");

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const mappable = stops.filter((s) => !!s.lat && !!s.lng);

      /** Pin markers by day, so reframing can dim the ones that are not
       *  the day being read without rebuilding the whole layer. */
      const markersByDay = new Map<number, Leaflet.Marker[]>();

      for (const stop of mappable) {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:${navy};color:${white};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${white};box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:11px;font-weight:700">${stop.dayNumber}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .bindTooltip(`Day ${stop.dayNumber} - ${stop.name}`, { direction: "top", offset: [0, -12] })
          .addTo(map);
        const list = markersByDay.get(stop.dayNumber) ?? [];
        list.push(marker);
        markersByDay.set(stop.dayNumber, list);
      }

      if (base) {
        L.marker([base.lat, base.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:${white};width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid ${stone};box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 22],
          }),
          zIndexOffset: 500,
        })
          .bindTooltip(`${base.name} - where you sleep`, { direction: "top", offset: [0, -20] })
          .addTo(map);
      }

      const allPoints: [number, number][] = [
        ...mappable.map((s) => [s.lat, s.lng] as [number, number]),
        ...(base ? [[base.lat, base.lng] as [number, number]] : []),
      ];
      if (allPoints.length === 0) return;

      /* THE FRAME NO LONGER MOVES (26 Sep 2026, Mark's call).
       *
       * It used to fit the map to each day's own stops, so stepping from
       * day one to day two re-centred and re-zoomed. Both maps were
       * correct and the sequence was unreadable: every step looked like a
       * different island, and you lost where you were between one day and
       * the next. Mark, flicking through them: "I'd like each to stay a
       * separate day, but the day to be more intuitive when flicking
       * through them."
       *
       * So the map is fitted ONCE to the whole trip - every stop plus the
       * base - and stepping days only changes which pins are lit. Nothing
       * pans, nothing zooms, and today's stops are read against a picture
       * of the island that has not moved since you arrived. The shape of
       * the trip comes free, which is the thing a single day's frame
       * could never show.
       *
       * The cost, stated honestly: a day whose stops sit close together
       * gets less zoom than it would have alone. That is the trade - a
       * fixed reference beats a tight crop, because the question this
       * panel answers is "where on the island am I today", and that is
       * only answerable relative to the rest of it. */
      function fitWhole() {
        if (allPoints.length === 1) {
          map.setView(allPoints[0], 12);
          return;
        }
        /* maxZoom still matters at the whole-trip level: a two-stop
         * journey a mile apart would otherwise fit its bounds at zoom 17
         * and show a car park rather than an island. */
        map.fitBounds(L.latLngBounds(allPoints), { padding: [26, 26], maxZoom: 13 });
      }

      /** Light today, dim the rest. No view change - see above. */
      function frame(day: number | undefined) {
        for (const [dayNumber, markers] of markersByDay) {
          const dim = day !== undefined && dayNumber !== day;
          for (const marker of markers) marker.setOpacity(dim ? 0.3 : 1);
        }
      }

      frameRef.current = frame;
      fitWholeRef.current = fitWhole;
      fitWhole();
      frame(focusDayRef.current);

      /* THE MAP USED TO COME OUT SHOWING HALF OF EUROPE, INTERMITTENTLY.
         This is why (16 Sep 2026).

         The canvas is `width: 100%` inside the sticky rail, which is a
         CSS grid child. Leaflet measures its container once, when the map
         is created. If that happens before the grid has settled to its
         real width - which depends on fonts and on the images further up
         the page - it fits the route into a container a few pixels wide,
         which means zooming out until Islay is a dot. Nothing corrected
         it afterwards, because the init effect runs once and there was no
         invalidateSize anywhere in the component.

         A ResizeObserver fixes the whole class of problem rather than the
         one instance: any later change in the container's size - layout
         settling, a window resize, the rail switching to the mobile band
         at a breakpoint - re-measures and reframes. */
      const observer = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
        /* Re-fit rather than re-highlight. Since 26 Sep the day change no
           longer touches the view, so a resize is the only thing left
           that has to reframe - and it must, because a container that has
           changed size needs its bounds fitting again or the route drifts
           out of the panel. */
        fitWholeRef.current?.();
      });
      if (containerRef.current) observer.observe(containerRef.current);
      observerRef.current = observer;
    }

    init();

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      frameRef.current = null;
      fitWholeRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Reframe when the day being read changes. Separate from init on
     purpose: rebuilding the map on every scrolled day would tear down and
     recreate a Leaflet instance several times a page. */
  useEffect(() => {
    focusDayRef.current = focusDay;
    frameRef.current?.(focusDay);
  }, [focusDay]);

  return <div ref={containerRef} className="jr-map-canvas" />;
}
