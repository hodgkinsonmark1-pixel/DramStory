import type { TripDates } from "@/lib/types";

/**
 * Real tracking code goes here once available (see 18 July 2026
 * conversation - Hotels.com confirmed as primary supplier, 4% hotel /
 * 2% vacation rental, 7-day cookie via the Expedia Group Travel Creator
 * Program). Link works without it, just earns no commission yet.
 *
 * HONEST CAVEAT (19 July 2026): appending mdpcid directly onto this
 * hotels.com/Hotel-Search URL (rather than via Expedia's documented
 * /go/ deeplink redirector) hasn't been independently verified to
 * actually track commission - it may simply be ignored as an unknown
 * param. The destination/date fix below is confirmed correct (matches
 * a real, working hotels.com URL Mark shared), but the *tracking*
 * mechanism on this exact URL shape is unconfirmed. Worth testing with
 * the real mdpcid once available, or checking with Expedia Group
 * support whether tracking survives on this URL format specifically.
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
  // Uses the same parameter names confirmed directly from a real,
  // working hotels.com URL (19 July 2026 conversation) - chkin/chkout/
  // destination - rather than Expedia's generic /go/ deeplink redirector
  // format (StartDate/EndDate), which didn't appear to carry dates
  // through correctly in practice.
  const params = new URLSearchParams({
    destination: `${location}, Islay, Scotland`,
    chkin: checkin,
    chkout: checkout,
    rm1: "a2", // room 1: 2 adults
    mdpcid: HOTELS_MDPCID,
  });
  return `https://uk.hotels.com/Hotel-Search?${params.toString()}`;
}
