import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY ADMIN UTILITY - not linked from any UI, intended to be deleted
// once the Islay & Jura pubs/cafes/restaurants import is done.
//
// Pulls pub/cafe/restaurant/bar venues from OpenStreetMap via the public
// Overpass API. Unlike Google Places / TripAdvisor / Yelp, OSM's database
// is ODbL-licensed: storing, caching, and reusing this data (with
// attribution) is explicitly permitted, which is why this is the source
// for real map pins rather than a live-only list view.
//
// This route only READS from Overpass and returns JSON for human review -
// it does not write to Airtable. That's a deliberate separate step once
// Mark has sanity-checked the pull.
//
// The public Overpass instance (overpass-api.de) is a shared, volunteer-run
// resource that times out under load fairly often, so this tries a couple
// of known mirrors in sequence rather than failing on the first busy one.
// ─────────────────────────────────────────────────────────────────────────

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// Two explicit bounding boxes rather than one rectangle or a named-area
// lookup. A single rectangle can't cleanly separate Islay+Jura from
// Gigha (which sits at overlapping latitudes) and mainland Argyll
// (which sits at overlapping longitudes) - two boxes shaped to each
// island's actual footprint avoids that. This replaces an earlier
// attempt using area["name"="Islay"] which silently matched nothing
// (Islay isn't tagged the way that assumed) - Overpass treated the
// empty area as no restriction at all and returned results worldwide,
// starting with a restaurant in Switzerland. Lesson: always sanity-check
// results against the expected region rather than trusting a filter
// applied silently server-side (see the post-fetch check below).
const ISLAY_BBOX = "55.58,-6.65,55.92,-5.98";
const JURA_BBOX = "55.78,-6.05,56.05,-5.75";

const QUERY = `
[out:json][timeout:25];
(
  node["amenity"~"^(pub|cafe|restaurant|bar|fast_food)$"](${ISLAY_BBOX});
  node["amenity"~"^(pub|cafe|restaurant|bar|fast_food)$"](${JURA_BBOX});
);
out body;
`.trim();

// Sanity bounds slightly more generous than the query boxes above - if
// anything in the response falls outside this, something has gone wrong
// upstream (as it did once already) and it should be dropped and
// reported, not silently included.
const SANITY_BOUNDS = { minLat: 55.4, maxLat: 56.2, minLng: -6.8, maxLng: -5.4 };
function isWithinSanityBounds(lat: number, lng: number): boolean {
  return (
    lat >= SANITY_BOUNDS.minLat &&
    lat <= SANITY_BOUNDS.maxLat &&
    lng >= SANITY_BOUNDS.minLng &&
    lng <= SANITY_BOUNDS.maxLng
  );
}

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function mapAmenityToCategory(amenity: string): "pub" | "cafe" | "restaurant" {
  if (amenity === "pub" || amenity === "bar") return "pub";
  if (amenity === "cafe") return "cafe";
  return "restaurant"; // restaurant, fast_food
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"] && tags["addr:street"]
      ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
      : tags["addr:street"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

async function fetchFromMirror(url: string): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        // Overpass instances expect the query as a form-encoded "data"
        // field, not a raw text/plain body - some mirrors (confirmed:
        // overpass-api.de) return 406 Not Acceptable otherwise. A real
        // User-Agent is also expected per Overpass's usage policy.
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "DramStory/1.0 (dramstory.com; one-off OSM data import)",
      },
      body: `data=${encodeURIComponent(QUERY)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass mirror ${url} returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  let data: OverpassResponse | null = null;
  const errors: string[] = [];

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      data = await fetchFromMirror(mirror);
      break;
    } catch (err) {
      errors.push(`${mirror}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!data) {
    return NextResponse.json(
      { error: "All Overpass mirrors failed or timed out", attempts: errors },
      { status: 502 }
    );
  }

  const rawElements = data.elements.filter((el) => el.tags?.name && el.tags?.amenity);
  const outOfBounds = rawElements.filter((el) => !isWithinSanityBounds(el.lat, el.lon));
  if (outOfBounds.length > 0) {
    console.error(
      `Overpass returned ${outOfBounds.length} result(s) outside the expected Islay/Jura region - ` +
        `something is wrong with the query. Examples: ` +
        outOfBounds
          .slice(0, 3)
          .map((el) => `${el.tags?.name} (${el.lat}, ${el.lon})`)
          .join(", ")
    );
  }

  const places = rawElements
    .filter((el) => isWithinSanityBounds(el.lat, el.lon))
    // Exclude anything an OSM contributor has themselves flagged as
    // uncertain (e.g. "North Beachmore (closed?)") - better to omit than
    // to import a possibly-defunct venue as if it were verified.
    .filter((el) => !/\(closed\??\)|\?\s*$/i.test(el.tags!.name))
    .map((el) => {
      const tags = el.tags!;
      return {
        osmId: el.id,
        name: tags.name,
        category: mapAmenityToCategory(tags.amenity),
        amenity: tags.amenity,
        lat: el.lat,
        lng: el.lon,
        cuisine: tags.cuisine,
        address: buildAddress(tags),
        website: tags.website ?? tags["contact:website"],
        phone: tags.phone ?? tags["contact:phone"],
        openingHours: tags.opening_hours, // reference only - deliberately not stored in Airtable long-term
      };
    })
    // De-dupe on name+rounded-coords, case-insensitively - a venue can
    // appear twice with only a capitalization difference ("The Putechan"
    // vs "the Putechan"), which a case-sensitive match would miss.
    .filter(
      (place, index, all) =>
        all.findIndex(
          (p) =>
            p.name.toLowerCase() === place.name.toLowerCase() &&
            Math.abs(p.lat - place.lat) < 0.0005 &&
            Math.abs(p.lng - place.lng) < 0.0005
        ) === index
    );

  return NextResponse.json({
    source: "OpenStreetMap (ODbL) via Overpass API",
    attribution: "© OpenStreetMap contributors",
    count: places.length,
    droppedOutOfBounds: outOfBounds.length,
    places,
  });
}
