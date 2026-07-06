"use client";

import { useEffect, useRef, useState } from "react";
import type Leaflet from "leaflet";
import type { Distillery, LocalFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface MapCanvasProps {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  isLive: boolean;
  onAddDistillery?: (slug: string) => void;
  /** Ordered lat/lng points along the current day's real route (from OSRM,
   *  or straight-line fallback per segment) - drawn as a route line with a
   *  white casing for visibility against busy map tiles. Styling was
   *  originally an exact match to the mockup (#C4862A, weight 3, dashArray
   *  "1,8") but that was tuned for a short straight demo line; a real,
   *  winding road route needed a bolder treatment to stay legible. */
  routeStops?: { lat: number; lng: number }[];
}

// Rough center of Scotland, used when a region has no pins yet so the map
// doesn't default to (0,0) in the Atlantic.
const SCOTLAND_CENTER: [number, number] = [56.8, -4.2];
const ISLAY_CENTER: [number, number] = [55.75, -6.2];

// Distinct color per Natural Feature category, so pins read at a glance
// without needing to open a popup - kept apart from the navy distillery
// markers and the copper route line.
const FEATURE_COLORS: Record<LocalFeature["category"], string> = {
  beach: "#D4A574",
  walk: "#2D6A4F",
  "bike-route": "#3A6EA5",
  "local-gem": "#8B5FBF",
};

/**
 * Renders the actual interactive map using Leaflet + OpenStreetMap tiles.
 * Deliberately NOT Google Maps - that was ruled out earlier over usage-cost
 * risk. Leaflet is free and open-source with no API key or billing account
 * required at all, so this isn't blocked by the Places verification issue.
 *
 * Leaflet touches `window` on import, so it's dynamically imported inside
 * useEffect (client-only) rather than statically at the top of the file -
 * a static import would break server rendering.
 *
 * Popups are plain HTML strings (Leaflet's own API, not React), so the
 * "+ Add" button is wired up via one delegated click listener on the map
 * container reading a data-add-distillery attribute, rather than a normal
 * onClick handler.
 */
export default function MapCanvas({ distilleries, localFeatures, isLive, onAddDistillery, routeStops = [] }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const routeLineRef = useRef<Leaflet.LayerGroup | null>(null);
  const featureLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onAddRef = useRef(onAddDistillery);
  useEffect(() => {
    onAddRef.current = onAddDistillery;
  }, [onAddDistillery]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: isLive && distilleries.length > 0 ? ISLAY_CENTER : SCOTLAND_CENTER,
        zoom: isLive && distilleries.length > 0 ? 11 : 7,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Simple brand-colored dot marker instead of Leaflet's default pin -
      // sidesteps the well-known bundler icon-path issue and matches the
      // site's whisky-glass emoji used elsewhere for distilleries.
      const distilleryIcon = L.divIcon({
        className: "distillery-marker",
        html: `<div style="background:var(--navy,#1A3A4A);color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);font-size:14px">🥃</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const markers: Leaflet.Marker[] = [];
      for (const d of distilleries) {
        if (!d.lat || !d.lng) continue;
        const marker = L.marker([d.lat, d.lng], { icon: distilleryIcon }).addTo(map);
        marker.bindPopup(
          `<div class="popup-inner">
            <div class="popup-tag">${d.style || "Distillery"}</div>
            <div class="popup-name">${d.name}</div>
            <div class="popup-region">${d.region}${d.founded ? ` &middot; Est. ${d.founded}` : ""}</div>
            <div class="popup-detail">${d.tagline}</div>
            <div class="popup-actions">
              <a class="popup-btn popup-btn-secondary" href="/distilleries/${d.slug}">View &rarr;</a>
              <button class="popup-btn popup-btn-primary" data-add-distillery="${d.slug}">+ Add</button>
            </div>
          </div>`,
          { minWidth: 240 }
        );
        markers.push(marker);
      }

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
        // One level more zoomed in than the pure fitBounds fit, per request.
        map.setZoom(map.getZoom() + 1);
      }

      // Event delegation for the +Add button inside popup HTML - Leaflet
      // popups aren't React, so there's no onClick to hook into directly.
      map.getContainer().addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest("[data-add-distillery]");
        if (target) {
          const slug = target.getAttribute("data-add-distillery");
          if (slug) onAddRef.current?.(slug);
        }
      });

      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraws the dashed route line whenever the itinerary's stop order
  // changes. Separate from the mount-once init effect above since this
  // needs to re-run on every add/remove/reorder, not just once.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (routeStops.length >= 2) {
      const latLngs: [number, number][] = routeStops.map((s) => [s.lat, s.lng]);

      // Casing technique (same idea Google/Citymapper use): a wider, solid
      // white/pale line drawn first so the route pops against busy map
      // tiles (roads, water, labels) regardless of what's underneath -
      // the thin dotted line on its own was hard to spot on a real,
      // winding road route rather than a short straight demo line.
      const casing = L.polyline(latLngs, {
        color: "#FFFFFF",
        weight: 7,
        opacity: 0.9,
      });
      const routeLine = L.polyline(latLngs, {
        color: "#C4862A",
        weight: 4,
        dashArray: "10,8",
        opacity: 1,
        lineCap: "round",
      });

      routeLineRef.current = L.layerGroup([casing, routeLine]).addTo(map);
    }
  }, [mapReady, routeStops]);

  // Redraws Natural Feature pins whenever the visible list changes (a
  // filter toggle in the map toolbar, not a one-time mount). Separate from
  // the distillery markers (which are static after mount) since these
  // genuinely change as the visitor toggles Beaches/Walks/Bike Rides/Local
  // Gems on and off.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (featureLayerRef.current) {
      featureLayerRef.current.remove();
      featureLayerRef.current = null;
    }

    if (localFeatures.length === 0) return;

    const markers = localFeatures.map((f) => {
      const color = FEATURE_COLORS[f.category];
      const icon = L.divIcon({
        className: "feature-marker",
        html: `<div style="background:${color};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:13px">${f.icon}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13],
      });
      const marker = L.marker([f.lat, f.lng], { icon });
      marker.bindPopup(
        `<div class="popup-inner">
          <div class="popup-name">${f.name}</div>
          <div class="popup-detail">${f.description}</div>
        </div>`,
        { minWidth: 200 }
      );
      return marker;
    });

    featureLayerRef.current = L.layerGroup(markers).addTo(map);
  }, [mapReady, localFeatures]);

  return <div id="map" ref={containerRef} />;
}
