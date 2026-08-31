"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type Leaflet from "leaflet";
import type { Distillery, LocalFeature } from "@/lib/types";
import { truncateSummary } from "@/lib/text";
import { AREAS } from "@/lib/areas";
import { generateAreaBlob } from "@/lib/area-blob";
import { FEATURED_STAYS } from "@/lib/featured-stays";
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
   *  or straight-line fallback per segment) - drawn as a solid route line
   *  with a white casing for visibility against busy map tiles. Styling
   *  was originally an exact match to the mockup (#C4862A, weight 3,
   *  dashArray "1,8") but that was tuned for a short straight demo line;
   *  a real, winding road route needed a bolder treatment to stay
   *  legible, and later (22 July 2026) dropped the dash entirely - a
   *  fixed dash pattern read inconsistently (sparse on short straight
   *  legs, near-solid on winding stretches) once real routes were always
   *  drawing correctly. */
  routeStops?: { lat: number; lng: number }[];
  /** The current day's own stable id (ItineraryDay.id - unaffected by
   *  Move earlier/later, see trip-context.tsx's moveDay), used ONLY to
   *  detect an actual day switch so the view can re-fit to it (22 July
   *  2026). Deliberately separate from routeStops itself: editing the
   *  SAME day (add/remove/reorder a stop) must NOT re-fit the view - that
   *  would yank it out from under the visitor mid-edit (see
   *  initialRouteFitDoneRef in this file) - only switching to a different
   *  day should move the camera, so a visitor flicking through days
   *  actually sees each one's route rather than the previous day's view. */
  activeDayId?: string;
  /** The current day's own Local Feature stops (e.g. Machir Bay Beach on
   *  a day that has it in the itinerary) - rendered as their own
   *  individual pin directly on the map, same as distillery markers,
   *  rather than going into the shared cluster group with every other
   *  Natural Feature/Local Attraction/etc on the island (22 July 2026: a
   *  day's own walk/beach/pub stop could otherwise be fully invisible,
   *  folded into a cluster badge until zoomed in close enough to
   *  spiderfy it out). Deliberately full records passed independently of
   *  the `localFeatures` prop, not just ids cross-referenced against it -
   *  `localFeatures` is filtered down to whichever map category tab the
   *  visitor has toggled on (see Workspace.tsx's visibleLocalFeatures),
   *  so a stop wouldn't show at all if that category happened not to be
   *  toggled. A day's own stop should always be visible regardless of
   *  the browse filter, the same way distilleries always are. */
  activeDayFeatures?: LocalFeature[];
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
  /** Mobile bottom sheet (Phase 6, docs/days-trip-flow-handoff.md §6):
   *  extra bottom padding in pixels added to every fitBounds call, sized
   *  to the sheet's current real on-screen height (including the
   *  pin-detail-card height, which differs from the peek/half/full
   *  stages) - see MobilePlannerSheet.tsx, which measures this directly
   *  from its own inline `height` style rather than a second, separately
   *  maintained constant, so the two can never drift apart. Undefined on
   *  desktop, which has no sheet at all. */
  sheetPaddingBottom?: number;
  /** Bumped to any new number by the mobile "Whole day" recentre button
   *  to force an extra fit-to-route pass outside the normal
   *  day-switch/mount triggers below. Undefined on desktop, which relies
   *  on Leaflet's own default zoom control instead. */
  recenterSignal?: number;
  /** Mobile only (§6: "Tapping a pin raises a card in the sheet"). When
   *  provided, tapping a distillery or Local Feature marker calls this
   *  INSTEAD of opening Leaflet's own popup - the mobile bottom sheet
   *  shows its own detail card (name, distance from the last stop,
   *  "+ Add after {name}" / "Remove from day") rather than a Leaflet
   *  popup, which doesn't fit the sheet-first mobile interaction. Left
   *  undefined on desktop, which keeps today's popup behaviour exactly
   *  as it was. */
  onPinTap?: (target: { kind: "distillery" | "feature"; id: string; name: string; lat: number; lng: number }) => void;
  /** Desktop only. Called with a Local Feature id when a food/drink pin's
   *  popup opens, and with null when it closes - the caller raises and
   *  drops the Places UI Kit panel accordingly (see PlaceLiveDetails.tsx).
   *  Only fired for features that actually carry a googlePlaceId, so the
   *  panel never opens where it could only fail.
   *
   *  Deliberately not wired into the mobile onPinTap sheet card yet -
   *  that's a separate template (MobilePlannerSheet.tsx) and adding a
   *  Google-rendered card inside the bottom sheet is a layout decision
   *  of its own, not a like-for-like port of this button. */
  onShowLiveDetails?: (featureId: string | null) => void;
}

