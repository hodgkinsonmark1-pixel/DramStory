"use client";

import { useEffect, useRef } from "react";
import type Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Distillery } from "@/lib/types";
import { fetchRouteSegments, type LatLng } from "@/lib/route-geometry";

interface JourneyDayMapProps {
  base: LatLng & { village: string };
  /** That day's distillery stops, in visiting order. */
  stops: Distillery[];
}

/**
 * A lightweight, single-purpose map for one day of a Classic Journey -
 * deliberately NOT the full interactive Workspace MapCanvas (which is built
 * around live trip-editing, clustering across the whole island, and several
 * pin categories). This just needs to show, for one day: where you're
 * staying, which distilleries you're visiting, and the real road route
 * between them - reusing the same Leaflet setup and OSRM routing utility
 * the main map uses, at a much smaller scope.
 */
export default function JourneyDayMap({ base, stops }: JourneyDayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker([base.lat, base.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#5C7A99;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:13px">🏠</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
        .bindPopup(base.village)
        .addTo(map);

      for (const d of stops) {
        if (!d.lat || !d.lng) continue;
        const marker = L.marker([d.lat, d.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#1A3A4A;color:white;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;cursor:pointer"><span style="transform:rotate(45deg);font-size:12px">🥃</span></div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 26],
          }),
        })
          // Permanent tooltip (not a click-to-reveal popup) so the name
          // shows straight away, matching "the icons show each location
          // name" rather than requiring a click just to identify a pin.
          .bindTooltip(d.name, {
            permanent: true,
            direction: "top",
            offset: [0, -22],
            className: "journey-day-map-label",
          })
          .addTo(map);
        // Opens the distillery's own page in a new tab rather than
        // navigating away from the journey page the visitor is
        // currently reading.
        marker.on("click", () => {
          window.open(`/distilleries/${d.slug}`, "_blank", "noopener,noreferrer");
        });
      }

      const points: LatLng[] = [
        { lat: base.lat, lng: base.lng },
        ...stops.filter((d) => d.lat && d.lng).map((d) => ({ lat: d.lat, lng: d.lng })),
        { lat: base.lat, lng: base.lng },
      ];

      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [28, 28] });

      const segments = await fetchRouteSegments(points);
      if (cancelled) return;
      for (const seg of segments) {
        if (!seg) continue;
        L.polyline(
          seg.points.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#C4862A", weight: 4, opacity: 0.85 }
        ).addTo(map);
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

  return <div ref={containerRef} style={{ height: 220, borderRadius: "var(--radius)", overflow: "hidden" }} />;
}
