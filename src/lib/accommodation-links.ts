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
    // needs real dates - defaults to the 10th of that month for 3 nights, a
    // reasonable placeholder the visitor can still adjust once they land on
    // the real search results. Better than silently ignoring the month
    // they actually picked in favour of an unrelated ~2-weeks-from-today
    // fallback.
    const checkin = `${tripDates.month}-10`;
    const checkout = addDays(checkin, 3);
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

/**
 * Booking.com - secondary supplier, deliberately smaller/less prominent
 * than Hotels.com in the UI (19 July 2026: "clearly as a 2nd option...
 * not on equal booking"). Session-based attribution, not a multi-day
 * cookie - see business-plan.md, Pillar 5, for the reasoning behind
 * Hotels.com being primary instead.
 */
const BOOKING_AID = "YOUR_AID_HERE";

export function buildBookingComLink(location: string, tripDates?: TripDates): string {
  const { checkin, checkout } = resolveCheckinCheckout(tripDates);
  const params = new URLSearchParams({
    aid: BOOKING_AID,
    ss: `${location}, Islay, Scotland`,
    checkin,
    checkout,
    group_adults: "2",
    no_rooms: "1",
    selected_currency: "GBP",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}
