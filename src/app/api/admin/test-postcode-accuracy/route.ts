import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY - proves out postcodes.io before committing to it as the
// coordinate-verification method. Compares postcodes.io's geocode
// (Ordnance Survey / ONS open data, free, unrestricted) against the
// coordinates currently stored in Airtable for the 9 real distilleries,
// so the accuracy claim is demonstrated rather than assumed. Delete
// alongside the OSM import route once done.
// ─────────────────────────────────────────────────────────────────────────

// Real distillery postcodes verified against each distillery's own website
// (see chat for sources), paired with the coordinates currently stored in
// Airtable, to check for drift rather than guess at accuracy.
// Note: Ardnahoe's postcode is genuinely ambiguous across sources -
// PA46 7RN (whisky.com, scotchwhisky.com) vs PA46 7RU (CalMac, Diffords
// Guide, Trip.com) - both are included so the comparison surfaces this
// rather than silently picking one.
const SAMPLE_VENUES = [
  { name: "Ardbeg", postcode: "PA42 7EA", storedCoord: { lat: 55.6411, lng: -6.1609 } },
  { name: "Lagavulin", postcode: "PA42 7DZ", storedCoord: { lat: 55.6357, lng: -6.1269 } },
  { name: "Laphroaig", postcode: "PA42 7DU", storedCoord: { lat: 55.6278, lng: -6.1495 } },
  { name: "Bowmore", postcode: "PA43 7JS", storedCoord: { lat: 55.7557, lng: -6.2875 } },
  { name: "Bruichladdich", postcode: "PA49 7UN", storedCoord: { lat: 55.7638, lng: -6.3605 } },
  { name: "Kilchoman", postcode: "PA49 7UT", storedCoord: { lat: 55.7919, lng: -6.4419 } },
  { name: "Caol Ila", postcode: "PA46 7RL", storedCoord: { lat: 55.8819, lng: -6.1044 } },
  { name: "Ardnahoe (PA46 7RN variant)", postcode: "PA46 7RN", storedCoord: { lat: 55.8944, lng: -6.1127 } },
  { name: "Ardnahoe (PA46 7RU variant)", postcode: "PA46 7RU", storedCoord: { lat: 55.8944, lng: -6.1127 } },
  { name: "Bunnahabhain", postcode: "PA46 7RP", storedCoord: { lat: 55.9125, lng: -6.1269 } },
];

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

export async function GET() {
  const postcodes = SAMPLE_VENUES.map((v) => v.postcode.replace(/\s+/g, ""));

  const res = await fetch("https://api.postcodes.io/postcodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcodes }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `postcodes.io returned ${res.status}` }, { status: 502 });
  }

  const data = await res.json();

  const comparison = SAMPLE_VENUES.map((venue, i) => {
    const result = data.result[i]?.result;
    if (!result) return { ...venue, postcodesIo: null, distanceFromStoredMeters: null };
    const postcodesIoCoord = { lat: result.latitude, lng: result.longitude };
    return {
      name: venue.name,
      postcode: venue.postcode,
      storedCoord: venue.storedCoord,
      postcodesIo: postcodesIoCoord,
      distanceFromStoredMeters: Math.round(haversineMeters(venue.storedCoord, postcodesIoCoord)),
    };
  });

  return NextResponse.json({ source: "postcodes.io (OS Open Names / ONS Postcode Directory)", comparison });
}
