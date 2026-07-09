import type { AirtableAttachment } from "@/lib/airtable";
import type { Distillery, JournalPost, LocalEvent, LocalFeature, NearbyFeature, Tour } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Raw shapes as returned by the Airtable REST API for each table.
// Field names here must match the Airtable column names exactly.
// ─────────────────────────────────────────────────────────────────────────

export interface AirtableDistilleryFields {
  Name?: string;
  Slug?: string;
  Region?: string;
  Style?: string;
  Latitude?: number;
  Longitude?: number;
  Founded?: number;
  Tagline?: string;
  Description?: string;
  "Hero Image"?: AirtableAttachment[];
  Hours?: string;
  "Price From"?: number;
  "Avg Visit"?: string;
  Parking?: string;
  Accessibility?: string;
  "Motorhome Friendly"?: boolean;
  "Gift Shop"?: boolean;
  "Restaurant Name"?: string;
  Facilities?: string[];
  "Booking URL"?: string;
  Tours?: string[]; // linked record IDs -> Tours table
  "Local Features"?: string[]; // linked record IDs -> Local Features table
  "Status Notice"?: string;
  "Why Visit"?: string;
  Gallery?: AirtableAttachment[];
  "Fun Facts"?: string;
  History?: string;
  "Whisky Profile"?: string;
}

export interface AirtableTourFields {
  Name?: string;
  Distillery?: string[];
  Duration?: string;
  Price?: number;
  Description?: string;
}

export interface AirtableJournalFields {
  Title?: string;
  Slug?: string;
  "Meta Description"?: string;
  "Hero Image"?: AirtableAttachment[];
  "Inline Image 1"?: AirtableAttachment[];
  "Inline Image 2"?: AirtableAttachment[];
  "Inline Image 3"?: AirtableAttachment[];
  Body?: string;
  Published?: boolean;
  "Published Date"?: string;
  Category?: string;
}

export function mapToJournalPost(fields: AirtableJournalFields, id: string): JournalPost {
  return {
    id,
    slug: fields.Slug ?? "",
    title: fields.Title ?? "",
    metaDescription: fields["Meta Description"] ?? "",
    heroImage: fields["Hero Image"]?.[0]?.url ?? "",
    inlineImages: [
      fields["Inline Image 1"]?.[0]?.url ?? "",
      fields["Inline Image 2"]?.[0]?.url ?? "",
      fields["Inline Image 3"]?.[0]?.url ?? "",
    ],
    body: fields.Body ?? "",
    publishedDate: fields["Published Date"] ?? "",
    category: fields.Category,
  };
}