// Rough center of Scotland, used when a region has no pins yet so the map
// doesn't default to (0,0) in the Atlantic.
const SCOTLAND_CENTER: [number, number] = [56.8, -4.2];
const ISLAY_CENTER: [number, number] = [55.63, -6.188]; // Port Ellen - the standard default location, per 18 July 2026 conversation (was a generic island-center point, roughly at Bowmore)
// Pan bounds (docs/days-trip-flow-handoff.md §6) - checked first (per
// the Phase 6 task brief) and this did NOT already exist anywhere in
// this file before Phase 6, despite the design doc describing it as
// something to "just confirm... still applies on mobile". Added here,
// shared by the one MapCanvas instance used on both desktop and mobile,
// rather than only wiring it up for the new mobile sheet - the
// constraint reads as a property of the map itself (Islay + Jura, the
// only region this app has real data for), not something specific to
// the mobile layout.
const MAP_BOUNDS: [[number, number], [number, number]] = [[55.51, -6.62], [56.02, -5.62]];

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
  activeDayId,
  activeDayFeatures = [],
  accommodation,
  initialView,
  onViewChange,
  sheetPaddingBottom,
  recenterSignal,
  onPinTap,
  onShowLiveDetails,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  // Read once at mount time via a ref, not a dependency - initialView is
  // only ever meant to seed the map's starting position, not fight with
  // the visitor's own panning on every re-render.
  const initialViewRef = useRef(initialView);
  // Also read once at mount, same reasoning as initialViewRef - if a real
  // route (accommodation + stops) is already known the moment this map
  // first mounts (true for the seeded default day - see JourneyFlow.tsx,
  // which seeds the whole trip before Workspace/MapCanvas ever renders),
  // the mount effect below fits to THAT directly instead of first fitting
  // to every distillery on Islay and relying on a second, later effect to
  // override it. 21 July 2026 - the previous two-step "fit wide, then
  // override" approach was reported as sometimes sticking on the wide
  // view in fresh incognito testing; deciding once, at mount, removes the
  // two-fitBounds-calls-in-quick-succession race entirely rather than
  // relying on effect/animation timing to resolve it correctly.
  const routeStopsAtMountRef = useRef(routeStops);
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
  // Local Feature markers that are today's day stops - added directly to
  // the map (like distillery markers), NOT to clusterGroupRef, so they
  // stay individually visible - see activeDayFeatures' own comment.
  const activeDayFeatureMarkersRef = useRef<Leaflet.Marker[]>([]);
  const highlightMarkersRef = useRef<Leaflet.Marker[]>([]);
  // The one currently-visible Area highlight blob (organic polygon, not a
  // circle - see area-blob.ts), or null when no Area is active. Only ever
  // one at a time, per the "active" prop being a single slug - see the
  // blob-drawing effect below.
  const activeAreaBlobRef = useRef<Leaflet.Polygon | null>(null);
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
  // Mobile sheet pin-tap callback (§6) - same ref pattern as
  // onAddRef/onAddFeatureRef above, so the mount-once init effect below
  // always calls whatever the latest onPinTap prop is, not a stale one
  // captured the moment the map first mounted.
  const onPinTapRef = useRef(onPinTap);
  const onShowLiveDetailsRef = useRef(onShowLiveDetails);
  useEffect(() => {
    onPinTapRef.current = onPinTap;
    onShowLiveDetailsRef.current = onShowLiveDetails;
  }, [onPinTap, onShowLiveDetails]);
  // Read once at mount, same reasoning as routeStopsAtMountRef above -
  // this only seeds the FIRST fit's padding; every later change goes
  // through the dedicated effect further down that watches
  // sheetPaddingBottom/recenterSignal directly.
  const sheetPaddingAtMountRef = useRef(sheetPaddingBottom ?? 0);
  // Guards the initial route fit (below) so it only ever runs once, the
  // first time a real route shows up with no saved view to respect -
  // otherwise every later add/remove/reorder of a stop would re-fit the
  // bounds and yank the view out from under the visitor mid-edit.
  const initialRouteFitDoneRef = useRef(false);
  // Last day id the route-drawing effect below actually saw - compared
  // against the current activeDayId prop each run to tell "the visitor
  // switched to a different day" apart from "the same day's stops were
  // edited". Starts at the initial value so mounting on a day that
  // already has a route doesn't itself count as a "switch" (the mount
  // effect above already handles that first-ever fit).
  const activeDayIdRef = useRef(activeDayId);

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
        // §6 pan bounds - see MAP_BOUNDS' own comment above for why this
        // is here (shared) rather than only wired up for mobile.
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 0.9,
        minZoom: 9,
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
        if (onPinTapRef.current) {
          // Mobile sheet mode (§6) - no Leaflet popup here, the sheet
          // raises its own detail card instead (see onPinTap's doc
          // comment on MapCanvasProps).
          marker.on("click", () =>
            onPinTapRef.current?.({ kind: "distillery", id: d.slug, name: d.name, lat: d.lat, lng: d.lng })
          );
        } else {
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
        }
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

      // Decided once, here, rather than fitting wide first and hoping a
      // later effect overrides it (see routeStopsAtMountRef above) - if a
      // real route is already known, fit tight to it directly and mark
      // the one-shot route-fit guard as done so the routeStops effect
      // below doesn't also try. Otherwise, fall back to fitting every
      // distillery on Islay, same as before.
      const routeAtMount = routeStopsAtMountRef.current;
      const mountPad = sheetPaddingAtMountRef.current;
      if (routeAtMount.length >= 2 && !savedView) {
        const bounds = L.latLngBounds(routeAtMount.map((s) => [s.lat, s.lng] as [number, number]));
        // §6: paddingBottomRight sized to the sheet's height at mount, so
        // the very first paint doesn't briefly show pins hidden under it
        // before the reactive effect below gets a chance to re-fit.
        map.fitBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [40, 40 + mountPad] });
        initialRouteFitDoneRef.current = true;
      } else if (routeAtMount.length === 1 && !savedView) {
        // A single-stop day (added 21 July 2026 - the "today" flow's
        // evening seed is exactly one Local Feature, no accommodation, so
        // routeCoords only ever has this one point) has nothing to fit
        // bounds TO - fitBounds on one point doesn't zoom in meaningfully.
        // Center tightly on it directly instead of falling through to
        // "every distillery on Islay", which is what previously zoomed
        // this case out to the whole island regardless of how close the
        // one real stop actually was.
        map.setView([routeAtMount[0].lat, routeAtMount[0].lng], 13);
        initialRouteFitDoneRef.current = true;
      } else if (markers.length > 0 && !savedView) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 40 + mountPad] });
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

      // One listener for every feature popup: closing the popup drops the
      // Google panel with it. Bound on the map rather than per-marker
      // because Leaflet only ever has one popup open at a time, so a
      // marker-level handler would fight with the next pin's popupopen.
      map.on("popupclose", () => onShowLiveDetailsRef.current?.(null));

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

    // A genuine day switch (activeDayId changed since this effect last
    // ran) vs. the same day's stops being edited - see activeDayIdRef's
    // own comment for why these need different view behaviour. Checked
    // before the length>=2 draw block below so it also applies when the
    // new day has fewer than 2 stops (single-stop or empty days should
    // still recentre, not keep showing wherever the last day's route was).
    const dayChanged = activeDayId !== undefined && activeDayId !== activeDayIdRef.current;
    activeDayIdRef.current = activeDayId;

    if (routeStops.length >= 2) {
      const latLngs: [number, number][] = routeStops.map((s) => [s.lat, s.lng]);

      // Fits the view to this route when either (a) this is the first
      // real route to show up with nothing saved to respect (a fresh
      // visit seeding the default Day, most notably - only ever fires
      // once per mount, guarded by initialRouteFitDoneRef), or (b) the
      // visitor just switched to a different day (22 July 2026) - without
      // this, flicking through days left the view stuck whenever it last
      // was, so a day whose stops sit somewhere else on the island either
      // wasn't visible at all or barely peeked into a corner of the view.
      if ((!initialRouteFitDoneRef.current && !initialViewRef.current) || dayChanged) {
        // §6: paddingBottomRight sized to the sheet's current height
        // (0/undefined on desktop, which has no sheet) - pins never end
        // up hidden underneath it.
        map.fitBounds(L.latLngBounds(latLngs), {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, 40 + (sheetPaddingBottom ?? 0)],
        });
        initialRouteFitDoneRef.current = true;
      }

      // Casing technique (same idea Google/Citymapper use): a wider, solid
      // white/pale line drawn first so the route pops against busy map
      // tiles (roads, water, labels) regardless of what's underneath.
      const casing = L.polyline(latLngs, {
        color: "#FFFFFF",
        weight: 7,
        opacity: 0.9,
      });
      // Solid, not dashed (22 July 2026 - was dashArray "10,8") - a fixed
      // dash pattern applied along the real road path length reads very
      // differently depending on how winding a given stretch is: sparse,
      // clearly dotted on a short straight leg (e.g. hotel -> first stop),
      // but so many dash cycles packed into a winding stretch (e.g.
      // through Port Ellen) that it looked almost solid there instead -
      // an inconsistent, confusing look Mark flagged after the route
      // itself started drawing reliably. A solid line sidesteps this
      // entirely and is what most trip-planning apps use for driving legs.
      const routeLine = L.polyline(latLngs, {
        color: "#C4862A",
        weight: 4,
        opacity: 1,
        lineCap: "round",
      });

      routeLineRef.current = L.layerGroup([casing, routeLine]).addTo(map);
    } else if (routeStops.length === 1 && dayChanged) {
      // A single-stop day (e.g. one Local Feature with no accommodation
      // set) has nothing to fitBounds to - same reasoning as the mount
      // effect's own single-stop case above, just re-triggered on a day
      // switch instead of only at mount.
      map.setView([routeStops[0].lat, routeStops[0].lng], 13);
      initialRouteFitDoneRef.current = true;
    }
  }, [mapReady, routeStops, activeDayId, sheetPaddingBottom]);

  // §6: "the fitBounds padding... recalculated on every sheet-height
  // change", plus the mobile "Whole day" recentre control. Deliberately
  // its own effect, separate from the routeStops-drawing effect above -
  // that one only re-fits on a genuine day switch or first paint (so
  // editing the current day's stops doesn't yank the view out from under
  // the visitor mid-edit, per initialRouteFitDoneRef's own comment);
  // THIS effect exists purely to re-fit on every sheet resize (selecting/
  // deselecting a pin card, cycling peek/half/full) and on an explicit
  // recentre tap, regardless of whether the day itself changed. A no-op
  // on desktop, where neither prop is ever supplied.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    if (sheetPaddingBottom === undefined && recenterSignal === undefined) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const pad = sheetPaddingBottom ?? 0;
    if (routeStops.length >= 2) {
      const latLngs: [number, number][] = routeStops.map((s) => [s.lat, s.lng]);
      map.fitBounds(L.latLngBounds(latLngs), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, 40 + pad],
      });
    } else if (routeStops.length === 1) {
      map.setView([routeStops[0].lat, routeStops[0].lng], 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, sheetPaddingBottom, recenterSignal]);

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
        .bindPopup(
          (() => {
            // Links through to this hotel's own /stays/[slug] page (06
            // Aug 2026), same "View ->" pattern as the distillery pin
            // popups, whenever the chosen accommodation is one of the
            // four curated Featured Stays rather than an Area or a
            // free-text Other place (which have no page to link to).
            const stay = FEATURED_STAYS.find((s) => s.name === accommodation.name);
            // Same treatment extended to Areas (06 Aug 2026, Port Ellen
            // first) - only areas with a real /areas/[slug] page built
            // have `slug` set (see areas.ts), so this degrades to the
            // plain name-only popup for the others, same as before.
            const area = !stay ? AREAS.find((a) => a.name === accommodation.name && a.slug) : undefined;
            const link = stay
              ? `<div class="popup-actions"><a class="popup-btn popup-btn-secondary" href="/stays/${stay.slug}">View &rarr;</a></div>`
              : area
              ? `<div class="popup-actions"><a class="popup-btn popup-btn-secondary" href="/areas/${area.slug}">View &rarr;</a></div>`
              : "";
            return `<div class="popup-inner"><div class="popup-tag">Staying here</div><div class="popup-name">${accommodation.name}</div>${link}</div>`;
          })()
        )
        .addTo(map);
      accommodationMarkerRef.current = marker;
    }
  }, [mapReady, accommodation]);

  // Redraws Natural Feature pins whenever the visible list (or which of
  // them are today's own day stops) changes - a filter toggle in the map
  // toolbar, or switching days/editing stops, not a one-time mount.
  // Adds/removes just the feature markers from the shared cluster group -
  // the distillery markers already in that same group are left untouched.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current || !clusterGroupRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;

    for (const m of featureMarkersRef.current) {
      clusterGroup.removeLayer(m);
    }
    featureMarkersRef.current = [];
    for (const m of activeDayFeatureMarkersRef.current) {
      m.remove();
    }
    activeDayFeatureMarkersRef.current = [];

    // Today's own day stops are drawn from activeDayFeatures directly,
    // independent of whatever's in localFeatures (the filtered, "which
    // map category tab is toggled on" browse set - see activeDayFeatures'
    // own prop comment for why). Excluded from the filtered/clustered
    // list here so a stop that ALSO happens to match the current filter
    // isn't drawn twice.
    const activeDayFeatureIdSet = new Set(activeDayFeatures.map((f) => f.id));
    const clusteredFeatures = localFeatures.filter((f) => !activeDayFeatureIdSet.has(f.id));

    if (clusteredFeatures.length === 0 && activeDayFeatures.length === 0) return;

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
    //
    // Capped at a maximum real-world distance: zoomed out across the
    // whole island, a cluster badge already represents many pins spread
    // over a wide area, and its on-screen position is the centroid of
    // ALL of them (Leaflet's own clustering, not something this offset
    // controls) - letting the pixel-based offset keep growing at low
    // zoom just compounded with that natural drift and pushed things
    // further from the distillery than intended. A ~110m cap means this
    // mostly only does real work at village-level zoom, which is where
    // it's actually needed - at whole-island zoom a large cluster badge
    // isn't at real risk of being fully hidden behind a single thin pin
    // the way an individual marker was.
    const COLLISION_THRESHOLD_PX = 40;
    const OFFSET_DISTANCE_PX = 36;
    const MAX_OFFSET_DEG = 0.00247; // ~275m
    const metersPerPixel = (156543.03392 * Math.cos((ISLAY_CENTER[0] * Math.PI) / 180)) / Math.pow(2, currentZoom);
    const collisionThresholdDeg = (COLLISION_THRESHOLD_PX * metersPerPixel) / 111320;
    const offsetDistanceDeg = Math.min((OFFSET_DISTANCE_PX * metersPerPixel) / 111320, MAX_OFFSET_DEG);
    // Longitude degrees are shorter in real distance than latitude degrees
    // away from the equator - applying the same degree value to both
    // (tried first) over-corrected longitude by roughly 1/cos(56°) ≈ 1.8x.
    const offsetDistanceLngDeg = offsetDistanceDeg / 0.56;
    function offsetIfCollidingWithDistillery(lat: number, lng: number): { lat: number; lng: number } {
      for (const d of distilleries) {
        if (!d.lat || !d.lng) continue;
        const dLat = lat - d.lat;
        const dLngCompressed = (lng - d.lng) * 0.56; // rough longitude compression at ~56°N
        const dist = Math.sqrt(dLat * dLat + dLngCompressed * dLngCompressed);
        if (dist < collisionThresholdDeg) {
          // Push away from the distillery along the real bearing between
          // the two points, rather than always the same fixed NE nudge -
          // a coastal feature (e.g. Machir Bay, right by Kilchoman)
          // should end up pushed further toward the coast, not shoved
          // inland/behind other pins depending on which side of the
          // distillery it happens to sit on.
          if (dist < 1e-9) {
            // Exact same coordinates - no direction to work from.
            return { lat: lat + offsetDistanceDeg, lng: lng + offsetDistanceLngDeg };
          }
          const unitLat = dLat / dist;
          const unitLngCompressed = dLngCompressed / dist;
          return {
            lat: lat + unitLat * offsetDistanceDeg,
            lng: lng + unitLngCompressed * offsetDistanceLngDeg,
          };
        }
      }
      return { lat, lng };
    }

    // Shared between both lists below so the icon/popup markup only lives
    // in one place. `standalone` is true only for today's own day stops -
    // see the size/border/shadow bump and the addTo(map)-vs-cluster split
    // where this is called.
    function buildFeatureMarker(f: LocalFeature, standalone: boolean): Leaflet.Marker {
      const pos = offsetIfCollidingWithDistillery(f.lat, f.lng);
      const color = FEATURE_COLORS[f.category];
      // A day's own stop gets the same 32px size as a distillery marker
      // (up from the usual 26px) and a heavier border/shadow - both to
      // stand out as clearly "part of today's route" and because, unlike
      // the rest, it's never behind a cluster badge competing for
      // attention.
      const size = standalone ? 32 : 26;
      const icon = L.divIcon({
        className: "feature-marker",
        html: `<div style="background:${color};color:white;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:${
          standalone ? 3 : 2
        }px solid white;box-shadow:0 2px ${standalone ? 6 : 5}px rgba(0,0,0,${
          standalone ? 0.4 : 0.3
        });font-size:${standalone ? 15 : 13}px">${f.icon}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
      const marker = L.marker([pos.lat, pos.lng], { icon });
      if (onPinTapRef.current) {
        // Mobile sheet mode (§6) - same reasoning as the distillery
        // marker loop above: the sheet's own detail card replaces the
        // popup entirely, using the feature's REAL (un-offset)
        // coordinates for its "Nm from your last stop" maths, not the
        // collision-nudged `pos` this pin is actually drawn at.
        marker.on("click", () =>
          onPinTapRef.current?.({ kind: "feature", id: f.id, name: f.name, lat: f.lat, lng: f.lng })
        );
      } else {
        const categoryLabel = f.category.replace("-", " ");
        // Popups need a short hook, not the full page copy - "More info"
        // is right there for anyone who wants the rest. Pin Summary is
        // written specifically for this popup (one tight sentence); Why
        // Visit has grown into full-paragraph blockquote copy for the page
        // itself, so it's no longer reliably short enough to use as-is and
        // gets truncated the same way Description does. Same fallback-chain
        // pattern as the Tours "Short Summary" field (docs/deferred-features.md).
        const popupSummary = f.pinSummary ?? truncateSummary(f.whyVisit ?? f.description);
        // Only food/drink pins carry a Google Place ID, and only some of
        // those have been matched up yet - so this stays off unless the
        // record genuinely has one and the caller can show the panel.
        // An always-visible button that sometimes does nothing would be
        // worse than no button.
        const liveDetailsAvailable = Boolean(f.googlePlaceId) && Boolean(onShowLiveDetailsRef.current);
        // "More info" links to a real DramStory detail page (parking,
        // accessibility, hours, highlights, length/difficulty for walks and
        // rides) - deliberately keeping visitors on-site rather than sending
        // them to Google Maps, per the monetization/retention goal.
        //
        // Dropped only for food/drink venues that have a live Google card
        // (31 Aug 2026, Mark's call): /explore/[slug] is thin for a pub or
        // cafe next to Google's hours, rating and photo, so the second link
        // was sending people to a weaker page. Venues WITHOUT a place ID
        // keep it - for those it's still the only detail there is, and
        // removing it would leave the pin with nothing behind it.
        const showMoreInfo = !liveDetailsAvailable;
        marker.bindPopup(
          `<div class="popup-inner">
            <div class="popup-tag">${categoryLabel}</div>
            <div class="popup-name">${f.name}</div>
            <div class="popup-detail">${popupSummary}</div>
            <div class="popup-actions">${
              showMoreInfo
                ? `
              <a class="popup-btn popup-btn-secondary" href="/explore/${f.slug}">More info &rarr;</a>`
                : ""
            }
              <button class="popup-btn popup-btn-primary" data-add-feature="${f.id}">+ Add to Trip</button>
            </div>
          </div>`,
          { minWidth: 240 }
        );
        // The Google card now opens WITH the popup rather than behind a
        // second click - Mark's note that it read as a two-stage pin. The
        // panel closes again on popupclose, wired once on the map below,
        // so the two always appear and disappear together.
        if (liveDetailsAvailable) {
          marker.on("popupopen", () => onShowLiveDetailsRef.current?.(f.id));
        }
      }
      return marker;
    }

    const markers = clusteredFeatures.map((f) => {
      const marker = buildFeatureMarker(f, false);
      clusterGroup.addLayer(marker);
      return marker;
    });
    // Bypasses clustering entirely - added straight to the map, same as
    // distillery markers, so a day's own stop is always individually
    // visible rather than folded into a cluster badge, or missing
    // altogether if its category filter tab isn't toggled on.
    const activeDayMarkers = activeDayFeatures.map((f) => {
      const marker = buildFeatureMarker(f, true);
      marker.addTo(map);
      return marker;
    });

    featureMarkersRef.current = markers;
    activeDayFeatureMarkersRef.current = activeDayMarkers;
  }, [mapReady, localFeatures, distilleries, currentZoom, activeDayFeatures]);

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
          iconSize: [60, 60],
          iconAnchor: [30, 30],
        });
        // No popup/interactivity on the ring itself - it's a pure visual
        // indicator sitting behind the real, clickable distillery marker.
        return L.marker([d.lat, d.lng], { icon, interactive: false, zIndexOffset: -1000 }).addTo(map);
      });

    highlightMarkersRef.current = newHighlights;
  }, [mapReady, highlightedDistillerySlugs, distilleries]);

  // Which Area (by @/lib/areas.ts slug), if any, is currently "active" -
  // shows its organic highlight blob on the map, and nothing else's.
  // Derived from the accommodation prop itself (corrected 09 Aug 2026 -
  // this used to be a separate prop driven by hovering/clicking the
  // "Where to stay" Area cards below the map, which turned out to be a
  // misunderstanding of what Mark actually wanted: the blob should follow
  // whichever Area the visitor has picked as their accommodation via the
  // map's own Accommodation selector, not the unrelated cards below).
  // Matched the same way the 🏠 marker popup above identifies an Area
  // (by accommodation.name, checking FEATURED_STAYS first so a same-named
  // hotel never gets misread as an Area) rather than inventing a new
  // matching strategy - null whenever the selected accommodation is a
  // Featured Stay or a free-text/other place, since only the 3 real Areas
  // have a blob to show at all.
  const activeAreaSlug = useMemo(() => {
    if (!accommodation) return null;
    const isFeaturedStay = FEATURED_STAYS.some((s) => s.name === accommodation.name);
    if (isFeaturedStay) return null;
    const area = AREAS.find((a) => a.name === accommodation.name && a.slug);
    return area?.slug ?? null;
  }, [accommodation]);

  // One stable-shaped organic "blob" outline per real Area (Port Ellen,
  // Bowmore, Port Charlotte), computed once rather than regenerated on
  // every render/hover - see area-blob.ts for the seeded-PRNG + Chaikin-
  // smoothing approach and why it needs to be deterministic. AREAS itself
  // is a static import (not a prop), so this only ever needs to
  // recompute if the AREAS array reference itself changes.
  const areaBlobs = useMemo(
    () =>
      AREAS.map((a) => ({
        slug: a.slug ?? a.name,
        points: generateAreaBlob(a.lat, a.lng, a.slug ?? a.name),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Draws the ONE active Area's highlight blob (organic polygon, not a
  // circle - see area-blob.ts), or nothing at all when no Area is active.
  // Replaces the old always-on per-Area L.circle entirely (08 Aug 2026,
  // per Mark's review): the map itself is deliberately pin-free, per
  // Mark's follow-up review (an always-on or hoverable pin per Area made
  // the map look "too busy", Port Ellen especially) - now shows only
  // while the visitor's chosen accommodation (via the map's own
  // Accommodation selector) IS one of the 3 real Areas - see
  // activeAreaSlug above. Still the same brand amber (--amber, #D4A574)
  // as before, at ~40% fill (~60% transparent, per the reference) with a
  // more solid ~85%-opacity stroke so the boundary reads clearly through
  // whatever's underneath.
  //
  // Drawn with plain L.polygon rather than a divIcon marker (as the pulse
  // ring above uses) - Leaflet already renders vector layers like
  // polygons in its overlayPane (z-index 400), below markerPane (z-index
  // 600) where every real pin/cluster lives, so this sits behind the pins
  // by default with no extra pane/z-index wiring needed, and interactive:
  // false keeps it from ever intercepting a click meant for a pin
  // underneath/around it.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (activeAreaBlobRef.current) {
      activeAreaBlobRef.current.remove();
      activeAreaBlobRef.current = null;
    }

    if (!activeAreaSlug) return;
    const blob = areaBlobs.find((b) => b.slug === activeAreaSlug);
    if (!blob) return;

    const polygon = L.polygon(blob.points, {
      color: "#D4A574",
      weight: 2.5,
      opacity: 0.85,
      fillColor: "#D4A574",
      fillOpacity: 0.4,
      interactive: false,
    }).addTo(map);
    activeAreaBlobRef.current = polygon;

    return () => {
      polygon.remove();
      activeAreaBlobRef.current = null;
    };
  }, [mapReady, activeAreaSlug, areaBlobs]);

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
