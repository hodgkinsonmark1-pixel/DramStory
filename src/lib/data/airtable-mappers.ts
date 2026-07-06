import type { AirtableAttachment } from "@/lib/airtable";
import type { Distillery, LocalFeature, NearbyFeature, Tour } from "@/lib/types";

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
}

export interface AirtableTourFields {
  Name?: string;
  Distillery?: string[];
  Duration?: string;
  Price?: number;
  Description?: string;
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

// Only these 4 Airtable Category values are Natural Features meant for the
// workspace map's overlay - "Historic Site" etc. belong to Local
// Attractions, a separate pass not built yet, so they're excluded here.
const NATURAL_FEATURE_CATEGORY_MAP: Record<string, LocalFeature["category"] | undefined> = {
  Beach: "beach",
  Walk: "walk",
  "Bike Route": "bike-route",
  "Local Gem": "local-gem",
};

/** Maps a raw Local Features record into a map-plottable LocalFeature.
 *  Returns null for non-Natural-Feature categories (e.g. Historic Site)
 *  or records missing coordinates - both are simply excluded from the map. */
export function mapToLocalFeature(id: string, fields: AirtableLocalFeatureFields): LocalFeature | null {
  const category = NATURAL_FEATURE_CATEGORY_MAP[fields.Category ?? ""];
  if (!category || fields.Latitude == null || fields.Longitude == null) return null;
  return {
    id,
    name: fields.Name ?? "",
    category,
    icon: fields.Icon ?? "📍",
    description: fields.Description ?? "",
    lat: fields.Latitude,
    lng: fields.Longitude,
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
