// Core domain types for DramStory.
// Data sources per the locked architecture:
//   Distilleries / Local Events / Natural Features / Local Features -> Airtable
//   Pubs / Cafes / Restaurants                                      -> Google Places
//   Accommodation                                                    -> Booking.com (fallback: Google Places "lodging")

export type DataSource = "airtable" | "google" | "booking" | "mock";

export interface Tour {
  name: string;
  duration: string;
  price: number;
  description: string;
}

export interface NearbyFeature {
  name: string;
  type: string;
  icon: string;
  distance: string;
  category: "viewpoint" | "attraction" | "beach" | "accommodation" | "food" | "walk";
}

/** A Natural Feature plotted directly on the workspace map (Beach, Walk,
 *  Bike Route, or Local Gem) - distinct from NearbyFeature above, which is
 *  the per-distillery "Nearby" list on each distillery's own page. This is
 *  the island-wide set used to populate map pins when that filter category
 *  is toggled on. */
export interface LocalFeature {
  id: string;
  slug: string;
  name: string;
  category: "beach" | "walk" | "bike-route" | "local-gem";
  icon: string;
  description: string;
  lat: number;
  lng: number;
  parking: string;
  accessibility: string;
  openingHours: string;
  /** "Best features" - one per line in Airtable, split into an array. */
  highlights: string[];
  /** Walks/bike routes only - undefined for beaches and local gems. */
  length?: string;
  duration?: string;
  difficulty?: string;
}

export interface Distillery {
  id: string;
  slug: string;
  name: string;
  region: string;
  style: "Heavily Peated" | "Medium Peated" | "Light" | string;
  lat: number;
  lng: number;
  founded: number;
  tagline: string;
  description: string;
  image: string;
  tours: Tour[];
  hours: string;
  priceFrom: string;
  avgVisit: string;
  parking: string;
  accessibility: string;
  motorhomeFriendly: boolean;
  giftShop: boolean;
  restaurantName: string | null;
  facilities: string[];
  nearby: NearbyFeature[];
  nextStops: string[];
  bookingUrl?: string;
  source: DataSource;
}

export interface LocalEvent {
  id: string;
  name: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  link?: string;
  category: "Distillery Event" | "Festival" | "Seasonal Release" | "Other";
  source: DataSource;
}

/** A generic point-of-interest layer item (Pubs / Cafes / Restaurants via Google, or the
 *  Booking.com-fallback Accommodation layer). Deliberately provider-agnostic so swapping
 *  the underlying source is a config change, not a component rewrite. */
export interface PlaceListing {
  id: string;
  name: string;
  category: "pub" | "cafe" | "restaurant" | "accommodation";
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  address?: string;
  photoUrl?: string;
  /** Present only for real Booking.com results — absent when falling back to Google */
  pricePerNight?: number;
  affiliateUrl?: string;
  websiteUrl?: string;
  source: DataSource;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string;
  source: DataSource;
}

// ─────────────────────────────────────────────────────────────────────────
// JOURNEY PLANNER INTAKE — Q1 (When) is answered on the homepage Hero and
// passed through as ?mode=. Q2 (Where) and Q3 (What matters) are answered
// on /journey before the workspace (map + itinerary) loads.
// ─────────────────────────────────────────────────────────────────────────

/** Q1 — answered on the homepage Hero, passed through as the `mode` query param. */
export type TripTiming = "today" | "planning" | "inspiration";

export type RegionId = "islay" | "speyside" | "highland" | "campbeltown" | "lowland";

/** Step 3 of 4 — "How long will your adventure last?" */
export type TripLength = "day-trip" | "weekend" | "3-5-days" | "week-plus";

/** Q2 — "Where does your story take you?" Three distinct shapes depending on
 *  which of the 7 options the visitor picks. Only "islay" has live Airtable
 *  data today; every other region still routes to the workspace, just with
 *  no populated overlay yet. */
export type LocationAnswer =
  | { kind: "region"; region: RegionId }
  | { kind: "airport"; airportName: string }
  | { kind: "distillery"; distillerySlug: string };

/** Q3 — "What matters most to your trip?" Multi-select; Distilleries is
 *  always-on (it's the core of the site), the other 5 are toggleable and
 *  double as the map's top-bar layer filters later in the workspace. */
export type InterestCategoryId =
  | "distilleries"
  | "natural-features"
  | "local-attractions"
  | "local-events"
  | "places-to-eat"
  | "places-to-stay";

export interface TripIntake {
  timing: TripTiming;
  location: LocationAnswer;
  tripLength: TripLength;
  interests: InterestCategoryId[];
}

// ─────────────────────────────────────────────────────────────────────────
// ITINERARY — day-based model for the workspace panel. Day count is seeded
// from the trip-length answer (see TRIP_LENGTHS in journey-options.ts) and
// the visitor can add more days freely (mainly useful for the "just
// dreaming" flow, where the length was only ever a rough guess).
//
// When the location answer is "airport", Day 1 shows an arrival banner and
// the LAST day shows a departure banner at that airport. These aren't
// stored stops — they're derived from `days.length` + the location answer
// wherever they're rendered, so adding/removing a day "automatically
// updates" the itinerary for free instead of needing to re-sync stored
// data every time the day count changes.
// ─────────────────────────────────────────────────────────────────────────

export type ItineraryStop = (
  | { kind: "distillery"; distillery: Distillery; tour?: Tour }
  | { kind: "feature"; feature: LocalFeature }
) & {
  /** Visitor-adjusted visit duration (minutes), overriding the default
   *  estimate (a distillery's avgVisit, or the flat feature estimate) -
   *  set via the +/- toggle next to the "~X visit" line. Undefined means
   *  "use the default estimate". */
  customMinutes?: number;
};

export interface ItineraryDay {
  id: string;
  label: string;
  stops: ItineraryStop[];
}
