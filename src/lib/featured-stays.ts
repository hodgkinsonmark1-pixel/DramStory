import type { TripAccommodation } from "@/lib/types";

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
 *
 * Ardbeg House and Bridgend Hotel added 22 July 2026, same sourcing
 * method. One correction worth flagging: the booking link Mark passed
 * for Ardbeg House (/pages/stay-with-us) turned out to be an
 * informational page, not the real booking flow - the site's actual
 * "Book A Room" button goes to a Mews distributor URL, used below
 * instead. Bridgend Hotel's link matched exactly what the site's own
 * nav uses, no correction needed there. Postcodes: Ardbeg House PA42
 * 7DU (from the site's own privacy policy, which lists it as the
 * registered address - the site has no address on its contact/about
 * pages themselves); Bridgend Hotel PA44 7PQ (site's own /front-desk
 * page).
 *
 * Lives in its own module (moved out of AccommodationControl.tsx on 21
 * July 2026) so trip-context.tsx can default a new day's accommodation to
 * FEATURED_STAYS[0] without importing a "use client" component into the
 * context provider (and without risking a trip-context <-> component
 * circular import, since AccommodationControl itself imports useTrip from
 * trip-context).
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
  {
    name: "Ardbeg House",
    lat: 55.629847,
    lng: -6.153463,
    url: "https://app.mews.com/distributor/6d4a3b9d-d591-42e5-93a2-b259009afe58",
  },
  {
    name: "Bridgend Hotel",
    lat: 55.785858,
    lng: -6.258693,
    url: "https://www.bridgend-hotel.com/book-now",
  },
];
