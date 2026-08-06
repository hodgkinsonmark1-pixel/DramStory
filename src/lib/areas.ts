import type { TripAccommodation } from "@/lib/types";

/**
 * Fixed area list for the accommodation dropdown/map (moved out of
 * AccommodationControl.tsx on 06 Aug 2026, same reasoning as
 * featured-stays.ts's own extraction: lives in its own module so
 * MapCanvas.tsx can import it too without pulling in a "use client"
 * component). Coordinates unchanged from the original inline array -
 * Port Ellen and Bruichladdich from journeys-data.ts/days page, Port
 * Askaig from the Local Features "Ferry Port" record in Airtable.
 *
 * `slug` is only set for areas that have a real /areas/[slug] page built
 * (Port Ellen, first one live 06 Aug 2026) - same "slug added so the map
 * pin can link through" pattern as FEATURED_STAYS. Undefined for the
 * others until their pages exist, so the map pin/dropdown keep working
 * exactly as before for those (plain name-only popup, no dead link).
 */
export const AREAS: (TripAccommodation & { slug?: string })[] = [
  { name: "Port Ellen", lat: 55.630181, lng: -6.187415, slug: "port-ellen" },
  { name: "Bowmore", lat: 55.7557, lng: -6.2875 },
  { name: "Port Charlotte", lat: 55.74021, lng: -6.378353 },
  { name: "Bruichladdich", lat: 55.7638, lng: -6.3605 },
  { name: "Port Askaig", lat: 55.8476, lng: -6.1039 },
];
