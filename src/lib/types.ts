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
