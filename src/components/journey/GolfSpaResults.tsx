"use client";

import { useEffect, useState } from "react";
import type { PlaceListing } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Golf & Spa results, sourced live from Google Places (New) via /api/places.
//
// Deliberately rendered as a plain list, NOT as pins on the workspace's
// Leaflet/OpenStreetMap - Google's Places API terms prohibit displaying
// Places content "on, next to, or in a manner that is visually associated
// with" a non-Google map (see developers.google.com/maps/documentation/
// places/web-service/policies). This list sits in the toolbar drill-down
// area below the map's filter row, not overlaid on or beside the map
// canvas itself, and carries the Google attribution their policy requires
// whenever Places content is shown without a map.
// ─────────────────────────────────────────────────────────────────────────

interface GolfSpaResultsProps {
  center: { lat: number; lng: number };
  radiusMeters?: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  golf: "Golf",
  spa: "Spa",
};

export default function GolfSpaResults({ center, radiusMeters = 25000 }: GolfSpaResultsProps) {
  const [places, setPlaces] = useState<PlaceListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const [golfRes, spaRes] = await Promise.all([
          fetch(`/api/places?category=golf&lat=${center.lat}&lng=${center.lng}&radius=${radiusMeters}`),
          fetch(`/api/places?category=spa&lat=${center.lat}&lng=${center.lng}&radius=${radiusMeters}`),
        ]);
        if (!golfRes.ok || !spaRes.ok) throw new Error("Request failed");
        const [golfData, spaData] = await Promise.all([golfRes.json(), spaRes.json()]);
        if (cancelled) return;
        setPlaces([...(golfData.places ?? []), ...(spaData.places ?? [])]);
      } catch {
        if (!cancelled) setError("Couldn't load Golf & Spa listings right now - try again shortly.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, radiusMeters]);

  return (
    <div className="event-results-list">
      {error ? (
        <span className="event-results-empty">{error}</span>
      ) : places === null ? (
        <span className="event-results-empty">Loading Golf &amp; Spa listings&hellip;</span>
      ) : places.length === 0 ? (
        <span className="event-results-empty">No Golf &amp; Spa listings found nearby</span>
      ) : (
        <>
          {places.map((p) => (
            <div className="event-result-card" key={p.id}>
              <span className="event-result-name">{p.name}</span>
              <span className="event-result-meta">
                {CATEGORY_LABEL[p.category] ?? p.category}
                {p.rating ? ` \u00b7 \u2b50 ${p.rating.toFixed(1)}` : ""}
                {p.address ? ` \u00b7 ${p.address}` : ""}
              </span>
              {p.googleMapsUrl && (
                <a href={p.googleMapsUrl} target="_blank" rel="noreferrer" className="event-result-link">
                  View on Google Maps &rarr;
                </a>
              )}
            </div>
          ))}
          {/* Required Google attribution for Places content shown without a
              map - see Policies and attributions for Places API. */}
          <span className="places-attribution">Places data &copy;{new Date().getFullYear()} Google</span>
        </>
      )}
    </div>
  );
}
