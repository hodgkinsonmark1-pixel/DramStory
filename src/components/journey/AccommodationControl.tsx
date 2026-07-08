"use client";

import { useState } from "react";
import { useTrip } from "@/lib/trip-context";
import type { TripAccommodation } from "@/lib/types";

// Biases search results toward Islay/Argyll, since that's where every
// visitor planning here actually is - format is west,north,east,south.
const ISLAY_VIEWBOX = "-6.7,55.95,-5.9,55.55";

/**
 * Lets the visitor set where they're staying for the active day - just a
 * real, named place (a village, typically), geocoded via OpenStreetMap's
 * free Nominatim search, NOT a specific booked property or accommodation
 * search integration (there isn't one yet). This exists purely so the
 * day's route and drive-time totals have a real start/end point.
 */
export default function AccommodationControl({
  dayIndex,
  accommodation,
}: {
  dayIndex: number;
  accommodation?: TripAccommodation;
}) {
  const trip = useTrip();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&viewbox=${ISLAY_VIEWBOX}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("lookup failed");
      const data = await res.json();
      const first = data?.[0];
      if (!first) {
        setError("Couldn't find that place - try a nearby village name instead.");
        setLoading(false);
        return;
      }
      trip.setAccommodation(dayIndex, {
        name: (first.display_name as string).split(",")[0] || query,
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      });
      setEditing(false);
      setQuery("");
    } catch {
      setError("Something went wrong looking that up - try again.");
    } finally {
      setLoading(false);
    }
  }

  if (accommodation && !editing) {
    return (
      <div className="accommodation-row">
        <span>
          🏠 Staying: <strong>{accommodation.name}</strong>
        </span>
        <button className="accommodation-btn" onClick={() => setEditing(true)}>
          Change
        </button>
        <button className="accommodation-btn" onClick={() => trip.setAccommodation(dayIndex, undefined)}>
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="accommodation-row">
      <input
        className="accommodation-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        placeholder="Where are you staying? e.g. Bowmore"
      />
      <button className="accommodation-btn" onClick={handleSearch} disabled={loading}>
        {loading ? "Looking..." : "Set"}
      </button>
      {accommodation && (
        <button className="accommodation-btn" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
      {error && <div className="accommodation-error">{error}</div>}
    </div>
  );
}
