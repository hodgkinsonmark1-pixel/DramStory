"use client";

import { useEffect, useState } from "react";
import { useTrip } from "@/lib/trip-context";
import { buildAccommodationBookingLink } from "@/lib/accommodation-links";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import type { TripAccommodation } from "@/lib/types";

// Biases free-text search results toward Islay/Argyll, since that's where
// every visitor planning here actually is - format is west,north,east,south.
const ISLAY_VIEWBOX = "-6.7,55.95,-5.9,55.55";

const OTHER_VALUE = "__other__";

// FEATURED_STAYS itself now lives in @/lib/featured-stays (21 July 2026) so
// trip-context.tsx can default a brand-new day's accommodation to it too,
// without importing a "use client" component into the context provider.
// Re-exported here so nothing already importing it from this file breaks.
export { FEATURED_STAYS };

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
  dayLabel,
  accommodation,
}: {
  dayIndex: number;
  /** Whatever this day is called in the itinerary panel ("Day 3", or a
   *  real calendar date once dates are confirmed) - only used to word the
   *  scope-confirm prompt below ("...Tue 4 Aug onward" reads better than
   *  a bare index). */
  dayLabel: string;
  accommodation?: TripAccommodation;
}) {
  const trip = useTrip();
  const [editingTown, setEditingTown] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A newly-picked place waits here for a scope decision rather than
  // applying straight away (23 July 2026, replacing a "changeFromHereOnly"
  // checkbox that had to be ticked BEFORE picking a place to have any
  // effect - confirmed live by Mark: ticking it AFTER picking silently
  // did nothing, because the pick had already committed with whatever the
  // checkbox said at that instant. A pre-set toggle governing a later,
  // unrelated click is inherently order-sensitive; asking the scope
  // question immediately after the pick removes the ordering entirely -
  // there's no longer a "wrong order" available. See stageOrApply below.
  const [pendingAccommodation, setPendingAccommodation] = useState<TripAccommodation | null>(null);

  // With no earlier day in the trip, "the whole trip" and "from here
  // onward" are the exact same set of days - nothing to ask, so day 1
  // (and any single-day trip) commits immediately, same one-click feel
  // as before this fix.
  const hasEarlierDays = dayIndex > 0;

  function commitAccommodation(next: TripAccommodation, scope: "all" | "fromHere") {
    trip.setAccommodationFromDay(dayIndex, next, scope);
    setPendingAccommodation(null);
  }

  function stageOrApply(next: TripAccommodation) {
    if (hasEarlierDays) {
      setPendingAccommodation(next);
    } else {
      commitAccommodation(next, "all");
    }
  }

  // While a pick is awaiting its scope decision, the dropdown and "Staying"
  // label reflect that pick immediately (feels responsive - nothing about
  // the click looks rejected) rather than the still-current accommodation,
  // which only the confirm prompt below replaces.
  const displayedAccommodation = pendingAccommodation ?? accommodation;
  const activeFeatured = featuredStayFor(displayedAccommodation?.name);
  const activeArea = areaFor(displayedAccommodation?.name);
  const isCustomPlace = !!displayedAccommodation && !activeFeatured && !activeArea;

  const selectValue = editingTown ? OTHER_VALUE : isCustomPlace ? OTHER_VALUE : (displayedAccommodation?.name ?? "");

  useEffect(() => {
    if (!accommodation) {
      // Carries forward the nearest EARLIER day's already-chosen
      // accommodation, same reasoning as trip-context.tsx's addDay/
      // syncDayCount (22 July 2026) - only actually falls back to The
      // Machrie if no earlier day has one set either (a brand-new trip's
      // very first day, most notably). Without this, a day that somehow
      // reaches this control with no accommodation yet (e.g. one of
      // initDays' seeded days, before either of those other two code
      // paths get a chance to set one) would silently default back to
      // The Machrie regardless of what the visitor had already chosen
      // elsewhere in the trip.
      let carried: TripAccommodation | undefined;
      for (let i = dayIndex - 1; i >= 0; i--) {
        if (trip.days[i]?.accommodation) {
          carried = trip.days[i].accommodation;
          break;
        }
      }
      trip.setAccommodation(dayIndex, carried ?? FEATURED_STAYS[0]);
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
      stageOrApply({
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
      setPendingAccommodation(null);
      setQuery(isCustomPlace && displayedAccommodation ? displayedAccommodation.name : "");
      setEditingTown(true);
      return;
    }
    const stay = featuredStayFor(value);
    if (stay) {
      setEditingTown(false);
      stageOrApply({ name: stay.name, lat: stay.lat, lng: stay.lng });
      return;
    }
    const area = areaFor(value);
    if (area) {
      setEditingTown(false);
      stageOrApply(area);
    }
  }

  const bookNowUrl = activeFeatured
    ? activeFeatured.url
    : buildAccommodationBookingLink(displayedAccommodation?.name ?? "Port Ellen", trip.tripDates);
  // Label matches what the link actually does (21 July 2026 fix) - a
  // Featured Stay is a real named property, so "Book Now" is accurate;
  // an Area or free-text place goes to a Hotels.com SEARCH-RESULTS page
  // for that place, not a specific booking, so calling that "Book Now"
  // overstated it. "Search Hotels.com" reads honestly either way, named
  // (an Area) or not (a custom free-text place).
  const bookNowLabel = activeFeatured ? "Book Now" : "Search Hotels.com";

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

      {/* Scope confirm - only reachable via stageOrApply, which only stages
          (rather than committing immediately) when there's an earlier day
          for the choice to actually matter for. Asking right after the
          pick, rather than via a toggle set beforehand, means there's no
          "wrong order" left for a visitor to get caught by (23 July
          2026 - see the pendingAccommodation comment above for the bug
          this replaces). */}
      {!editingTown && pendingAccommodation && (
        <div className="accommodation-scope-confirm">
          <span>
            Stay at <strong>{pendingAccommodation.name}</strong> for:
          </span>
          <button
            className="accommodation-btn"
            onClick={() => commitAccommodation(pendingAccommodation, "all")}
          >
            Your whole trip
          </button>
          <button
            className="accommodation-btn"
            onClick={() => commitAccommodation(pendingAccommodation, "fromHere")}
          >
            Just {dayLabel} onward
          </button>
          <button
            className="accommodation-btn accommodation-btn-quiet"
            onClick={() => setPendingAccommodation(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {!editingTown && !pendingAccommodation && accommodation && (
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
            {bookNowLabel}
          </a>
        </>
      )}
    </div>
  );
}
