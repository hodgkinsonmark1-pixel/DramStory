import type { TripAccommodation } from "@/lib/types";

/**
 * The four "drawn to" areas for the dreaming timeframe (docs/hero-handoff.md
 * §4.3) - named by character, not by village, so a dreamer is choosing a
 * kind of whisky and a kind of coast rather than a place they have never
 * been. Between them they hold all eleven Islay distilleries.
 *
 * Centroids are the design doc's own estimates, explicitly flagged there
 * (§10) as unconfirmed against real distillery positions - carried
 * through as-is for Phase 1 (the sheet only needs a coordinate to store,
 * not to render a map yet). Revisit before Phase 3 (the reading column)
 * ships, per that same flag.
 *
 * `distilleries` is a static Phase 1 label only (matches the design
 * doc's own table) - a live "N in the south" derived from real distillery
 * region data is Phase 3 work, not this one.
 */
export interface DreamArea extends TripAccommodation {
  id: string;
  distilleries: string[];
}

export const DREAM_AREAS: DreamArea[] = [
  {
    id: "peated-south",
    name: "the peated south",
    lat: 55.632,
    lng: -6.145,
    distilleries: ["Laphroaig", "Lagavulin", "Ardbeg", "Port Ellen"],
  },
  {
    id: "the-middle",
    name: "the middle",
    lat: 55.758,
    lng: -6.289,
    distilleries: ["Bowmore"],
  },
  {
    id: "the-west",
    name: "the west",
    lat: 55.776,
    lng: -6.383,
    distilleries: ["Bruichladdich", "Kilchoman"],
  },
  {
    id: "north-east",
    name: "the north east",
    lat: 55.871,
    lng: -6.118,
    distilleries: ["Caol Ila", "Ardnahoe", "Bunnahabhain"],
  },
];
