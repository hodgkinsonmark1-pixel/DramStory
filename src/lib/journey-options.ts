import type { InterestCategoryId, RegionId } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for the journey planner's Q2/Q3 options, shared
// between the intake steps (LocationStep, InterestsStep) and the workspace
// map's filter bar — so a subcategory added here shows up in both places
// with no duplicate lists to keep in sync.
// ─────────────────────────────────────────────────────────────────────────

export interface RegionOption {
  id: RegionId;
  label: string;
  /** Only Islay has live Airtable data today. Every other region still
   *  routes into the workspace — it just shows an empty-overlay state. */
  live: boolean;
}

export const REGIONS: RegionOption[] = [
  { id: "islay", label: "Islay & Jura", live: true },
  { id: "speyside", label: "Speyside", live: false },
  { id: "highland", label: "Highland", live: false },
  { id: "campbeltown", label: "Campbeltown", live: false },
  { id: "lowland", label: "Lowland", live: false },
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
    id: "local-features-hub",
    label: "Local Features Hub",
    icon: "🧭",
    // Deliberately additive, not a merge - Natural Features and Local
    // Attractions below are untouched and keep their own full subcategory
    // sets (including Golf & Spa, and their own separate "Local Gems"
    // bucket). This tab draws the same underlying pins as a fast,
    // independent "scan everything non-retail" view, the same role
    // Distilleries plays for distilleries - deliberately excludes
    // Golf & Spa and Places to Eat/Stay, which lean retail/directory
    // rather than "place to see", per the site's USP.
    subcategories: ["Beaches", "Walks", "Bike Rides", "Local Gems", "Historic Sites", "Transport"],
  },
  {
    id: "natural-features",
    label: "Natural Features",
    icon: "🏞️",
    subcategories: ["Beaches", "Walks", "Bike Rides", "Local Gems"],
  },
  {
    id: "local-attractions",
    label: "Local Attractions",
    icon: "🏛️",
    subcategories: ["Historic Sites", "Golf & Spa", "Local Gems", "Transport"],
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
