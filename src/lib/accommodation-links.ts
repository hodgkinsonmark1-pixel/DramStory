import type { TripDates } from "@/lib/types";

/**
 * Real tracking code goes here once available (see 18 July 2026
 * conversation - Hotels.com confirmed as primary supplier, 4% hotel /
 * 2% vacation rental, 7-day cookie via the Expedia Group Travel Creator
 * Program). Link works without it, just earns no commission yet.
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
  const today = new Date().toISOString().slice(0, 10);
  return { checkin: addDays(today, 14), checkout: addDays(today, 17) };
}

export function buildAccommodationBookingLink(location: string, tripDates?: TripDates): string {
  const { checkin, checkout } = resolveCheckinCheckout(tripDates);
  const params = new URLSearchParams({
    SearchType: "Destination",
    CityName: `${location}, Islay, Scotland`,
    StartDate: checkin,
    EndDate: checkout,
    NumRoom: "1",
    NumAdult1: "2",
    mdpcid: HOTELS_MDPCID,
  });
  return `https://www.hotels.com/go/hotel/search/Destination?${params.toString()}`;
}
