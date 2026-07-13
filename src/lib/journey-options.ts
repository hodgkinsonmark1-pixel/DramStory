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
    id: "natural-features",
    label: "Local Features Hub",
    icon: "🏞️",
    // July 2026: absorbed Historic Sites and Transport from Local
    // Attractions - this tab is now "everything static and place-based
    // that isn't a distillery, event, or place to eat/stay", sitting
    // right next to Distilleries in the filter bar as the natural
    // second stop.
    subcategories: ["Beaches", "Walks", "Bike Rides", "Local Gems", "Historic Sites", "Transport"],
  },
  {
    id: "local-attractions",
    label: "Local Attractions",
    icon: "🏛️",
    // Historic Sites and Transport moved to Local Features Hub (above) -
    // this tab is now just the two subcategories that didn't fit that
    // "static places" framing as naturally.
    subcategories: ["Golf & Spa", "Local Gems"],
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
