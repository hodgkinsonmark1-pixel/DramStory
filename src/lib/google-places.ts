// ─────────────────────────────────────────────────────────────────────────
// GOOGLE PLACES CLIENT — Places API (New), Nearby Search.
//
// Used for two things per the locked data architecture:
//   - Pubs / Cafes / Restaurants map layer (toggleable, self-serve)
//   - Accommodation fallback, when Booking.com isn't available yet or has
//     an outage
//
// Required environment variable:
//   GOOGLE_PLACES_API_KEY - from Google Cloud Console, with "Places API
//     (New)" enabled and billing set up (Google requires a billing account
//     even to use the free monthly credit). This key is read server-side
//     only — see src/app/api/places-photo/route.ts for how photos are
//     proxied so the key never reaches the browser.
// ─────────────────────────────────────────────────────────────────────────

import type { PlaceListing } from "@/lib/types";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SEARCH_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.priceLevel",
  "places.photos",
  "places.websiteUri",
].join(",");

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  priceLevel?: string; // e.g. "PRICE_LEVEL_MODERATE"
  photos?: { name: string }[];
  websiteUri?: string;
}

interface SearchNearbyResponse {
  places?: GooglePlace[];
}

// Places API (New) returns price level as an enum string, not 0-4 like the
// legacy API. Map it back to a number so it matches our PlaceListing type.
const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// Google's Table A place types don't include "pub" as its own type —
// pubs are generally categorized as "bar" in Google's data.
const CATEGORY_TO_GOOGLE_TYPES = {
  pub: ["bar"],
  cafe: ["cafe"],
  restaurant: ["restaurant"],
  accommodation: ["lodging"],
} as const;

async function searchNearby(
  includedTypes: readonly string[],
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<GooglePlace[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error(
      "Missing GOOGLE_PLACES_API_KEY environment variable. Set this in Vercel -> Settings -> Environment Variables."
    );
  }

  const res = await fetch(SEARCH_NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: radiusMeters,
        },
      },
    }),
    // These results don't need to be second-by-second fresh; caching for an
    // hour keeps API costs down significantly on repeat page loads.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Places request failed: ${res.status} ${body}`);
  }

  const data: SearchNearbyResponse = await res.json();
  return data.places ?? [];
}

function mapPlace(place: GooglePlace, category: PlaceListing["category"]): PlaceListing {
  return {
    id: place.id,
    name: place.displayName?.text ?? "",
    category,
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    rating: place.rating,
    priceLevel: place.priceLevel ? PRICE_LEVEL_MAP[place.priceLevel] : undefined,
    address: place.formattedAddress,
    // Proxied through our own route so the API key never reaches the browser.
    photoUrl: place.photos?.[0]
      ? `/api/places-photo?name=${encodeURIComponent(place.photos[0].name)}`
      : undefined,
    websiteUrl: place.websiteUri,
    source: "google",
  };
}

export async function searchNearbyByCategory(
  category: "pub" | "cafe" | "restaurant",
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<PlaceListing[]> {
  const places = await searchNearby(CATEGORY_TO_GOOGLE_TYPES[category], center, radiusMeters);
  return places.map((p) => mapPlace(p, category));
}

export async function searchAccommodation(
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<PlaceListing[]> {
  const places = await searchNearby(CATEGORY_TO_GOOGLE_TYPES.accommodation, center, radiusMeters);
  return places.map((p) => mapPlace(p, "accommodation"));
}
