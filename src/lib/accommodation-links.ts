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
/**
 * THE AFFILIATE WRAPPER (21 Sep 2026), replacing seven weeks of
 * `mdpcid=YOUR_MDPCID_HERE`.
 *
 * Until today every "Book Now" on the site carried that literal string.
 * The links worked - people reached Hotels.com and could book - they
 * simply earned nothing, and the affiliate disclosure named the Expedia
 * Group Travel Creator Program the whole time. That is the same failure
 * as the Discover Cars label, found the same day: a claim the plumbing
 * could not honour.
 *
 * WHY THE SHAPE MATTERS, and why it took a real generated link to know.
 * The Travel Creator Program is built around hand-made links, one per
 * page - its own help pages say to filter and sort a search, then
 * generate a link for that exact URL. That would have been fatal here,
 * because these links are built live from whatever dates the visitor has
 * set: we would have had to drop the dates and fall back to one fixed
 * link per village.
 *
 * It turned out to be a WRAPPER rather than a rewritten URL. The target
 * goes in `landingPage`, url-encoded, and the three tracking values stay
 * put. So the search can still be assembled at request time and then
 * wrapped, and nothing about the visitor's dates is lost.
 *
 * THESE THREE VALUES ARE NOT SECRETS. They appear in every outbound
 * accommodation link on a published page; they identify DramStory to
 * Expedia, not the visitor to anyone. Taken from a link Mark generated
 * in the Link builder on 21 Sep.
 */
const EXPEDIA_AFFILIATE = {
  camref: "1011l5NpTj",
  creativeref: "1011l66932",
  adref: "PZ1Y9ZzywC",
} as const;

/** Wraps a finished Expedia Group URL in the affiliate redirect. Kept
 *  separate so that anything else on the site that ever needs to link to
 *  Hotels.com goes through one place - the mistake this replaces was
 *  partly that the tracking value was buried inside one function's
 *  parameter list, where nobody looked at it for seven weeks. */
function withAffiliateTracking(targetUrl: string): string {
  const params = new URLSearchParams({
    landingPage: targetUrl,
    ...EXPEDIA_AFFILIATE,
  });
  return `https://www.hotels.com/affiliate?${params.toString()}`;
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Falls back to a placeholder ~2-week-out stay when the visitor hasn't
 *  set real trip dates yet, so the link is never just broken. Three
 *  nights unless the caller knows better - a Journey does (26 Sep 2026):
 *  searching three nights for a five-night trip sent the reader to the
 *  wrong availability. */
function resolveCheckinCheckout(
  tripDates?: TripDates,
  fallbackNights = 3
): { checkin: string; checkout: string } {
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
  // A Journey with a blank Nights cell passes 0, which would make checkout
  // equal checkin - not a search Hotels.com can run.
  const nights = fallbackNights > 0 ? fallbackNights : 3;
  return { checkin: addDays(today, 14), checkout: addDays(today, 14 + nights) };
}

// Real coordinates for each village, used alongside the text destination -
// matches the pattern in a real, confirmed hotels.com search URL (19 July
// 2026), which included both. Same figures used elsewhere on the site
// (MapCanvas, HubDayMap).
const VILLAGE_COORDS: Record<string, { lat: number; lng: number }> = {
  "Port Ellen": { lat: 55.63, lng: -6.188 },
  Bowmore: { lat: 55.7557, lng: -6.2875 },
};

export function buildAccommodationBookingLink(
  location: string,
  tripDates?: TripDates,
  fallbackNights?: number
): string {
  const { checkin, checkout } = resolveCheckinCheckout(tripDates, fallbackNights);
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
  });
  /* mdpcid is gone from here. The tracking no longer rides inside the
     search URL as a parameter Hotels.com has to notice - the whole search
     is now the payload of an affiliate redirect that exists to record the
     click first. */
  return withAffiliateTracking(`https://uk.hotels.com/Hotel-Search?${params.toString()}`);
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

