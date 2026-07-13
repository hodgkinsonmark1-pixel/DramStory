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
  /** Practical "how you actually get there" logistics that don't belong
   *  in the numbered day-by-day breakdown because there's no touring
   *  content on that leg (a ferry, a transfer) - shown once, in the
   *  intro, rather than consuming a "Day 1" slot with nothing to tour. */
  gettingThereNote?: string;
  /** Slug of a Journal post with more detail on the getting-there
   *  logistics, if one exists - linked from the intro alongside
   *  gettingThereNote rather than embedded as markup in that string. */
  gettingThereJournalSlug?: string;
  /** Why this journey's overnight base makes sense for THIS route
   *  specifically (not a generic "no booking yet" disclaimer, which
   *  stays separate and applies to every journey regardless). */
  accommodationNote?: string;
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
  /** A short, evocative scene-setting paragraph shown above the stop
   *  list - the "why this day feels the way it does" framing, not a
   *  restatement of the stops themselves. Content, not a code feature -
   *  drafted per journey and due Mark's own review before being treated
   *  as final, same as any other published copy on the site. */
  narrative?: string;
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
    //
    // July 2026: the arrival day (ferry + transfer, no distilleries) was
    // pulled out of the numbered day-by-day breakdown - it had nothing to
    // tour, so counting it as "Day 1" undersold how much the tour itself
    // actually covers. That logistics info now lives in gettingThereNote
    // instead, and the days below start on the first day with real
    // touring content (previously Day 2).
    gettingThereNote:
      "Ferry from Kennacraig to Port Askaig, then a transfer south to settle into Port Ellen - allow the rest of arrival day for this before the tour itself begins.",
    gettingThereJournalSlug: "getting-to-islay-ferries-flights-travel",
    accommodationNote:
      "Port Ellen is the base for the whole week: it's a proper town (not just a distillery car park), with a genuinely nice beach on your doorstep and the facilities you'd actually want after a day of touring. It's also the right geography for this route specifically - Day 4 and Day 5 are both close enough to reach on foot or by bike, and Bowmore is a short, easy bus ride away for Day 2.",
    days: [
      {
        dayNumber: 1,
        narrative:
          "The tour starts on Islay's quieter northern shore, where three very different distilleries sit almost within sight of each other along the coast road out of Port Askaig - traditional at Bunnahabhain, brand new at Ardnahoe, unmistakably peated at Caol Ila. Three character studies before lunch. Spend the afternoon at Machir Bay, one of the most photographed beaches in Scotland, and let the pace drop before it picks back up tomorrow.",
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
        dayNumber: 2,
        narrative:
          "A gentler start today - Islay's only swimming pool happens to be heated by waste heat piped straight from Bowmore Distillery next door, one of those quietly brilliant details that only make sense once you've seen it. Cross the road afterwards for a tour of the island's oldest working distillery, its warehouses built below sea level and still maturing casks the old way. Give the rest of the day to the town itself - Bowmore rewards slowing down.",
        morning: [
          {
            kind: "activity",
            label: "Swim at MacTaggart Leisure Centre, Bowmore",
            note: "Islay's only indoor pool - genuinely heated by waste heat piped over from Bowmore Distillery next door.",
          },
        ],
        afternoon: [
          { kind: "distillery", distillerySlug: "bowmore" },
          {
            kind: "activity",
            label: "Kilarrow Parish Church (the Round Church)",
            note: "Built round, the story goes, so the devil would have no corners to hide in.",
          },
          { kind: "activity", label: "Browse Bowmore's high street - independent shops, not chains" },
          { kind: "activity", label: "Drinks at the harbour to close out the day" },
        ],
        transportNote: "Bus to Bowmore, bus back to Port Ellen.",
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 3,
        narrative:
          "Today belongs to Islay's farming distilleries. Kilchoman still grows, malts, and distils barley from its own fields - genuinely rare anywhere in Scotland - before an afternoon at Bruichladdich, where experimentation is practically the house style. Both need booking ahead, so this is the day to have your tour times locked in before you arrive.",
        morning: [{ kind: "distillery", distillerySlug: "kilchoman", needsBooking: true }],
        afternoon: [{ kind: "distillery", distillerySlug: "bruichladdich", needsBooking: true }],
        transportNote: "Taxi out to Kilchoman, walk from there to Port Charlotte for Bruichladdich, bus back to Port Ellen.",
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
      },
      {
        dayNumber: 4,
        narrative:
          "Trade the bus timetable for two wheels this morning, hiring e-bikes in Port Ellen and riding the coast road out with the sea on one side. By afternoon you're at Lagavulin, then Laphroaig next door - two of the most intensely peated, iodine-heavy drams on the island, tasted almost within walking distance of each other and of home for the night.",
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
        dayNumber: 5,
        narrative:
          "Your last full day on Islay, and it's an easy one to reach - walk the coast road to Ardbeg, stopping for lunch at the Old Kiln Caf\u00e9 along the way. The tour needs booking ahead, so treat this as the day you don't want to run late for.",
        morning: [
          { kind: "activity", label: "Walk to Ardbeg, lunch at the Old Kiln Caf\u00e9" },
        ],
        afternoon: [{ kind: "distillery", distillerySlug: "ardbeg", needsBooking: true }],
        overnight: { village: "Port Ellen", lat: 55.630181, lng: -6.187415 },
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
