"use client";

import { useEffect, useState } from "react";
import { useTrip } from "@/lib/trip-context";
import { buildAccommodationBookingLink } from "@/lib/accommodation-links";
import type { TripAccommodation } from "@/lib/types";

// Biases free-text search results toward Islay/Argyll, since that's where
// every visitor planning here actually is - format is west,north,east,south.
const ISLAY_VIEWBOX = "-6.7,55.95,-5.9,55.55";

/**
 * Curated accommodation partners - real, sourced, official links (19 July
 * 2026): The Machrie's room booking is a JS widget with no direct URL, so
 * links to their official hotel page instead; Port Charlotte Hotel has a
 * real direct booking-engine link.
 *
 * Coordinates (21 July 2026): postal address taken from each hotel's own
 * official site (another.place/the-machrie/contact-us; portcharlottehotel.
 * co.uk/location), postcode geocoded via postcodes.io (built on the ONS
 * Postcode Directory - same "postcode" sourcing method already used
 * elsewhere for Airtable Location Source). This is a postcode centroid,
 * not the exact building entrance - fine for map/route purposes, same
 * caveat that applies to any postcode-based pin.
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

function featuredStayFor(name?: string) {
  return FEATURED_STAYS.find((s) => s.name === name);
}

/**
 * One combined "staying" control (rebuilt 21 July 2026 - was previously two
 * separate mechanisms: a free-text place search here, and an unrelated
 * "Featured Stays" chip row elsewhere that only changed which link Book Now
 * pointed to). Now a single box: pick a Featured Stay (real booking link to
 * that hotel) or type any other place (Book Now searches Hotels.com for
 * that area). Whichever is picked becomes the real accommodation for the
 * day - same as before, this is what gives the day's route and drive-time
 * totals a real start/end point, not just a booking convenience.
 *
 * Defaults to the first Featured Stay (The Machrie) the moment this day has
 * no stay set yet, so there's always a Book Now link ready, and the map pin
 * / route reflect a real stay from the start rather than nothing at all.
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

  const bookNowUrl = activeFeatured
    ? activeFeatured.url
    : buildAccommodationBookingLink(accommodation?.name ?? "Port Ellen", trip.tripDates);

  return (
    <div className="accommodation-row">
      {FEATURED_STAYS.map((stay) => (
        <button
          key={stay.name}
          className={"subcat-chip" + (accommodation?.name === stay.name ? " active" : "")}
          onClick={() => {
            trip.setAccommodation(dayIndex, { name: stay.name, lat: stay.lat, lng: stay.lng });
            setEditingTown(false);
          }}
        >
          {stay.name}
        </button>
      ))}
      <button
        className={"subcat-chip" + (editingTown || (accommodation && !activeFeatured) ? " active" : "")}
        onClick={() => {
          setQuery(accommodation && !activeFeatured ? accommodation.name : "");
          setEditingTown(true);
        }}
      >
        Other place
      </button>

      {editingTown ? (
        <>
          <input
            className="accommodation-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Where are you staying? e.g. Bowmore"
            autoFocus
          />
          <button className="accommodation-btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Looking..." : "Set"}
          </button>
          <button className="accommodation-btn" onClick={() => setEditingTown(false)}>
            Cancel
          </button>
          {error && <div className="accommodation-error">{error}</div>}
        </>
      ) : (
        accommodation && (
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
        )
      )}
    </div>
  );
}
