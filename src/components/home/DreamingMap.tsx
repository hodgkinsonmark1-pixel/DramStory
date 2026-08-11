"use client";

import { useEffect, useRef } from "react";
import type Leaflet from "leaflet";
import type { Distillery, LocalFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";

/**
 * Dreaming's mobile-only permanent-pin map (11 Aug 2026, Mark's request
 * after his live mobile review). Deliberately a SEPARATE, smaller
 * component rather than reusing MapCanvas.tsx (the real journey/day
 * builder's map) - MapCanvas's marker layer is built once at mount and
 * relies on a whole mount-once/route-fit/sheet-padding effect structure
 * tuned for day-by-day itinerary editing, none of which applies here
 * (no days, no route, no accommodation pin). Reusing it would mean
 * either fighting that structure or risking a regression in the
 * already-shipped day builder for the sake of one simpler screen.
 * Building fresh here keeps this genuinely simple and keeps MapCanvas
 * untouched.
 *
 * No clustering (unlike MapCanvas) - acceptable for a first pass at this
 * pin count (11 distilleries + a modest Natural Features/Local
 * Attractions set), revisit if it gets crowded once Local Events/more
 * content is added.
 */

const MAP_BOUNDS: [[number, number], [number, number]] = [
  [55.51, -6.62],
  [56.02, -5.62],
];

const FEATURE_COLORS: Partial<Record<LocalFeature["category"], string>> = {
  beach: "#D4A574",
  walk: "#2D6A4F",
  "bike-route": "#3A6EA5",
  "local-gem": "#8B5FBF",
  "historic-site": "#8B6F47",
  "attraction-gem": "#B8557A",
  golf: "#4A7A4A",
  spa: "#C77DA6",
  transport: "#5C7A99",
};

export interface DreamingMapTap {
  kind: "distillery" | "feature";
  id: string;
  name: string;
}

export default function DreamingMap({
  distilleries,
  localFeatures,
  center,
  shortlistedIds,
  onTap,
}: {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  center: { lat: number; lng: number };
  shortlistedIds: Set<string>;
  onTap: (target: DreamingMapTap) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.Marker[]>([]);
  // Read once at mount - re-centering on every render would fight the
  // visitor's own panning, same reasoning MapCanvas's initialViewRef
  // comment gives.
  const centerRef = useRef(center);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [centerRef.current.lat, centerRef.current.lng],
        zoom: 12,
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 0.9,
        minZoom: 9,
      });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
    }
    init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuilds every marker whenever the pin set or shortlist state
  // changes - simple full-rebuild rather than diffing individual
  // markers, fine at this pin count.
  useEffect(() => {
    let cancelled = false;
    async function rebuild() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];

      function icon(bg: string, emoji: string, shortlisted: boolean) {
        const ring = shortlisted ? "box-shadow:0 0 0 3px var(--amber,#C4862A);" : "";
        return L.divIcon({
          className: "dreaming-map-marker",
          html: `<div style="background:${bg};color:white;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;${ring}"><span style="transform:rotate(45deg);font-size:13px">${shortlisted ? "&check;" : emoji}</span></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });
      }

      for (const d of distilleries) {
        if (!d.lat || !d.lng) continue;
        const marker = L.marker([d.lat, d.lng], { icon: icon("#1A3A4A", "🥃", shortlistedIds.has(d.slug)) });
        marker.on("click", () => onTapRef.current({ kind: "distillery", id: d.slug, name: d.name }));
        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      }
      for (const f of localFeatures) {
        if (!f.lat || !f.lng) continue;
        const marker = L.marker([f.lat, f.lng], {
          icon: icon(FEATURE_COLORS[f.category] ?? "#8B6F47", "📍", shortlistedIds.has(f.id)),
        });
        marker.on("click", () => onTapRef.current({ kind: "feature", id: f.id, name: f.name }));
        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      }
    }
    rebuild();
    return () => {
      cancelled = true;
    };
  }, [distilleries, localFeatures, shortlistedIds]);

  return <div ref={containerRef} style={{ width: "100%", height: 320, borderRadius: 12, overflow: "hidden" }} />;
}
