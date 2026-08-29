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
export default function JourneyRouteMap({ stops, base }: JourneyRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);

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

      for (const stop of mappable) {
        L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:${navy};color:${white};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${white};box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:11px;font-weight:700">${stop.dayNumber}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .bindTooltip(`Day ${stop.dayNumber} - ${stop.name}`, { direction: "top", offset: [0, -12] })
          .addTo(map);
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

      const points: [number, number][] = [
        ...mappable.map((s) => [s.lat, s.lng] as [number, number]),
        ...(base ? [[base.lat, base.lng] as [number, number]] : []),
      ];
      if (points.length === 0) return;
      if (points.length === 1) {
        map.setView(points[0], 12);
        return;
      }
      map.fitBounds(L.latLngBounds(points), { padding: [26, 26] });
    }

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="jr-map-canvas" />;
}
