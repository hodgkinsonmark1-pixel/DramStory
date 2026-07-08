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
  /** Same gating pattern as REGIONS in journey-options.ts - false means
   *  "not fully built out yet", shown greyed out on the homepage until a
   *  real day-by-day itinerary exists for it. */
  live: boolean;
  /** Optional multi-day breakdown. Only present once a journey has been
   *  turned into an actual bookable-shaped tour (vs. just a themed route
   *  of stops). One entry per day, in order. */
  days?: JourneyDay[];
}

/** A single stop within a day - either a distillery visit or a
 *  non-distillery activity (a swim, a bike hire, a beach, lunch). */
export interface JourneyStop {
  kind: "distillery" | "activity";
  /** Required when kind === "distillery" - ties back to real distillery data. */
  distillerySlug?: string;
  /** Required when kind === "activity" - plain description, e.g.
   *  "Swim at MacTaggart Leisure Centre". */
  label?: string;
  /** True if this stop typically needs booking ahead (a tour slot, a
   *  bike hire reservation) - surfaced honestly rather than implied. */
  needsBooking?: boolean;
  /** Optional extra color/context shown under the stop, e.g. the
   *  MacTaggart pool's distillery-waste-heat story. */
  note?: string;
}

/** A single day within a multi-day Classic Journey. */
export interface JourneyDay {
  dayNumber: number;
  morning: JourneyStop[];
  afternoon: JourneyStop[];
  /** How the day's stops connect - e.g. "Bus to Bowmore, walk back to
   *  Port Charlotte, bus back to Port Ellen" - the kind of getting-around
   *  detail that's genuinely hard to find elsewhere. */
  transportNote?: string;
  /** Where the day ends - a real, verifiable village, NOT a specific
   *  property or booking. There's no accommodation affiliate/API live yet
   *  (Booking.com is the planned Day-1-onward layer per types.ts), so this
   *  deliberately stops short of claiming any bookable inventory. Null on
   *  a final departure day where the trip ends rather than continues. */
  overnight: JourneyNight | null;
}

export interface JourneyNight {
  village: string;
  lat: number;
  lng: number;
}

export const CLASSIC_JOURNEYS: ClassicJourney[] = [
  {
    slug: "islay-grand-tour",
    name: "The Islay Grand Tour",
    tagline: "6 nights · all 9 distilleries",
    description:
      "A full week based in Port Ellen, covering every working distillery on the island - real pacing, real logistics, not a highlight reel.",
    distillerySlugs: [
      "bunnahabhain", "ardnahoe", "caol_ila",
      "bowmore",
      "kilchoman", "bruichladdich",
      "lagavulin", "laphroaig",
      "ardbeg",
    ],
    live: true,
    // Adapted from a real 2026 trip. Mainland travel days on either end
    // (drive to/from the ferry) deliberately excluded - this starts on
    // arrival at Port Askaig and ends on departure from there, per the
    // Port Ellen terminal closure (see the Getting to Islay journal post).
    // Accommodation shown as "Port Ellen" only, not the specific named
    // property from the original trip - no booking integration exists yet,
    // so this doesn't claim to endorse or have availability for any one place.
    days: [
      {
        dayNumber: 1,
        morning: [{ kind: "activity", label: "Ferry from Kennacraig to Port Askaig" }],
        afternoon: [{ kind: "activity", label: "Transfer south and settle into Port Ellen" }],
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 2,
        morning: [
          { kind: "distillery", distillerySlug: "bunnahabhain" },
          { kind: "distillery", distillerySlug: "ardnahoe" },
          { kind: "distillery", distillerySlug: "caol_ila" },
        ],
        afternoon: [{ kind: "activity", label: "Machir Bay (or another west-coast beach)" }],
        transportNote: "A tight but real morning - all three sit close together on the north coast road out of Port Askaig.",
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 3,
        morning: [
          {
            kind: "activity",
            label: "Swim at MacTaggart Leisure Centre, Bowmore",
            note: "Islay's only indoor pool - genuinely heated by waste heat piped over from Bowmore Distillery next door.",
          },
        ],
        afternoon: [{ kind: "distillery", distillerySlug: "bowmore" }],
        transportNote: "Bus to Bowmore, bus back to Port Ellen.",
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 4,
        morning: [{ kind: "distillery", distillerySlug: "kilchoman", needsBooking: true }],
        afternoon: [{ kind: "distillery", distillerySlug: "bruichladdich", needsBooking: true }],
        transportNote: "Taxi out to Kilchoman, walk from there to Port Charlotte for Bruichladdich, bus back to Port Ellen.",
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 5,
        morning: [
          {
            kind: "activity",
            label: "Hire e-bikes from Islay E-Wheels, Port Ellen, and ride out along the coast",
          },
        ],
        afternoon: [
          { kind: "distillery", distillerySlug: "lagavulin" },
          { kind: "distillery", distillerySlug: "laphroaig" },
        ],
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 6,
        morning: [
          { kind: "activity", label: "Walk to Ardbeg, lunch at the Old Kiln Caf\u00e9" },
        ],
        afternoon: [{ kind: "distillery", distillerySlug: "ardbeg", needsBooking: true }],
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 7,
        morning: [{ kind: "activity", label: "Ferry from Port Askaig back to Kennacraig" }],
        afternoon: [],
        overnight: null,
      },
    ],
  },
  {
    slug: "rhinns-trail",
    name: "The Rhinns Trail",
    tagline: "West peninsula · farm to bottle",
    description:
      "Islay's farm-to-bottle character on the scenic Rhinns peninsula — from experimental Bruichladdich to the island's own barley at Kilchoman.",
    distillerySlugs: ["bruichladdich", "kilchoman", "bowmore"],
    live: false,
  },
  {
    slug: "hidden-coast",
    name: "The Hidden Coast",
    tagline: "North & east · remote coast",
    description:
      "The quieter side of Islay, looking out over the Sound of Jura — from Bunnahabhain's traditional distilling to the island's newest distillery.",
    distillerySlugs: ["bunnahabhain", "caol_ila", "ardnahoe"],
    live: false,
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
