import type { TripDates } from "@/lib/types";

/**
 * Real tracking code goes here once available (see 18 July 2026
 * conversation - Hotels.com confirmed as primary supplier, 4% hotel /
 * 2% vacation rental, 7-day cookie via the Expedia Group Travel Creator
 * Program). Link works without it, just earns no commission yet.
 *
 * HONEST CAVEAT (19 July 2026): the destination/date parameters below
 * are now confirmed correct - taken directly from a real, working
 * hotels.com SEARCH-RESULTS page URL Mark shared (not inferred from
 * docs, and not the property-page params an earlier version of this
 * function wrongly assumed also applied to search). What's still
 * unverified is whether mdpcid tracking survives being appended onto
 * this URL shape, since it wasn't part of Mark's organic example (no
 * affiliate link was involved when he generated it). Worth testing
 * with the real mdpcid once available, or checking with Expedia Group
 * support whether tracking works on this exact URL format.
 *
 * This mirrors the fuller three-supplier version built on the
 * accommodation-shell branch (Hotels.com/Vrbo/Booking.com, primary +
 * secondary links) - only the primary Hotels.com link is wired into the
 * live workspace header's inline "Book Now" for now, kept deliberately
 * simple. Worth consolidating into one shared module once that branch
 * merges, rather than maintaining two copies of the same link-building
 * logic.
 */
const HOTELS_MDPCID = "YOUR_MDPCID_HERE";

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Falls back to a placeholder ~2-week-out, 3-night stay when the visitor
 *  hasn't set real trip dates yet, so the link is never just broken. */
function resolveCheckinCheckout(tripDates?: TripDates): { checkin: string; checkout: string } {
  if (tripDates?.mode === "range" && tripDates.confirmed && tripDates.startDate && tripDates.endDate) {
    return { checkin: tripDates.startDate, checkout: tripDates.endDate };
  }
  if (tripDates?.mode === "month" && tripDates.confirmed && tripDates.month) {
    // "Just this month" doesn't map to one exact date pair, since Hotels.com
    // needs real dates - defaults to the 1st-28th of that month (28 used
    // deliberately so it's always a valid date regardless of the month's
    // actual length), giving the widest reasonable span rather than a
    // short representative stay. Still adjustable by the visitor once
    // they land on the real search results.
    const checkin = `${tripDates.month}-01`;
    const checkout = `${tripDates.month}-28`;
    return { checkin, checkout };
  }
  const today = new Date().toISOString().slice(0, 10);
  return { checkin: addDays(today, 14), checkout: addDays(today, 17) };
}

// Real coordinates for each village, used alongside the text destination -
// matches the pattern in a real, confirmed hotels.com search URL (19 July
// 2026), which included both. Same figures used elsewhere on the site
// (MapCanvas, HubDayMap).
const VILLAGE_COORDS: Record<string, { lat: number; lng: number }> = {
  "Port Ellen": { lat: 55.63, lng: -6.188 },
  Bowmore: { lat: 55.7557, lng: -6.2875 },
};

export function buildAccommodationBookingLink(location: string, tripDates?: TripDates): string {
  const { checkin, checkout } = resolveCheckinCheckout(tripDates);
  // Parameter names confirmed 19 July 2026 from a real, working
  // hotels.com SEARCH-RESULTS page URL - genuinely different from the
  // PROPERTY page's params used in the previous (wrong) version of this
  // function. Search results use d1/startDate (duplicated) for check-in,
  // d2/endDate (duplicated) for check-out, and adults/rooms rather than
  // rm1=a2. regionId is a hotels.com-internal ID we don't have a source
  // for per village, so it's deliberately omitted - destination (free
  // text) plus latLong should still resolve correctly without it.
  const coords = VILLAGE_COORDS[location];
  const params = new URLSearchParams({
    destination: `${location}, Islay, Scotland`,
    ...(coords ? { latLong: `${coords.lat},${coords.lng}` } : {}),
    flexibility: "0_DAY",
    d1: checkin,
    startDate: checkin,
    d2: checkout,
    endDate: checkout,
    adults: "2",
    rooms: "1",
    mdpcid: HOTELS_MDPCID,
  });
  return `https://uk.hotels.com/Hotel-Search?${params.toString()}`;
}

/* BOOKING.COM REMOVED, 16 Sep 2026.
 *
 * buildBookingComLink stood here since 19 July as the "secondary
 * supplier", building a Booking.com search URL with an `aid` affiliate
 * parameter set to the literal string "YOUR_AID_HERE".
 *
 * Mark confirmed on 16 Sep that there is no Booking.com affiliate
 * account, and there never was. So the parameter was never going to
 * resolve to anything: every click sent through it was an ordinary
 * unattributed visit dressed up as a tracked one, and the affiliate
 * disclosure listed a programme the site is not in - which is the one
 * thing a disclosure must never do.
 *
 * Deleted rather than reduced to a plain link. Nothing in the live UI
 * called it, and a dormant link builder for a supplier we have no
 * relationship with is an invitation to wire it up later without anyone
 * rechecking why it was disabled. If Booking.com is ever joined
 * properly, this is a small function to write again with a real id. */

