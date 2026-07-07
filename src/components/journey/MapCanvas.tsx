"use client";

import { useEffect, useRef, useState } from "react";
import type Leaflet from "leaflet";
import type { Distillery, LocalFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface MapCanvasProps {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  isLive: boolean;
  onAddDistillery?: (slug: string) => void;
  onAddFeature?: (id: string) => void;
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
  "historic-site": "#8B6F47",
  "attraction-gem": "#B8557A",
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
export default function MapCanvas({
  distilleries,
  localFeatures,
  isLive,
  onAddDistillery,
  onAddFeature,
  routeStops = [],
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const routeLineRef = useRef<Leaflet.LayerGroup | null>(null);
  // One shared cluster group for distilleries AND Natural Features -
  // clustering everything together (not per-category) per request, so a
  // dense area shows one combined count rather than several overlapping
  // per-type clusters.
  const clusterGroupRef = useRef<Leaflet.MarkerClusterGroup | null>(null);
  const featureMarkersRef = useRef<Leaflet.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const onAddRef = useRef(onAddDistillery);
  useEffect(() => {
    onAddRef.current = onAddDistillery;
  }, [onAddDistillery]);
  const onAddFeatureRef = useRef(onAddFeature);
  useEffect(() => {
    onAddFeatureRef.current = onAddFeature;
  }, [onAddFeature]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
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

      const clusterGroup = L.markerClusterGroup({ maxClusterRadius: 50 });
      clusterGroup.addTo(map);
      clusterGroupRef.current = clusterGroup;

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
        const marker = L.marker([d.lat, d.lng], { icon: distilleryIcon });
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
        // Distillery markers are deliberately NOT added to the cluster
        // group - they're the primary thing visitors interact with to
        // build a route, so always showing them individually (never
        // hidden behind a cluster badge requiring a zoom-in first) matters
        // more here than avoiding visual density. Natural Features/Local
        // Attractions pins still cluster (see the other marker loop below).
        marker.addTo(map);
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
        const target = e.target as HTMLElement;
        const addDistillery = target.closest("[data-add-distillery]");
        if (addDistillery) {
          const slug = addDistillery.getAttribute("data-add-distillery");
          if (slug) onAddRef.current?.(slug);
          return;
        }
        const addFeature = target.closest("[data-add-feature]");
        if (addFeature) {
          const id = addFeature.getAttribute("data-add-feature");
          if (id) onAddFeatureRef.current?.(id);
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
  // filter toggle in the map toolbar, not a one-time mount). Adds/removes
  // just the feature markers from the shared cluster group - the
  // distillery markers already in that same group are left untouched.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current || !clusterGroupRef.current) return;
    const L = leafletRef.current;
    const clusterGroup = clusterGroupRef.current;

    for (const m of featureMarkersRef.current) {
      clusterGroup.removeLayer(m);
    }
    featureMarkersRef.current = [];

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
      const categoryLabel = f.category.replace("-", " ");
      // "More info" now links to a real DramStory detail page (parking,
      // accessibility, hours, highlights, length/difficulty for walks and
      // rides) - deliberately keeping visitors on-site rather than sending
      // them to Google Maps, per the monetization/retention goal.
      marker.bindPopup(
        `<div class="popup-inner">
          <div class="popup-tag">${categoryLabel}</div>
          <div class="popup-name">${f.name}</div>
          <div class="popup-detail">${f.description}</div>
          <div class="popup-actions">
            <a class="popup-btn popup-btn-secondary" href="/explore/${f.slug}">More info &rarr;</a>
            <button class="popup-btn popup-btn-primary" data-add-feature="${f.id}">+ Add to Trip</button>
          </div>
        </div>`,
        { minWidth: 240 }
      );
      clusterGroup.addLayer(marker);
      return marker;
    });

    featureMarkersRef.current = markers;
  }, [mapReady, localFeatures]);

  return <div id="map" ref={containerRef} />;
}
