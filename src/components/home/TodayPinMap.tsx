"use client";

import { useEffect, useRef } from "react";
import type Leaflet from "leaflet";
import { AREAS } from "@/lib/areas";
import "leaflet/dist/leaflet.css";

/**
 * The pin the sentence talks about (03 Sep 2026).
 *
 * WHY IT EXISTS. The clause reads "I've dropped a pin", and until this
 * component nothing dropped one or showed one - /today had no map at
 * all and /today/build's map marked distilleries but never the visitor.
 * Mark caught the gap by asking whether it actually dropped a pin. It
 * did not. This makes the words true: the pin is visible, and it is
 * tappable, so someone whose GPS is off - or who is planning from
 * somewhere they are not yet standing - can place it themselves.
 *
 * Deliberately separate from DreamingMap and MapCanvas, for the reason
 * DreamingMap's own header gives about MapCanvas: those plot content
 * (distilleries, features) and this plots ONE thing, the visitor. Its
 * whole marker layer is two pins and a tap handler. Sharing would mean
 * parameterising both away.
 *
 * PRECISION IS REAL HERE, unlike the village list beneath it: a tap
 * sets todayPoint to the exact coordinates tapped, and buildTodaySchedule
 * measures drive times from that point. The three village pins remain as
 * the quick answer for anyone who would rather not aim.
 */

const MAP_BOUNDS: [[number, number], [number, number]] = [
  [55.51, -6.62],
  [56.02, -5.62],
];

export default function TodayPinMap({
  origin,
  isPin,
  onPickPoint,
  onPickArea,
}: {
  origin: { lat: number; lng: number };
  /** True when origin is the visitor's own pin rather than a village. */
  isPin: boolean;
  onPickPoint: (point: { lat: number; lng: number }) => void;
  onPickArea: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const pinRef = useRef<Leaflet.Marker | null>(null);
  const areaMarkersRef = useRef<Leaflet.Marker[]>([]);
  const onPickPointRef = useRef(onPickPoint);
  const onPickAreaRef = useRef(onPickArea);
  // Read once at mount - re-centring on every render would fight the
  // visitor's own panning, same reasoning DreamingMap's centerRef gives.
  const centerRef = useRef(origin);

  useEffect(() => {
    onPickPointRef.current = onPickPoint;
    onPickAreaRef.current = onPickArea;
  }, [onPickPoint, onPickArea]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [centerRef.current.lat, centerRef.current.lng],
        zoom: 11,
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 0.9,
        minZoom: 9,
        // The map sits inside a scrolling sheet; wheel zoom would
        // swallow the scroll the visitor actually meant.
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        onPickPointRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }
    init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
      areaMarkersRef.current = [];
    };
  }, []);

  // The visitor's pin, redrawn wherever the answer moves to.
  useEffect(() => {
    let cancelled = false;
    async function draw() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      pinRef.current?.remove();
      pinRef.current = L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({
          className: "today-pin-marker",
          html:
            '<div style="background:#C4862A;width:28px;height:28px;border-radius:50% 50% 50% 0;' +
            'transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        }),
        // Above the village labels, which are the quieter layer.
        zIndexOffset: 1000,
      }).addTo(mapRef.current);
    }
    draw();
    return () => {
      cancelled = true;
    };
  }, [origin.lat, origin.lng]);

  // The three villages, as labels rather than pins - they are the
  // shortcut, not the subject.
  useEffect(() => {
    let cancelled = false;
    async function draw() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      for (const m of areaMarkersRef.current) m.remove();
      areaMarkersRef.current = [];
      for (const a of AREAS) {
        const marker = L.marker([a.lat, a.lng], {
          icon: L.divIcon({
            className: "today-pin-area",
            html:
              '<div style="background:#1A3A4A;color:white;padding:2px 7px;border-radius:10px;' +
              'font-size:10.5px;white-space:nowrap;border:1.5px solid white;opacity:0.92">' +
              a.name +
              "</div>",
            iconSize: [0, 0],
            iconAnchor: [0, 9],
          }),
        });
        marker.on("click", (e: Leaflet.LeafletMouseEvent) => {
          // Otherwise the map's own click handler also fires and drops a
          // pin on top of the village the visitor just chose.
          L.DomEvent.stopPropagation(e);
          onPickAreaRef.current(a.slug);
        });
        marker.addTo(mapRef.current!);
        areaMarkersRef.current.push(marker);
      }
    }
    draw();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="today-pin-map">
      <div ref={containerRef} className="today-pin-map-canvas" />
      <p className="today-pin-map-hint">
        {isPin
          ? "Tap anywhere to move your pin, or tap a village."
          : "Tap where you are to drop a pin, or tap a village."}
      </p>
    </div>
  );
}
