import { NextResponse } from "next/server";
import { getLocalFeatures } from "@/lib/data";

// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY ADMIN UTILITY - not linked from any UI. Delete once the
// verification pass is done.
//
// For every pub/cafe/restaurant currently in Airtable:
// 1. Extracts a UK postcode from the Description text (if present) and
//    looks up its precise centroid via postcodes.io (free, ODbL/OGL,
//    no caching restriction - unlike Google/TripAdvisor/Yelp).
// 2. Searches the official UK Food Hygiene Rating/Information Scheme API
//    (api.ratings.food.gov.uk - free UK government API, Open Government
//    Licence, no API key required) by business name to find its FHIS
//    hygiene status. This is a statutory inspection result, not a
//    customer review or star rating.
//
// Returns proposed updates as JSON for review - does NOT write to
// Airtable itself. That's a deliberate separate step.
// ─────────────────────────────────────────────────────────────────────────

const UK_POSTCODE_REGEX = /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i;

async function lookupPostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ""))}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result) return null;
    return { lat: data.result.latitude, lng: data.result.longitude };
  } catch {
    return null;
  }
}

async function lookupHygieneRating(
  name: string
): Promise<{ ratingValue: string; postCode?: string; businessName: string } | null> {
  try {
    const res = await fetch(
      `https://api.ratings.food.gov.uk/Establishments?name=${encodeURIComponent(name)}&address=${encodeURIComponent(
        "Argyll and Bute"
      )}&pageSize=5`,
      { headers: { "x-api-version": "2" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const match = data.establishments?.[0];
    if (!match) return null;
    return { ratingValue: match.RatingValue, postCode: match.PostCode, businessName: match.BusinessName };
  } catch {
    return null;
  }
}

// Maps the FHRS/FHIS RatingValue string to our Airtable singleSelect options.
function mapRatingValue(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "pass") return "Pass";
  if (normalized.includes("eatsafe")) return "Pass and Eatsafe";
  if (normalized.includes("improvement")) return "Improvement Required";
  if (normalized.includes("exempt")) return "Exempt";
  if (normalized.includes("awaiting inspection")) return "Awaiting Inspection";
  if (normalized.includes("awaiting publication")) return "Awaiting Publication";
  return "Not Found";
}

export async function GET() {
  const allFeatures = await getLocalFeatures();
  const foodVenues = allFeatures.filter(
    (f) => f.category === "pub" || f.category === "cafe" || f.category === "restaurant"
  );

  const results = await Promise.all(
    foodVenues.map(async (venue) => {
      const postcodeMatch = venue.description.match(UK_POSTCODE_REGEX);
      const postcode = postcodeMatch?.[0];

      const [preciseCoord, hygiene] = await Promise.all([
        postcode ? lookupPostcode(postcode) : Promise.resolve(null),
        lookupHygieneRating(venue.name),
      ]);

      const distanceMoved =
        preciseCoord != null
          ? Math.round(
              haversineMeters({ lat: venue.lat, lng: venue.lng }, preciseCoord)
            )
          : null;

      return {
        id: venue.id,
        name: venue.name,
        currentCoord: { lat: venue.lat, lng: venue.lng },
        postcodeFound: postcode ?? null,
        preciseCoord,
        distanceMovedMeters: distanceMoved,
        hygieneMatch: hygiene
          ? { mappedRating: mapRatingValue(hygiene.ratingValue), matchedBusinessName: hygiene.businessName, matchedPostcode: hygiene.postCode }
          : null,
      };
    })
  );

  return NextResponse.json({ count: results.length, results });
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
