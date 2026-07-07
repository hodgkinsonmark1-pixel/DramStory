import { NextRequest, NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/data";

// ─────────────────────────────────────────────────────────────────────────
// Thin server-side proxy so client components (the workspace map) can pull
// Google Places results without GOOGLE_PLACES_API_KEY ever reaching the
// browser — same reasoning as /api/places-photo. This route just forwards
// to the data layer's getNearbyPlaces(), which is where the actual
// Google Places (New) call and category->type mapping lives.
//
// Usage: /api/places?category=golf&lat=55.75&lng=-6.2&radius=25000
// ─────────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ["pub", "cafe", "restaurant", "golf", "spa"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string | null): value is ValidCategory {
  return VALID_CATEGORIES.includes(value as ValidCategory);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius") ?? "5000");

  if (!isValidCategory(category)) {
    return NextResponse.json(
      { error: `Invalid or missing 'category'. Expected one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid or missing 'lat'/'lng' query parameters" }, { status: 400 });
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 50000) {
    return NextResponse.json({ error: "'radius' must be a number between 1 and 50000 (metres)" }, { status: 400 });
  }

  try {
    const places = await getNearbyPlaces(category, { lat, lng }, radius);
    return NextResponse.json(
      { places },
      // Same hour-long cache as the underlying Google fetch, so repeat
      // requests for the same category/area don't re-hit Google or the
      // billing meter unnecessarily.
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("GET /api/places failed:", err);
    return NextResponse.json({ error: "Failed to fetch nearby places" }, { status: 502 });
  }
}
