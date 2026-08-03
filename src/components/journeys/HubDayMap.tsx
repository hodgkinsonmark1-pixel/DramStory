"use client";

import { useEffect, useRef } from "react";
import type Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRouteSegments, type LatLng } from "@/lib/route-geometry";

export interface HubDayMapStop {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  /** Feature stops only - the Local Feature's own Icon field from
   *  Airtable (the same icon shown in the card's chip row), used on the
   *  map pin instead of a generic marker. Distillery stops ignore this
   *  and always use the fixed dram-glass pin below. */
  icon?: string;
}

interface HubDayMapProps {
  /** Distillery stops, in visiting order. */
  distilleries: HubDayMapStop[];
  /** Non-distillery stops with a real Local Feature record (a café, a
   *  church, a leisure centre) - same marker style/behaviour as the
   *  Classic Journey day map's feature stops. */
  featureStops?: HubDayMapStop[];
}

/**
 * Hub Day card map - same Leaflet/OSM/OSRM setup and marker styling as
 * JourneyDayMap, but with no fixed "base" home marker, since a Hub Day
 * shows two possible bases (Port Ellen / Bowmore) rather than one fixed
 * overnight village. Just plots the day's actual stops and the real road
 * route between them, in order.
 */
export default function HubDayMap({ distilleries, featureStops = [] }: HubDayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      for (const d of distilleries) {
        if (!d.lat || !d.lng) continue;
        const marker = L.marker([d.lat, d.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#1A3A4A;color:white;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;cursor:pointer"><span style="transform:rotate(45deg);font-size:12px">🥃</span></div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 26],
          }),
        })
          .bindTooltip(d.name, {
            permanent: true,
            direction: "top",
            offset: [0, -22],
            className: "journey-day-map-label",
          })
          .addTo(map);
        marker.on("click", () => {
          window.open(`/distilleries/${d.slug}`, "_blank", "noopener,noreferrer");
        });
      }

      for (const f of featureStops) {
        if (!f.lat || !f.lng) continue;
        // 23 July 2026: uses the feature's own Icon field (same icon as
        // the card's chip row) instead of a generic pin, so the map and
        // the chip row read as the same information twice, not two
        // different visual languages - falls back to a plain pin marker
        // only if a record genuinely has no icon set.
        const pinGlyph = f.icon || "📍";
        const marker = L.marker([f.lat, f.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#6F7F62;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;cursor:pointer;font-size:12px">${pinGlyph}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .bindTooltip(f.name, {
            permanent: true,
            direction: "top",
            offset: [0, -14],
            className: "journey-day-map-label",
          })
          .addTo(map);
        marker.on("click", () => {
          window.open(`/explore/${f.slug}`, "_blank", "noopener,noreferrer");
        });
      }

      const points: LatLng[] = [
        ...distilleries.filter((d) => d.lat && d.lng).map((d) => ({ lat: d.lat, lng: d.lng })),
        ...featureStops.filter((f) => f.lat && f.lng).map((f) => ({ lat: f.lat, lng: f.lng })),
      ];
      if (points.length === 0) return;

      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [28, 28] });

      if (points.length > 1) {
        const segments = await fetchRouteSegments(points);
        if (cancelled) return;
        for (const seg of segments) {
          if (!seg) continue;
          const latlngs = seg.points.map((p) => [p.lat, p.lng] as [number, number]);
          // Casing + line (22 July 2026): a wider pale line underneath the
          // route makes it read clearly against the muted basemap instead
          // of blending into it. At card size, the route was previously
          // the only real per-day visual signal on a multi-stop Day and it
          // wasn't prominent enough - cards looked too uniform when
          // several sat in the page's vertical flow. Standard cartography
          // trick, not a basemap change (CartoDB Positron stays as-is).
          L.polyline(latlngs, { color: "#FFFFFF", weight: 8, opacity: 0.9 }).addTo(map);
          L.polyline(latlngs, { color: "#C4862A", weight: 4, opacity: 0.95 }).addTo(map);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
