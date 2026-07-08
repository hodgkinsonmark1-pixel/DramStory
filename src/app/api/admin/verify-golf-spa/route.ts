import { NextResponse } from "next/server";

// TEMPORARY - one-off precision check for the 3 Golf & Spa venues added
// this session, closing the gap of not having run the same
// postcodes.io pass already applied to the food venues. Delete after use.

const VENUES = [
  { name: "The Machrie Golf Links", postcode: "PA42 7AN" },
  { name: "Islay Sauna", postcode: "PA47 7ST" },
  { name: "Bothan Jura Wild Sauna", postcode: "PA60 7XZ" },
];

export async function GET() {
  const results = await Promise.all(
    VENUES.map(async (v) => {
      const res = await fetch(`https://api.postcodes.io/postcodes/${v.postcode.replace(/\s+/g, "")}`);
      if (!res.ok) return { ...v, error: `postcodes.io returned ${res.status}` };
      const data = await res.json();
      return { ...v, lat: data.result?.latitude, lng: data.result?.longitude };
    })
  );
  return NextResponse.json({ results });
}
