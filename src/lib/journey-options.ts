import type { InterestCategoryId, RegionId, TripLength } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for the journey planner's Q2/Q3/Q4 options, shared
// between the intake steps (LocationStep, TripLengthStep, InterestsStep)
// and the workspace map's filter bar — so a subcategory added here shows
// up in both places with no duplicate lists to keep in sync.
// ─────────────────────────────────────────────────────────────────────────

export interface RegionOption {
  id: RegionId;
  label: string;
  /** Only Islay has live Airtable data today. Every other region still
   *  routes into the workspace — it just shows an empty-overlay state. */
  live: boolean;
}

export const REGIONS: RegionOption[] = [
  { id: "islay", label: "Islay", live: true },
  { id: "speyside", label: "Speyside", live: false },
  { id: "highland", label: "Highland", live: false },
  { id: "campbeltown", label: "Campbeltown", live: false },
  { id: "lowland", label: "Lowland", live: false },
];

export interface TripLengthOption {
  id: TripLength;
  label: string;
  /** Roughly how many itinerary days this maps to — used once the
   *  itinerary panel actually pre-creates Day 1, Day 2, etc. */
  days: number;
}

export const TRIP_LENGTHS: TripLengthOption[] = [
  { id: "day-trip", label: "Day trip", days: 1 },
  { id: "weekend", label: "Weekend", days: 2 },
  { id: "3-5-days", label: "3–5 days", days: 4 },
  { id: "week-plus", label: "One week or more", days: 7 },
];

export interface InterestCategoryOption {
  id: InterestCategoryId;
  label: string;
  icon: string;
  /** Shown on the Q3 card as a quick summary, and used later as the
   *  expandable subcategory chips in the workspace map's filter bar. */
  subcategories: string[];
  /** Distilleries is the anchor of the whole site — always selected,
   *  not a togglable choice the way the other 5 are. */
  alwaysOn?: boolean;
}

export const INTEREST_CATEGORIES: InterestCategoryOption[] = [
  {
    id: "distilleries",
    label: "Distilleries",
    icon: "🥃",
    subcategories: [],
    alwaysOn: true,
  },
  {
    id: "natural-features",
    label: "Natural Features",
    icon: "🏞️",
    subcategories: ["Beaches", "Scenic Views", "Walks", "Bike Rides", "Waterfalls"],
  },
  {
    id: "local-attractions",
    label: "Local Attractions",
    icon: "🏛️",
    subcategories: ["Historic Sites", "Churches", "Monuments", "Golf", "Spa", "Gym & Swimming"],
  },
  {
    id: "local-events",
    label: "Local Events",
    icon: "📅",
    // Matches the Airtable Events table's Category field options exactly.
    subcategories: ["Distillery Events", "Festivals", "Seasonal Releases"],
  },
  {
    id: "places-to-eat",
    label: "Places to Eat",
    icon: "🍽️",
    subcategories: ["Bars", "Cafes", "Restaurants", "Fine Dining"],
  },
  {
    id: "places-to-stay",
    label: "Places to Stay",
    icon: "🛏️",
    subcategories: ["Hotels", "B&Bs", "Self-Catering"],
  },
];
