import type { TripAccommodation } from "@/lib/types";

/**
 * The four "drawn to" areas for the dreaming timeframe (docs/hero-handoff.md
 * §4.3) - named by character, not by village, so a dreamer is choosing a
 * kind of whisky and a kind of coast rather than a place they have never
 * been. Between them they hold all ten of Islay's own distilleries -
 * Isle of Jura (the eleventh distillery live on the site) is a
 * different island entirely and doesn't fit any of these four coastal
 * character-regions, so it's deliberately absent from every list below;
 * "All eleven" on the Phase 3 distillery card links to /distilleries
 * (the site-wide total) rather than claiming these four areas add up to
 * eleven themselves. Verified against the real Distilleries table (11
 * Aug 2026) - every name below is an exact match for Airtable's own
 * Name field, which is what HeroDreamingColumn.tsx looks each one up by.
 *
 * Centroids were the design doc's own estimates, flagged there (§10) as
 * unconfirmed against real distillery positions and carried through
 * as-is because Phase 3 had no map render to make an error visible.
 * CORRECTED 31 Aug 2026, when the four-moods homepage section gave them
 * their first render: each one is now the arithmetic mean of the real
 * Latitude/Longitude of the distilleries listed beneath it, read from
 * the Distilleries table. Three of the four estimates were good to
 * within ~0.15 mi and moved barely at all; "the west" was 0.7 mi east of
 * the true midpoint of Bruichladdich and Kilchoman, because the estimate
 * had been anchored near Port Charlotte village rather than between the
 * two distilleries the area actually names. These values are also the
 * map centre BuildTripPageClient.tsx opens on, so that map now opens
 * centred on the distilleries rather than near them.
 */
export interface DreamArea extends TripAccommodation {
  id: string;
  /** Real Distillery.name values, in "one featured, the rest named in
   *  the copy" order (§4.3) - HeroDreamingColumn.tsx's own featured pick
   *  is always distilleries[0]. */
  distilleries: string[];
  /** Short form for the distillery card's "N in {shortName}" kicker
   *  (§11 copy deck: "DISTILLERY · 4 IN THE SOUTH", not "...in peated
   *  south") - deliberately keeps its own "the" (needed mid-sentence:
   *  "4 in the south"/"4 in the middle") even though `name` itself
   *  dropped its leading "the" on 11 Aug 2026 per Mark's request - the
   *  two fields serve different grammatical spots, not the same one. */
  shortName: string;
}

export const DREAM_AREAS: DreamArea[] = [
  {
    id: "peated-south",
    name: "peated south",
    shortName: "the south",
    lat: 55.634,
    lng: -6.144,
    distilleries: ["Laphroaig", "Lagavulin", "Ardbeg", "Port Ellen"],
  },
  {
    id: "the-middle",
    name: "middle",
    shortName: "the middle",
    lat: 55.7557,
    lng: -6.2875,
    distilleries: ["Bowmore"],
  },
  {
    id: "the-west",
    name: "west",
    shortName: "the west",
    lat: 55.7779,
    lng: -6.4012,
    distilleries: ["Bruichladdich", "Kilchoman"],
  },
  {
    id: "north-east",
    name: "north east",
    shortName: "the north east",
    lat: 55.8691,
    lng: -6.118,
    distilleries: ["Caol Ila", "Ardnahoe", "Bunnahabhain"],
  },
];
