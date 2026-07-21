"use client";

import { useEffect, useState } from "react";
import { useTrip } from "@/lib/trip-context";
import { buildAccommodationBookingLink } from "@/lib/accommodation-links";
import type { TripAccommodation } from "@/lib/types";

// Biases free-text search results toward Islay/Argyll, since that's where
// every visitor planning here actually is - format is west,north,east,south.
const ISLAY_VIEWBOX = "-6.7,55.95,-5.9,55.55";

const OTHER_VALUE = "__other__";

/**
 * Curated accommodation partners - real, sourced, official links (19 July
 * 2026): The Machrie's room booking is a JS widget with no direct URL, so
 * links to their official hotel page instead; Port Charlotte Hotel has a
 * real direct booking-engine link.
 *
 * Coordinates (21 July 2026): postal address taken from each hotel's own
 * official site (another.place/the-machrie/contact-us; portcharlottehotel.
 * co.uk/location), postcode geocoded via postcodes.io (ONS Postcode
 * Directory - same "postcode" sourcing method already used elsewhere for
 * Airtable Location Source). Postcode centroid, not the exact building -
 * fine for map/route purposes, same caveat as any postcode-based pin.
 */
export const FEATURED_STAYS: (TripAccommodation & { url: string })[] = [
  {
    name: "The Machrie",
    lat: 55.661753,
    lng: -6.250829,
    url: "https://another.place/the-machrie/hotel",
  },
  {
    name: "Port Charlotte Hotel",
    lat: 55.74021,
    lng: -6.378353,
    url: "https://bookings.hopsoftware.com/en/property/Port-Charlotte-Hotel",
  },
];

/**
 * Fixed area list (21 July 2026) - reuses coordinates already sourced and
 * live elsewhere in the app, rather than re-deriving anything: Port Ellen
 * and Bruichladdich from journeys-data.ts/days page, Port Askaig from the
 * Local Features "Ferry Port" record in Airtable. Not exhaustive (no
 * Portnahaven, Bridgend, Jura villages, etc. yet) - the "Other" group
 * below covers anywhere not listed here via the existing free-text search.
 */
const AREAS: TripAccommodation[] = [
  { name: "Port Ellen", lat: 55.630181, lng: -6.187415 },
  { name: "Bowmore", lat: 55.7557, lng: -6.2875 },
  { name: "Port Charlotte", lat: 55.74021, lng: -6.378353 },
  { name: "Bruichladdich", lat: 55.7638, lng: -6.3605 },
  { name: "Port Askaig", lat: 55.8476, lng: -6.1039 },
];

function featuredStayFor(name?: string) {
  return FEATURED_STAYS.find((s) => s.name === name);
}
function areaFor(name?: string) {
  return AREAS.find((a) => a.name === name);
}

/**
 * One combined "staying" control (rebuilt 21 July 2026, revised twice same
 * day after feedback). A single dropdown: Featured Stays (real hotels, book
 * that specific place) or Areas (general village, Hotels.com area search),
 * with its own "Other" group for anywhere not listed that reveals the
 * original free-text Nominatim search.
 *
 * No "I'll decide"/unset option any more (removed per feedback) - which
 * means the select always has to show a real, actually-applied choice
 * rather than an empty state, otherwise the dropdown could visually show
 * one thing (the browser's fallback-to-first-option behaviour) while the
 * day's real accommodation was still nothing behind the scenes. So this
 * still defaults to The Machrie the instant a day has no stay set yet -
 * same as the very first version of this control, brought back because
 * removing the placeholder option requires it, not by choice on its own.
 * Flagging this rather than assuming it's unwanted - easy to reintroduce
 * an explicit unset state if that's not right.
 */
export default function AccommodationControl({
  dayIndex,
  accommodation,
}: {
  dayIndex: number;
  accommodation?: TripAccommodation;
}) {
  const trip = useTrip();
  const [editingTown, setEditingTown] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFeatured = featuredStayFor(accommodation?.name);
  const activeArea = areaFor(accommodation?.name);
  const isCustomPlace = !!accommodation && !activeFeatured && !activeArea;

  const selectValue = editingTown ? OTHER_VALUE : isCustomPlace ? OTHER_VALUE : (accommodation?.name ?? "");

  useEffect(() => {
    if (!accommodation) {
      trip.setAccommodation(dayIndex, FEATURED_STAYS[0]);
    }
    // Only re-run when the day or its accommodation actually changes -
    // trip itself is a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodation, dayIndex]);

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
      setEditingTown(false);
      setQuery("");
    } catch {
      setError("Something went wrong looking that up - try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectChange(value: string) {
    setError(null);
    if (value === OTHER_VALUE) {
      setQuery(isCustomPlace && accommodation ? accommodation.name : "");
      setEditingTown(true);
      return;
    }
    const stay = featuredStayFor(value);
    if (stay) {
      setEditingTown(false);
      trip.setAccommodation(dayIndex, { name: stay.name, lat: stay.lat, lng: stay.lng });
      return;
    }
    const area = areaFor(value);
    if (area) {
      setEditingTown(false);
      trip.setAccommodation(dayIndex, area);
    }
  }

  const bookNowUrl = activeFeatured
    ? activeFeatured.url
    : buildAccommodationBookingLink(accommodation?.name ?? "Port Ellen", trip.tripDates);

  return (
    <div className="accommodation-row">
      <select
        className="accommodation-select"
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
      >
        <optgroup label="Featured stays">
          {FEATURED_STAYS.map((stay) => (
            <option key={stay.name} value={stay.name}>
              {stay.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Areas">
          {AREAS.map((area) => (
            <option key={area.name} value={area.name}>
              {area.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Other">
          <option value={OTHER_VALUE}>Type a place...</option>
        </optgroup>
      </select>

      {editingTown && (
        <>
          <input
            className="accommodation-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Where are you staying? e.g. Portnahaven"
            autoFocus
          />
          <button className="accommodation-btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Looking..." : "Set"}
          </button>
          <button
            className="accommodation-btn"
            onClick={() => {
              setEditingTown(false);
              setError(null);
            }}
          >
            Cancel
          </button>
          {error && <div className="accommodation-error">{error}</div>}
        </>
      )}

      {!editingTown && accommodation && (
        <>
          <span>
            🏠 Staying: <strong>{accommodation.name}</strong>
          </span>
          <a
            href={bookNowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="subcat-chip"
            style={{ background: "var(--green-deep)", color: "white", fontWeight: 600 }}
          >
            Book Now
          </a>
        </>
      )}
    </div>
  );
}
