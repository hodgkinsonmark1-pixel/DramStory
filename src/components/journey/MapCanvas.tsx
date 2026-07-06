"use client";

import { useEffect, useRef, useState } from "react";
import type Leaflet from "leaflet";
import type { Distillery } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface MapCanvasProps {
  distilleries: Distillery[];
  isLive: boolean;
  onAddDistillery?: (slug: string) => void;
  /** Ordered lat/lng of the current day's itinerary stops - draws a dashed
   *  route line connecting them, matching the approved mockup exactly
   *  (verified: #C4862A, weight 3, dashArray "1,8", opacity 0.85, straight
   *  lines between stops rather than real road routing). */
  routeStops?: { lat: number; lng: number }[];
}

// Rough center of Scotland, used when a region has no pins yet so the map
// doesn't default to (0,0) in the Atlantic.
const SCOTLAND_CENTER: [number, number] = [56.8, -4.2];
const ISLAY_CENTER: [number, number] = [55.75, -6.2];

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
export default function MapCanvas({ distilleries, isLive, onAddDistillery, routeStops = [] }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const routeLineRef = useRef<Leaflet.Polyline | null>(null);
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
        zoom: isLive && distilleries.length > 0 ? 10 : 6,
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
      routeLineRef.current = L.polyline(
        routeStops.map((s) => [s.lat, s.lng]),
        { color: "#C4862A", weight: 3, dashArray: "1,8", opacity: 0.85 }
      ).addTo(map);
    }
  }, [mapReady, routeStops]);

  return <div id="map" ref={containerRef} />;
}
