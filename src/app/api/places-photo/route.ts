import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Proxies Google Place Photos (New) so GOOGLE_PLACES_API_KEY never has to
// be sent to the browser. The Places API's photo media endpoint requires
// the key as a URL query parameter, which would otherwise be visible in
// every <img> tag's src on the page.
//
// Usage: /api/places-photo?name=places/XXXX/photos/YYYY&maxWidthPx=800
// (the "name" value comes straight from a Nearby Search response's
// places[].photos[].name field, produced by src/lib/google-places.ts)
// ─────────────────────────────────────────────────────────────────────────

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Only allow the exact shape Google returns: places/{id}/photos/{id}.
// Prevents the "name" param being used to reach any URL other than the
// intended Google Photos media endpoint.
const VALID_PHOTO_NAME = /^places\/[^/]+\/photos\/[^/]+$/;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const maxWidthPx = searchParams.get("maxWidthPx") ?? "800";

  if (!name || !VALID_PHOTO_NAME.test(name)) {
    return new Response("Invalid or missing 'name' query parameter", { status: 400 });
  }
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response("Server misconfigured: missing GOOGLE_PLACES_API_KEY", { status: 500 });
  }

  const googleUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${encodeURIComponent(
    maxWidthPx
  )}&key=${GOOGLE_PLACES_API_KEY}`;

  const upstream = await fetch(googleUrl);

  if (!upstream.ok || !upstream.body) {
    return new Response("Failed to fetch photo from Google", { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
