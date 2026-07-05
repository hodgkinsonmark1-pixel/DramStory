import type { Distillery } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// CLASSIC JOURNEYS — curated named routes, grouped by real Islay geography
// and distillery style (not arbitrary). Cost is deliberately NOT hardcoded
// here — it's computed from each distillery's real cheapest tour price at
// render time (see cheapestTourPrice / routeStartingPrice below), so it
// never drifts out of sync with Airtable.
// ─────────────────────────────────────────────────────────────────────────

export interface ClassicJourney {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  distillerySlugs: string[];
}

export const CLASSIC_JOURNEYS: ClassicJourney[] = [
  {
    slug: "peat-trail",
    name: "The Peat Trail",
    tagline: "South coast · heavily peated",
    description:
      "The three icons of Islay peat, all within walking distance of each other along the south coast's Kildalton shore.",
    distillerySlugs: ["ardbeg", "lagavulin", "laphroaig"],
  },
  {
    slug: "rhinns-trail",
    name: "The Rhinns Trail",
    tagline: "West peninsula · farm to bottle",
    description:
      "Islay's farm-to-bottle character on the scenic Rhinns peninsula — from experimental Bruichladdich to the island's own barley at Kilchoman.",
    distillerySlugs: ["bruichladdich", "kilchoman", "bowmore"],
  },
  {
    slug: "hidden-coast",
    name: "The Hidden Coast",
    tagline: "North & east · remote coast",
    description:
      "The quieter side of Islay, looking out over the Sound of Jura — from Bunnahabhain's traditional distilling to the island's newest distillery.",
    distillerySlugs: ["bunnahabhain", "caol_ila", "ardnahoe"],
  },
];

/** Cheapest tour price at a distillery, or null if it has no tours listed. */
export function cheapestTourPrice(d: Distillery): number | null {
  if (d.tours.length === 0) return null;
  return Math.min(...d.tours.map((t) => t.price));
}

/** Sum of the cheapest tour at each distillery on a route — real numbers,
 *  not a hardcoded estimate, so it stays accurate as Airtable changes. */
export function routeStartingPrice(journey: ClassicJourney, allDistilleries: Distillery[]): number | null {
  const prices = journey.distillerySlugs
    .map((slug) => allDistilleries.find((d) => d.slug === slug))
    .filter((d): d is Distillery => !!d)
    .map(cheapestTourPrice)
    .filter((p): p is number => p !== null);
  if (prices.length === 0) return null;
  return prices.reduce((sum, p) => sum + p, 0);
}

export function getJourneyDistilleries(journey: ClassicJourney, allDistilleries: Distillery[]): Distillery[] {
  return journey.distillerySlugs
    .map((slug) => allDistilleries.find((d) => d.slug === slug))
    .filter((d): d is Distillery => !!d);
}