export interface AirtableLocalFeatureFields {
  Name?: string;
  Category?: string;
  Icon?: string;
  Description?: string;
  Distilleries?: string[];
  Distance?: string;
  Latitude?: number;
  Longitude?: number;
  Slug?: string;
  Parking?: string;
  Accessibility?: string;
  "Opening Hours"?: string;
  Highlights?: string;
  Length?: string;
  Duration?: string;
  Difficulty?: string;
  Website?: string;
  "Food Hygiene Rating"?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────────────────────────────────

/** Airtable's "Category" select options -> our fixed NearbyFeature category union. */
export function mapFeatureCategory(category?: string): NearbyFeature["category"] {
  switch (category) {
    case "Viewpoint":
      return "viewpoint";
    case "Beach":
      return "beach";
    case "Walk":
      return "walk";
    case "Historic Site":
      return "attraction";
    default:
      return "attraction";
  }
}

export function mapTour(fields: AirtableTourFields): Tour {
  return {
    name: fields.Name ?? "",
    duration: fields.Duration ?? "",
    price: fields.Price ?? 0,
    description: fields.Description ?? "",
  };
}

export function mapLocalFeature(fields: AirtableLocalFeatureFields): NearbyFeature {
  return {
    name: fields.Name ?? "",
    type: fields.Category ?? "",
    icon: fields.Icon ?? "📍",
    distance: fields.Distance ?? "",
    category: mapFeatureCategory(fields.Category),
  };
}

// Airtable Category values mapped to map-plottable LocalFeature categories.
// Pub/Cafe/Restaurant are OSM-sourced (ODbL, freely reusable - unlike
// Google/TripAdvisor/Yelp, see chat history) real venues, same real-pin
// treatment as everything else here.
const LOCAL_FEATURE_CATEGORY_MAP: Record<string, LocalFeature["category"] | undefined> = {
  Beach: "beach",
  Walk: "walk",
  "Bike Route": "bike-route",
  "Local Gem": "local-gem",
  "Historic Site": "historic-site",
  "Attraction Gem": "attraction-gem",
  Pub: "pub",
  Cafe: "cafe",
  Restaurant: "restaurant",
  Golf: "golf",
  Spa: "spa",
  "Ferry Port": "transport",
};

/** Maps a raw Local Features record into a map-plottable LocalFeature.
 *  Returns null for unrecognized categories or records missing
 *  coordinates - both are simply excluded from the map. */
export function mapToLocalFeature(id: string, fields: AirtableLocalFeatureFields): LocalFeature | null {
  // Coordinate provenance: every Natural Feature record now has a
  // "Location Source" field in Airtable recording exactly how its
  // coordinates were verified (postcode, OS Grid Reference + source, or
  // an honest note that it's a reasoned estimate) - see that field for
  // the audit trail rather than guessing at accuracy from this code.
  const category = LOCAL_FEATURE_CATEGORY_MAP[fields.Category ?? ""];
  if (!category || fields.Latitude == null || fields.Longitude == null) return null;
  return {
    id,
    slug: fields.Slug || id,
    name: fields.Name ?? "",
    category,
    icon: fields.Icon ?? "📍",
    description: fields.Description ?? "",
    lat: fields.Latitude,
    lng: fields.Longitude,
    parking: fields.Parking ?? "",
    accessibility: fields.Accessibility ?? "",
    openingHours: fields["Opening Hours"] ?? "",
    highlights: (fields.Highlights ?? "").split("\n").filter((line) => line.trim().length > 0),
    length: fields.Length,
    duration: fields.Duration,
    difficulty: fields.Difficulty,
    websiteUrl: fields.Website,
    hygieneRating: fields["Food Hygiene Rating"],
  };
}

/** Great-circle distance in km between two lat/lng points (haversine). */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Airtable has no "Next Stops" field. We derive a sensible default —
 * the two geographically nearest other distilleries — so the itinerary
 * "where next" UI still has data. Mark can override this later by adding
 * a real "Next Stops" linked-record field in Airtable if curated routes
 * (rather than pure distance) are wanted.
 */
export function deriveNextStops(target: Distillery, all: Distillery[]): string[] {
  return all
    .filter((d) => d.slug !== target.slug)
    .map((d) => ({ slug: d.slug, dist: distanceKm(target, d) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2)
    .map((d) => d.slug);
}

export interface AirtableEventFields {
  Name?: string;
  Date?: string;
  "End Date"?: string;
  Time?: string;
  Location?: string;
  Description?: string;
  Link?: string;
  Category?: string;
  Price?: string;
  "Source URL"?: string;
  Distilleries?: string[];
}

const EVENT_CATEGORY_MAP: Record<string, LocalEvent["category"]> = {
  "Distillery Event": "Distillery Event",
  Festival: "Festival",
  "Seasonal Release": "Seasonal Release",
  Other: "Other",
};

/** Maps a raw Events record, resolving linked distillery record IDs to
 *  slugs against the already-fetched distilleries list (Airtable link
 *  fields return {id, name} pairs, not slugs, so this cross-reference is
 *  needed to link an event to a map pin). */
export function mapToLocalEvent(
  id: string,
  fields: AirtableEventFields,
  allDistilleries: Distillery[]
): LocalEvent | null {
  if (!fields.Name || !fields.Date) return null;
  const linkedIds = fields.Distilleries ?? [];
  const distillerySlugs = allDistilleries.filter((d) => linkedIds.includes(d.id)).map((d) => d.slug);
  return {
    id,
    name: fields.Name,
    date: fields.Date,
    endDate: fields["End Date"],
    time: fields.Time,
    location: fields.Location ?? "",
    description: fields.Description ?? "",
    link: fields.Link,
    category: EVENT_CATEGORY_MAP[fields.Category ?? ""] ?? "Other",
    price: fields.Price,
    sourceUrl: fields["Source URL"],
    distillerySlugs,
    source: "airtable",
  };
}
