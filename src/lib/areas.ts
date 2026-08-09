import type { TripAccommodation } from "@/lib/types";

/**
 * Shared area list - extracted from AccommodationControl.tsx (09 Aug
 * 2026) into its own module, same reasoning as FEATURED_STAYS living in
 * featured-stays.ts (see that file's own header comment): the homepage
 * answers block and the /days answers bar (days-trip-flow Phase 1) both
 * need these coordinates - to call setAccommodationFromDay when a
 * visitor picks an area as their trip base - without importing a
 * "use client" component just to reach a plain data array.
 * AccommodationControl.tsx now imports AREAS from here instead of
 * defining its own copy, so there's one source of truth rather than two
 * lists that can drift apart.
 *
 * slug added for the same reason FEATURED_STAYS got one (06 Aug 2026
 * there, see that file) - TripAnswers.base needs a stable id for an Area
 * the same way it already does for a FEATURED_STAYS hotel.
 *
 * Coordinates and the list itself are unchanged from the original (21
 * July 2026): Port Ellen and Bruichladdich from journeys-data.ts/days
 * page, Port Askaig from the Local Features "Ferry Port" record in
 * Airtable. Not exhaustive (no Portnahaven, Bridgend, Jura villages,
 * etc.) - AccommodationControl's own free-text "Other" search covers
 * anywhere not listed here.
 *
 * Note for whoever builds the homepage/answers-bar base sheet: the
 * days-trip-flow design doc's copy deck (§10) only has a "why this area"
 * line for four of these five - Port Ellen, Bowmore, Port Charlotte and
 * Port Askaig, matching its own "Or just an area" list exactly.
 * Bruichladdich has no design-doc line and isn't part of that signed-off
 * list, so it's included here (it's real, and AccommodationControl still
 * needs it) but deliberately left out of the homepage/answers-bar area
 * picker - see AnswersBlock.tsx.
 */
export const AREAS: (TripAccommodation & { slug: string })[] = [
  { name: "Port Ellen", lat: 55.630181, lng: -6.187415, slug: "port-ellen" },
  { name: "Bowmore", lat: 55.7557, lng: -6.2875, slug: "bowmore" },
  { name: "Port Charlotte", lat: 55.74021, lng: -6.378353, slug: "port-charlotte" },
  { name: "Bruichladdich", lat: 55.7638, lng: -6.3605, slug: "bruichladdich" },
  { name: "Port Askaig", lat: 55.8476, lng: -6.1039, slug: "port-askaig" },
];
