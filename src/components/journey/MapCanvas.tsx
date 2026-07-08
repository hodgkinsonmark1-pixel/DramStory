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
  /** Distillery slugs to render with a pulsing ring - the map's visual
   *  indicator for "there's a Local Event on here during the selected
   *  date range", rather than a shaded zone (considered and rejected -
   *  most real events have a specific venue, not a vague area, and a
   *  shaded-zone treatment would be a new visual language inconsistent
   *  with the rest of the pin-based map). */
  highlightedDistillerySlugs?: string[];
  /** Ordered lat/lng points along the current day's real route (from OSRM,
   *  or straight-line fallback per segment) - drawn as a route line with a
   *  white casing for visibility against busy map tiles. Styling was
   *  originally an exact match to the mockup (#C4862A, weight 3, dashArray
   *  "1,8") but that was tuned for a short straight demo line; a real,
   *  winding road route needed a bolder treatment to stay legible. */
  routeStops?: { lat: number; lng: number }[];
  /** Where the current day starts/ends, if the visitor has set one - a
   *  distinct pin from the distillery markers, matching the "home" style
   *  already used for ferry-port pins elsewhere on the site. */
  accommodation?: { name: string; lat: number; lng: number };
  /** Last known pan/zoom position (from TripContext.mapView) - used as the
   *  starting view instead of always the default island-wide center, so
   *  leaving to view a distillery and coming back doesn't reset it. */
  initialView?: { lat: number; lng: number; zoom: number };
  /** Called (debounced to Leaflet's own moveend/zoomend events, so already
   *  naturally throttled) whenever the visitor pans or zooms, so the
   *  caller can persist the new view. */
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
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
  pub: "#A64A4A",
  cafe: "#B87D4B",
  restaurant: "#4A6A8A",
  golf: "#4A7A4A",
  spa: "#C77DA6",
  transport: "#5C7A99",
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
  highlightedDistillerySlugs = [],
  routeStops = [],
  accommodation,
  initialView,
  onViewChange,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  // Read once at mount time via a ref, not a dependency - initialView is
  // only ever meant to seed the map's starting position, not fight with
  // the visitor's own panning on every re-render.
  const initialViewRef = useRef(initialView);
  const onViewChangeRef = useRef(onViewChange);
  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);
  const routeLineRef = useRef<Leaflet.LayerGroup | null>(null);
  const accommodationMarkerRef = useRef<Leaflet.Marker | null>(null);
  // One shared cluster group for distilleries AND Natural Features -
  // clustering everything together (not per-category) per request, so a
  // dense area shows one combined count rather than several overlapping
  // per-type clusters.
  const clusterGroupRef = useRef<Leaflet.MarkerClusterGroup | null>(null);
  const featureMarkersRef = useRef<Leaflet.Marker[]>([]);
  const highlightMarkersRef = useRef<Leaflet.Marker[]>([]);
  // Keyed by distillery slug - lets the onboarding walkthrough open a
  // specific real marker's popup (e.g. Bowmore) programmatically, rather
  // than requiring an actual click during the passive walkthrough.
  const distilleryMarkersBySlugRef = useRef<Record<string, Leaflet.Marker>>({});
  const [mapReady, setMapReady] = useState(false);
  // Tracked so the pin-collision offset (below) can target a fixed PIXEL
  // distance rather than a fixed geographic one - a fixed-degree offset
  // is barely visible zoomed out and unnecessarily large zoomed in.
  const [currentZoom, setCurrentZoom] = useState(initialViewRef.current?.zoom ?? 11);
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

      const savedView = initialViewRef.current;
      const map = L.map(containerRef.current, {
        center: savedView ? [savedView.lat, savedView.lng] : isLive && distilleries.length > 0 ? ISLAY_CENTER : SCOTLAND_CENTER,
        zoom: savedView ? savedView.zoom : isLive && distilleries.length > 0 ? 11 : 7,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      map.on("moveend zoomend", () => {
        const center = map.getCenter();
        onViewChangeRef.current?.({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
        setCurrentZoom(map.getZoom());
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        // Previously defaulted to true, which zoomed the map further in on
        // every cluster click - the actual complaint was that this made
        // it feel like clusters couldn't be "opened" in place. false makes
        // a click spiderfy (fan out the individual pins) right where it
        // is, at the current zoom, instead of moving the view at all.
        zoomToBoundsOnClick: false,
        // Once zoomed in this close, stop clustering altogether - every
        // real pin renders individually and is always directly visible
        // and clickable. This is what actually solves "I want to see
        // multiple clusters open on the same screen": at this zoom
        // there's nothing left to cluster, so there's nothing to open.
        disableClusteringAtZoom: 15,
      });
      clusterGroup.addTo(map);
      clusterGroupRef.current = clusterGroup;

      // Simple brand-colored dot marker instead of Leaflet's default pin -
      // sidesteps the well-known bundler icon-path issue and matches the
      // site's whisky-glass emoji used elsewhere for distilleries.
      // Built per-distillery (not one shared icon) so each marker's DOM
      // element carries its own data-distillery-slug - this is how the
      // onboarding walkthrough finds a specific real marker (e.g. Bowmore)
      // to spotlight, rather than just the whole map region.
      function buildDistilleryIcon(slug: string) {
        return L.divIcon({
          className: "distillery-marker",
          html: `<div data-distillery-slug="${slug}" style="background:var(--navy,#1A3A4A);color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white"><span style="transform:rotate(45deg);font-size:14px">🥃</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
      }

      const markers: Leaflet.Marker[] = [];
      const slugToMarker: Record<string, Leaflet.Marker> = {};
      for (const d of distilleries) {
        if (!d.lat || !d.lng) continue;
        const marker = L.marker([d.lat, d.lng], { icon: buildDistilleryIcon(d.slug) });
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
        slugToMarker[d.slug] = marker;
      }
      distilleryMarkersBySlugRef.current = slugToMarker;

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

  // Draws/updates/clears the accommodation ("home base") pin - deliberately
  // a distinct marker style from distillery pins (a plain circle, not the
  // whisky-glass teardrop), since this represents where you're staying,
  // not something to visit or add a tour for.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (accommodationMarkerRef.current) {
      accommodationMarkerRef.current.remove();
      accommodationMarkerRef.current = null;
    }

    if (accommodation) {
      const marker = L.marker([accommodation.lat, accommodation.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#5C7A99;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:15px">🏠</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .bindPopup(`<div class="popup-inner"><div class="popup-tag">Staying here</div><div class="popup-name">${accommodation.name}</div></div>`)
        .addTo(map);
      accommodationMarkerRef.current = marker;
    }
  }, [mapReady, accommodation]);

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

    // Distillery markers are always added individually, on top of
    // everything else (never clustered) - a feature pin (or a whole
    // cluster badge representing several of them) plotted at or very near
    // the same coordinate ends up fully hidden underneath it.
    //
    // The offset needs to be a fixed PIXEL distance, not a fixed
    // geographic one - a fixed-degree offset (tried first) was barely
    // visible zoomed out across the island and unnecessarily large
    // zoomed into a single village, because the same number of degrees
    // covers wildly different pixel distances depending on zoom.
    // Standard Web Mercator meters-per-pixel formula, used to convert a
    // target pixel distance into the right number of degrees for the
    // current zoom level (currentZoom, kept in sync via the map's
    // moveend/zoomend listener above).
    const COLLISION_THRESHOLD_PX = 40;
    const OFFSET_DISTANCE_PX = 36;
    const metersPerPixel = (156543.03392 * Math.cos((ISLAY_CENTER[0] * Math.PI) / 180)) / Math.pow(2, currentZoom);
    const collisionThresholdDeg = (COLLISION_THRESHOLD_PX * metersPerPixel) / 111320;
    const offsetDistanceDeg = (OFFSET_DISTANCE_PX * metersPerPixel) / 111320;
    function offsetIfCollidingWithDistillery(lat: number, lng: number): { lat: number; lng: number } {
      for (const d of distilleries) {
        if (!d.lat || !d.lng) continue;
        const dLat = lat - d.lat;
        const dLng = (lng - d.lng) * 0.56; // rough longitude compression at ~56°N
        if (Math.sqrt(dLat * dLat + dLng * dLng) < collisionThresholdDeg) {
          return { lat: lat + offsetDistanceDeg, lng: lng + offsetDistanceDeg };
        }
      }
      return { lat, lng };
    }

    const markers = localFeatures.map((f) => {
      const pos = offsetIfCollidingWithDistillery(f.lat, f.lng);
      const color = FEATURE_COLORS[f.category];
      const icon = L.divIcon({
        className: "feature-marker",
        html: `<div style="background:${color};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:13px">${f.icon}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13],
      });
      const marker = L.marker([pos.lat, pos.lng], { icon });
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
  }, [mapReady, localFeatures, distilleries, currentZoom]);

  // Pulsing ring behind any distillery hosting a Local Event within the
  // currently-selected date range - redrawn whenever that set changes
  // (a date/month picker edit, or toggling Local Events on/off).
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    for (const m of highlightMarkersRef.current) {
      m.remove();
    }
    highlightMarkersRef.current = [];

    if (highlightedDistillerySlugs.length === 0) return;

    const newHighlights = highlightedDistillerySlugs
      .map((slug) => distilleries.find((d) => d.slug === slug))
      .filter((d): d is NonNullable<typeof d> => !!d && !!d.lat && !!d.lng)
      .map((d) => {
        const icon = L.divIcon({
          className: "distillery-pulse-icon",
          html: `<div class="distillery-pulse-ring"></div>`,
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        });
        // No popup/interactivity on the ring itself - it's a pure visual
        // indicator sitting behind the real, clickable distillery marker.
        return L.marker([d.lat, d.lng], { icon, interactive: false, zIndexOffset: -1000 }).addTo(map);
      });

    highlightMarkersRef.current = newHighlights;
  }, [mapReady, highlightedDistillerySlugs, distilleries]);

  // Lets the onboarding walkthrough open (and later close) a specific real
  // distillery's popup programmatically, e.g. to show what "Add it to
  // your Journey" actually looks like without requiring a real click.
  useEffect(() => {
    function handleOpen(e: Event) {
      const slug = (e as CustomEvent<{ slug: string }>).detail?.slug;
      distilleryMarkersBySlugRef.current[slug]?.openPopup();
    }
    function handleClose(e: Event) {
      const slug = (e as CustomEvent<{ slug: string }>).detail?.slug;
      distilleryMarkersBySlugRef.current[slug]?.closePopup();
    }
    window.addEventListener("onboarding:open-distillery-popup", handleOpen);
    window.addEventListener("onboarding:close-distillery-popup", handleClose);
    return () => {
      window.removeEventListener("onboarding:open-distillery-popup", handleOpen);
      window.removeEventListener("onboarding:close-distillery-popup", handleClose);
    };
  }, []);

  return <div id="map" ref={containerRef} />;
}
