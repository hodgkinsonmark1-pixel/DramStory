import type { TripAccommodation } from "@/lib/types";

/**
 * Fixed area list for the accommodation dropdown/map (moved out of
 * AccommodationControl.tsx on 06 Aug 2026, same reasoning as
 * featured-stays.ts's own extraction: lives in its own module so
 * MapCanvas.tsx can import it too without pulling in a "use client"
 * component). Coordinates unchanged from the original inline array -
 * Port Ellen, Bowmore and Port Charlotte from journeys-data.ts/days page.
 *
 * Trimmed 08 Aug 2026 to exactly the 3 real, live Areas (Port Ellen,
 * Bowmore, Port Charlotte - Airtable-backed /areas/[slug] pages).
 * Bruichladdich and Port Askaig were both dropped - neither is a real
 * Area page (Port Askaig was never more than a Local Features "Ferry
 * Port" record; Bruichladdich was considered and deliberately shelved) -
 * so they must not appear as accommodation/area options.
 *
 * `slug` links each entry through to its real /areas/[slug] page - all
 * three now have one live, matching the Slug field on each Area's
 * Airtable record (same value getAreaBySlug filters on).
 *
 * NOTE (10 Aug 2026, main merge): the days-trip-flow branch's own copy
 * of this file still carried Bruichladdich and Port Askaig - it forked
 * before the 8 Aug decision above landed. Kept this trimmed 3-area
 * version as the single source of truth on merge, consistent with the
 * Port Askaig fix already applied to trip-answers.ts's AREA_NOTES/
 * BASE_SHEET_AREAS on feature/days-trip-flow-phase1. `slug` narrowed
 * from optional back to required, matching every real entry always
 * having one.
 */
export const AREAS: (TripAccommodation & { slug: string })[] = [
  { name: "Port Ellen", lat: 55.630181, lng: -6.187415, slug: "port-ellen" },
  { name: "Bowmore", lat: 55.7557, lng: -6.2875, slug: "bowmore" },
  { name: "Port Charlotte", lat: 55.74021, lng: -6.378353, slug: "port-charlotte" },
];
