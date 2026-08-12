import type { AirtableAttachment, AirtableRecord } from "@/lib/airtable";
import type { Area, Distillery, FeaturedStay, HubDay, JournalPost, LocalEvent, LocalFeature, NearbyFeature, Tour } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Raw shapes as returned by the Airtable REST API for each table.
// Field names here must match the Airtable column names exactly.
// ─────────────────────────────────────────────────────────────────────────

export interface AirtableDistilleryFields {
  Name?: string;
  Slug?: string;
  Region?: string;
  Style?: string;
  Latitude?: number;
  Longitude?: number;
  Founded?: number;
  Tagline?: string;
  Description?: string;
  "Hero Image"?: AirtableAttachment[];
  Hours?: string;
  "Price From"?: number;
  "Avg Visit"?: string;
  Parking?: string;
  Accessibility?: string;
  "Motorhome Friendly"?: boolean;
  "Gift Shop"?: boolean;
  "Restaurant Name"?: string;
  Facilities?: string[];
  "Booking URL"?: string;
  Tours?: string[]; // linked record IDs -> Tours table
  "Local Features"?: string[]; // linked record IDs -> Local Features table
  "Status Notice"?: string;
  "Why Visit"?: string;
  "Website URL"?: string;
  Gallery?: AirtableAttachment[];
  "Fun Facts"?: string;
  History?: string;
  "Whisky Profile"?: string;
  /** Weekly closure pattern (added 9 Aug 2026) - day names ("Sunday",
   *  "Monday", etc.), sourced from each distillery's own official site.
   *  Blank means open every day - see Distillery.closedDays' doc comment
   *  in types.ts for the one exception (Port Ellen). */
  "Closed Days"?: string[];
}

export interface AirtableTourFields {
  Name?: string;
  Distillery?: string[];
  Duration?: string;
  Price?: number;
  Description?: string;
}

export interface AirtableJournalFields {
  Title?: string;
  Slug?: string;
  "Meta Description"?: string;
  "Hero Image"?: AirtableAttachment[];
  "Inline Image 1"?: AirtableAttachment[];
  "Inline Image 2"?: AirtableAttachment[];
  "Inline Image 3"?: AirtableAttachment[];
  Body?: string;
  Published?: boolean;
  "Published Date"?: string;
  Category?: string;
}

export function mapToJournalPost(fields: AirtableJournalFields, id: string): JournalPost {
  // Routed through /api/attachment - Airtable's own attachment URLs expire
  // after a few hours, which breaks images baked into ISR-cached pages.
  // Safe on Team plan quota - see /api/attachment/route.ts.
  const JOURNAL_TABLE = "tblBT8O3PxzJUz3xE";
  const proxyUrl = (fieldId: string, has: boolean) => (has ? `/api/attachment?t=${JOURNAL_TABLE}&r=${id}&f=${fieldId}&i=0` : "");
  return {
    id,
    slug: fields.Slug ?? "",
    title: fields.Title ?? "",
    metaDescription: fields["Meta Description"] ?? "",
    heroImage: proxyUrl("flddsgmX5auZhH97h", !!fields["Hero Image"]?.[0]),
    inlineImages: [
      proxyUrl("fldffIhemv5rYiku7", !!fields["Inline Image 1"]?.[0]),
      proxyUrl("fldZp4MIScsatF94Q", !!fields["Inline Image 2"]?.[0]),
      proxyUrl("fld7KPlECb1fCfTuF", !!fields["Inline Image 3"]?.[0]),
    ],
    body: fields.Body ?? "",
    publishedDate: fields["Published Date"] ?? "",
    category: fields.Category,
  };
}

export interface AirtableLocalFeatureFields {
  Name?: string;
  Category?: string;
  Icon?: string;
  Description?: string;
  Distilleries?: string[];
  Distance?: string;
  Latitude?: number;
  Longitude?: number;
  Slug?: string;
  Parking?: string;
  Accessibility?: string;
  "Opening Hours"?: string;
  Postcode?: string;
  Highlights?: string;
  Length?: string;
  Duration?: string;
  Difficulty?: string;
  Website?: string;
  "Food Hygiene Rating"?: string;
  "Why Visit"?: string;
  "Pin Summary"?: string;
  History?: string;
  "Safety & Tide Notes"?: string;
  "Tide Times URL"?: string;
  "Great For"?: string[];
  "Best Time to Visit"?: string;
  "Nearest Facilities"?: string;
  "What to Bring"?: string;
  "Mobile Signal Note"?: string;
  "Pairs Well With"?: string;
  "Wildlife & Seasonal Highlights"?: string;
  "Hero Image"?: AirtableAttachment[];
  "Hero Image Credit"?: string;
  "Hero Focal Y"?: number;
  Gallery?: AirtableAttachment[];
  "Gallery Credits"?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────────────────────────────────

/** Airtable's "Category" select options -> our fixed NearbyFeature category union. */
export function mapFeatureCategory(category?: string): NearbyFeature["category"] {
  switch (category) {
    case "Viewpoint":
      return "viewpoint";
    case "Beach":
      return "beach";
    case "Walk":
      return "walk";
    case "Historic Site":
      return "attraction";
    default:
      return "attraction";
  }
}

/** Day-name -> weekday-index (0 = Sunday .. 6 = Saturday), for turning
 *  Distilleries' "Closed Days" multipleSelects into Distillery.closedDays
 *  (Days/Trip flow Phase 4, docs/days-trip-flow-handoff.md §2.2/§4.4). */
const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function mapClosedDays(closedDays: string[] | undefined): number[] {
  if (!closedDays) return [];
  return closedDays
    .map((name) => WEEKDAY_INDEX[name])
    .filter((n): n is number => n != null);
}

export function mapTour(fields: AirtableTourFields): Tour {
  return {
    name: fields.Name ?? "",
    duration: fields.Duration ?? "",
    price: fields.Price ?? 0,
    description: fields.Description ?? "",
  };
}

export function mapLocalFeature(fields: AirtableLocalFeatureFields): NearbyFeature {
  return {
    name: fields.Name ?? "",
    type: fields.Category ?? "",
    icon: fields.Icon ?? "📍",
    distance: fields.Distance ?? "",
    category: mapFeatureCategory(fields.Category),
  };
}

// Airtable Category values mapped to map-plottable LocalFeature categories.
// Pub/Cafe/Restaurant are OSM-sourced (ODbL, freely reusable - unlike
// Google/TripAdvisor/Yelp, see chat history) real venues, same real-pin
// treatment as everything else here.
const LOCAL_FEATURE_CATEGORY_MAP: Record<string, LocalFeature["category"] | undefined> = {
  Beach: "beach",
  Walk: "walk",
  "Bike Route": "bike-route",
  "Local Gem": "local-gem",
  "Historic Site": "historic-site",
  "Attraction Gem": "attraction-gem",
  Pub: "pub",
  Cafe: "cafe",
  Restaurant: "restaurant",
  Golf: "golf",
  Spa: "spa",
  "Ferry Port": "transport",
  Airport: "transport",
};

/** Maps a raw Local Features record into a map-plottable LocalFeature.
 *  Returns null for unrecognized categories or records missing
 *  coordinates - both are simply excluded from the map. */
export function mapToLocalFeature(id: string, fields: AirtableLocalFeatureFields): LocalFeature | null {
  // Coordinate provenance: every Natural Feature record now has a
  // "Location Source" field in Airtable recording exactly how its
  // coordinates were verified (postcode, OS Grid Reference + source, or
  // an honest note that it's a reasoned estimate) - see that field for
  // the audit trail rather than guessing at accuracy from this code.
  const category = LOCAL_FEATURE_CATEGORY_MAP[fields.Category ?? ""];
  if (!category || fields.Latitude == null || fields.Longitude == null) return null;
  return {
    id,
    slug: fields.Slug || id,
    name: fields.Name ?? "",
    category,
    icon: fields.Icon ?? "📍",
    description: fields.Description ?? "",
    lat: fields.Latitude,
    lng: fields.Longitude,
    parking: fields.Parking ?? "",
    accessibility: fields.Accessibility ?? "",
    openingHours: fields["Opening Hours"] ?? "",
    postcode: fields.Postcode,
    highlights: (fields.Highlights ?? "").split("\n").filter((line) => line.trim().length > 0),
    length: fields.Length,
    duration: fields.Duration,
    difficulty: fields.Difficulty,
    websiteUrl: fields.Website,
    hygieneRating: fields["Food Hygiene Rating"],
    whyVisit: fields["Why Visit"],
    pinSummary: fields["Pin Summary"],
    history: fields.History,
    safetyNotes: fields["Safety & Tide Notes"],
    tideTimesUrl: fields["Tide Times URL"],
    greatFor: fields["Great For"],
    bestTimeToVisit: fields["Best Time to Visit"],
    nearestFacilities: fields["Nearest Facilities"],
    whatToBring: fields["What to Bring"],
    mobileSignalNote: fields["Mobile Signal Note"],
    pairsWellWith: fields["Pairs Well With"],
    wildlifeHighlights: fields["Wildlife & Seasonal Highlights"],
    // Routed through /api/attachment rather than using fields[...].url
    // directly - Airtable's own attachment URLs expire after a few hours,
    // which breaks images baked into ISR-cached pages. Safe on Team plan
    // quota (100,000 calls/month) - see that route's comment before
    // reintroducing this if the plan ever drops back to Free.
    heroImageUrl: fields["Hero Image"]?.[0]
      ? `/api/attachment?t=tblwMce8jhsX9rYu9&r=${id}&f=fldsX3VuFuEFdIo3A&i=0`
      : undefined,
    heroImageCredit: fields["Hero Image Credit"] || undefined,
    heroFocalY: fields["Hero Focal Y"],
    gallery: (fields.Gallery ?? []).map(
      (_, i) => `/api/attachment?t=tblwMce8jhsX9rYu9&r=${id}&f=fld3U3Zq1Y8NbxPht&i=${i}`
    ),
    // Index-aligned with `gallery` above (line 1 -> gallery[0], etc.) -
    // see the "Gallery Credits" field description in Airtable. Left
    // unset entirely when the field is blank, rather than an array of
    // empty strings, so callers can cheaply check `galleryCredits?.[i]`.
    galleryCredits: fields["Gallery Credits"] ? fields["Gallery Credits"].split("\n") : undefined,
  };
}

export interface AirtableFeaturedStayFields {
  Name?: string;
  Slug?: string;
  Status?: string;
  Latitude?: number;
  Longitude?: number;
  Style?: string;
  "Why Stay"?: string;
  Description?: string;
  History?: string;
  "Hero Image"?: AirtableAttachment[];
  "Hero Image Credit"?: string;
  Gallery?: AirtableAttachment[];
  "Gallery Credits"?: string;
  "Price From"?: number;
  Facilities?: string[];
  // NOTE: "Meals Included" and "Accessibility" exist as real fields on the
  // Featured Stays Airtable table but are deliberately NOT captured here -
  // dropped from scope (see FeaturedStay's doc comment in types.ts). Do not
  // add them back without re-confirming that decision with Mark first.
  Setting?: string;
  // "Distance from Ferry/Airport" (the original single combined field) was
  // split into three on 04 Aug 2026 - see the three fields below - because
  // Mark wanted each as its own Visit Info tile linking to its own /explore
  // page, and one free-text field read awkwardly once the Port Ellen
  // closure caveat sat alongside Port Askaig and the airport. The old field
  // still exists in Airtable (kept blank going forward) rather than being
  // deleted, same "deprecate, don't delete" pattern as Meals Included/
  // Accessibility - not read here.
  "Distance from Airport"?: string;
  "Distance from Port Askaig Ferry"?: string;
  "Distance from Port Ellen Ferry"?: string;
  "Whisky Bar/Collection Note"?: string;
  "Mobile Signal Note"?: string;
  Parking?: string;
  "Nearest Area"?: string;
  "Booking URL"?: string;
  "Website URL"?: string;
  "TripAdvisor URL"?: string;
  "Pin Summary"?: string;
  "Works Great With — Distilleries"?: string[]; // linked record IDs -> Distilleries table
  "Works Great With — Local Features"?: string[]; // linked record IDs -> Local Features table
  // Added 05 Aug 2026 for the hotel-template rebuild - see FeaturedStay's
  // doc comments in types.ts for what each powers.
  "History Highlight Year"?: string;
  "History Highlight Quote"?: string;
  "History Highlight Source"?: string;
  "Gallery Captions"?: string;
  "Plan Your Days"?: string[]; // linked record IDs -> Days table
  // Added 06 Aug 2026 for the simplified two-column hotel template - At a
  // Glance rows, the Eating & Drinking section, and its Recognition line.
  Rooms?: string;
  "Room Types"?: string;
  Dogs?: string;
  Recognition?: string;
  "Eating & Drinking"?: string;
  // Focus box (06 Aug 2026) - see FeaturedStay.focusEyebrow's doc comment
  // in types.ts.
  "Focus Box Eyebrow"?: string;
  "Focus Box Text"?: string;
  "Focus Box Source"?: string;
}

/** Raw shape for the "Stay Distillery Distances" junction table - added 05
 *  Aug 2026 to power "Distilleries from your door". One row per
 *  hotel-distillery pair worth surfacing, with the one-way drive time
 *  between them - see the table's own description in Airtable for why
 *  this couldn't just be a field on either side. */
export interface AirtableStayDistilleryDistanceFields {
  Name?: string;
  Stay?: string[]; // linked record ID -> Featured Stays table
  Distillery?: string[]; // linked record ID -> Distilleries table
  "Drive Time (Minutes)"?: number;
}

/** Maps a raw Featured Stays record into a FeaturedStay - same pattern as
 *  mapToLocalFeature above, its closest template (schema was deliberately
 *  modelled on Local Features). Returns null for records missing a
 *  Name/Slug (Airtable placeholder rows, same "skip anything not a real
 *  record" pattern used everywhere else in this file).
 *
 *  Status gate (added when Mark asked to preview The Machrie's Draft
 *  record before it was reviewed live): on `VERCEL_ENV === "production"`,
 *  only Status: Live is ever returned - same Draft -> In review -> Live
 *  gate as the Days table, so a record still under review can never leak
 *  onto the real live site. On any other environment (preview
 *  deployments, local dev - VERCEL_ENV is unset locally) Draft/In review
 *  records are shown too, specifically so a feature-branch Vercel preview
 *  can be reviewed before a record is flipped to Live. `/stays` isn't
 *  linked from live navigation yet, so this has no live-traffic exposure
 *  risk today - worth revisiting this gate once it is.
 *
 *  `distilleryById`/`localFeatureById` are passed in (rather than fetched
 *  here) because this module has no dependency on src/lib/data/index.ts -
 *  same split already used by mapToLocalEvent's `allDistilleries` param,
 *  which avoids a circular import between the two files. */
export function mapToFeaturedStay(
  id: string,
  fields: AirtableFeaturedStayFields,
  distilleryById: Map<string, Distillery>,
  localFeatureById: Map<string, LocalFeature>,
  daysById: Map<string, HubDay>
): FeaturedStay | null {
  if (!fields.Name || !fields.Slug) return null;
  const isProduction = process.env.VERCEL_ENV === "production";
  if (isProduction && fields.Status !== "Live") return null;
  const FEATURED_STAYS_TABLE = "tblspiVzY3ihpm1o1";
  return {
    id,
    slug: fields.Slug,
    name: fields.Name,
    lat: fields.Latitude ?? 0,
    lng: fields.Longitude ?? 0,
    style: fields.Style || undefined,
    whyStay: fields["Why Stay"] || undefined,
    description: fields.Description ?? "",
    history: fields.History || undefined,
    // Routed through /api/attachment rather than using fields[...].url
    // directly - Airtable's own attachment URLs expire after a few hours,
    // which breaks images baked into ISR-cached pages. Same pattern as
    // mapToLocalFeature above.
    heroImageUrl: fields["Hero Image"]?.[0]
      ? `/api/attachment?t=${FEATURED_STAYS_TABLE}&r=${id}&f=fldRUCii4BcP4RxQQ&i=0`
      : undefined,
    heroImageCredit: fields["Hero Image Credit"] || undefined,
    gallery: (fields.Gallery ?? []).map(
      (_, i) => `/api/attachment?t=${FEATURED_STAYS_TABLE}&r=${id}&f=flduIQPfOlFT8IkMh&i=${i}`
    ),
    galleryCredits: fields["Gallery Credits"] ? fields["Gallery Credits"].split("\n") : undefined,
    priceFrom: fields["Price From"] != null ? `£${fields["Price From"]}` : "",
    facilities: fields.Facilities ?? [],
    setting: fields.Setting || undefined,
    distanceFromAirport: fields["Distance from Airport"] || undefined,
    distanceFromPortAskaigFerry: fields["Distance from Port Askaig Ferry"] || undefined,
    distanceFromPortEllenFerry: fields["Distance from Port Ellen Ferry"] || undefined,
    whiskyBarNote: fields["Whisky Bar/Collection Note"] || undefined,
    mobileSignalNote: fields["Mobile Signal Note"] || undefined,
    parking: fields.Parking || undefined,
    nearestArea: fields["Nearest Area"] || undefined,
    bookingUrl: fields["Booking URL"] || undefined,
    websiteUrl: fields["Website URL"] || undefined,
    tripAdvisorUrl: fields["TripAdvisor URL"] || undefined,
    pinSummary: fields["Pin Summary"] || undefined,
    // Resolved to full records, not just IDs/slugs, so "Works Great With"
    // can actually render something (name, image, link) rather than being
    // fetched-but-unused - see the doc comment on these fields in
    // types.ts for the exact past mistake this is guarding against.
    worksGreatWithDistilleries: (fields["Works Great With — Distilleries"] ?? [])
      .map((recId) => distilleryById.get(recId))
      .filter((d): d is Distillery => !!d),
    worksGreatWithLocalFeatures: (fields["Works Great With — Local Features"] ?? [])
      .map((recId) => localFeatureById.get(recId))
      .filter((f): f is LocalFeature => !!f),
    historyHighlightYear: fields["History Highlight Year"] || undefined,
    historyHighlightQuote: fields["History Highlight Quote"] || undefined,
    historyHighlightSource: fields["History Highlight Source"] || undefined,
    rooms: fields.Rooms || undefined,
    roomTypes: fields["Room Types"] || undefined,
    dogs: fields.Dogs || undefined,
    recognition: fields.Recognition || undefined,
    eatingDrinking: fields["Eating & Drinking"] || undefined,
    focusEyebrow: fields["Focus Box Eyebrow"] || undefined,
    focusText: fields["Focus Box Text"] || undefined,
    focusSource: fields["Focus Box Source"] || undefined,
    galleryCaptions: fields["Gallery Captions"] ? fields["Gallery Captions"].split("\n") : undefined,
    planYourDays: (fields["Plan Your Days"] ?? [])
      .map((recId) => daysById.get(recId))
      .filter((d): d is HubDay => !!d),
    // Filled in afterward by fetchFeaturedStaysFromAirtable - the Stay
    // Distillery Distances junction table isn't visible from here (see
    // this function's distilleryById/localFeatureById param comment for
    // why cross-table data gets passed in rather than fetched inline).
    nearestDistilleries: [],
    source: "airtable",
  };
}

export interface AirtableAreaFields {
  Name?: string;
  Slug?: string;
  Status?: string;
  Latitude?: number;
  Longitude?: number;
  Population?: number;
  "Population Source"?: string;
  "Why Hook"?: string;
  "What to Expect"?: string;
  "What Not to Expect"?: string;
  "Shops & Amenities"?: string;
  "Best For"?: string;
  "Not For"?: string;
  "Getting Here"?: string;
  "Distillery Region"?: string;
  "In-Village Food & Drink"?: string;
  "Hazard Callout"?: string;
  "Hero Image"?: AirtableAttachment[];
  "Hero Image Credit"?: string;
  "Nearby Local Features"?: string[]; // linked record IDs -> Local Features table
  "Featured Stays"?: string[]; // linked record IDs -> Featured Stays table
  "Alternate Areas"?: string[]; // linked record IDs -> Areas table (self)
  "Advisory Notice"?: string;
  "In The Village"?: string; // "Label: Value" per line
  "In The Village Missing"?: string;
  "Day Plan"?: string[]; // linked record IDs -> Days table (first one used)
  "Booking Advice"?: string; // "Label: Value" per line
  "Glance Places To Stay"?: string;
}

/** Parses the "Label: Value" per-line Airtable convention used by both
 *  In The Village and Booking Advice - splits on the first colon only, so
 *  a value containing its own colon (e.g. a time) doesn't get mangled.
 *  Blank/malformed lines are skipped rather than rendered broken. */
export function parseLabelValueLines(text?: string): { key: string; value: string }[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(":");
      if (i === -1) return null;
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      if (!key || !value) return null;
      return { key, value };
    })
    .filter((r): r is { key: string; value: string } => r !== null);
}

/** Maps a raw Areas record. Alternate Areas resolves to {name, slug} pairs
 *  only (via areaMetaById, built from the raw record list before any
 *  Area objects exist) rather than full Area records, since self-linking
 *  would otherwise need every Area fully mapped first - a circular
 *  dependency this avoids by not needing more than a link+label for that
 *  one "point elsewhere" section. */
export function mapToArea(
  id: string,
  fields: AirtableAreaFields,
  localFeatureById: Map<string, LocalFeature>,
  featuredStayById: Map<string, FeaturedStay>,
  areaMetaById: Map<string, { name: string; slug: string }>,
  daysById: Map<string, HubDay>
): Area | null {
  if (!fields.Name || !fields.Slug) return null;
  const isProduction = process.env.VERCEL_ENV === "production";
  if (isProduction && fields.Status !== "Live") return null;
  const AREAS_TABLE = "tbl0lIjmDpdrTsM7F";
  return {
    id,
    slug: fields.Slug,
    name: fields.Name,
    lat: fields.Latitude ?? 0,
    lng: fields.Longitude ?? 0,
    population: fields.Population ?? undefined,
    populationSource: fields["Population Source"] || undefined,
    whyHook: fields["Why Hook"] || undefined,
    whatToExpect: fields["What to Expect"] ?? "",
    whatNotToExpect: fields["What Not to Expect"] || undefined,
    shopsAmenities: fields["Shops & Amenities"] || undefined,
    bestFor: fields["Best For"] || undefined,
    notFor: fields["Not For"] || undefined,
    gettingHere: fields["Getting Here"] || undefined,
    distilleryRegion: fields["Distillery Region"] || undefined,
    inVillageFoodDrink: fields["In-Village Food & Drink"] || undefined,
    hazardCallout: fields["Hazard Callout"] || undefined,
    // Routed through /api/attachment rather than fields[...].url directly -
    // Airtable's own attachment URLs expire after a few hours, same
    // pattern as mapToFeaturedStay/mapToLocalFeature.
    heroImageUrl: fields["Hero Image"]?.[0]
      ? `/api/attachment?t=${AREAS_TABLE}&r=${id}&f=fldLzSOiLgUI1OwOw&i=0`
      : undefined,
    heroImageCredit: fields["Hero Image Credit"] || undefined,
    // Filled in afterward by fetchAreasFromAirtable, same reasoning as
    // FeaturedStay.nearestDistilleries - the full Distilleries list isn't
    // visible from inside this function.
    distilleries: [],
    nearbyLocalFeatures: (fields["Nearby Local Features"] ?? [])
      .map((recId) => localFeatureById.get(recId))
      .filter((f): f is LocalFeature => !!f),
    featuredStays: (fields["Featured Stays"] ?? [])
      .map((recId) => featuredStayById.get(recId))
      .filter((s): s is FeaturedStay => !!s),
    alternateAreas: (fields["Alternate Areas"] ?? [])
      .map((recId) => areaMetaById.get(recId))
      .filter((a): a is { name: string; slug: string } => !!a),
    advisoryNotice: fields["Advisory Notice"] || undefined,
    inTheVillage: parseLabelValueLines(fields["In The Village"]),
    inTheVillageMissing: fields["In The Village Missing"] || undefined,
    dayPlan: fields["Day Plan"]?.[0] ? daysById.get(fields["Day Plan"][0]) : undefined,
    bookingAdvice: parseLabelValueLines(fields["Booking Advice"]),
    glancePlacesToStay: fields["Glance Places To Stay"] || undefined,
    source: "airtable",
  };
}

/** Great-circle distance in km between two lat/lng points (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Airtable has no "Next Stops" field. We derive a sensible default —
 * the two geographically nearest other distilleries — so the itinerary
 * "where next" UI still has data. Mark can override this later by adding
 * a real "Next Stops" linked-record field in Airtable if curated routes
 * (rather than pure distance) are wanted.
 */
export function deriveNextStops(target: Distillery, all: Distillery[]): string[] {
  return all
    .filter((d) => d.slug !== target.slug)
    .map((d) => ({ slug: d.slug, dist: distanceKm(target, d) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2)
    .map((d) => d.slug);
}

export interface AirtableDayFields {
  Name?: string;
  Slug?: string;
  Type?: string;
  Narrative?: string;
  Status?: string;
  Pacing?: string;
  "Duration from Port Ellen"?: string;
  "Duration from Bowmore"?: string;
  "Transport Note"?: string;
  "Day Stops"?: string[]; // linked record IDs -> Day Stops table
}

export interface AirtableDayStopFields {
  Name?: string;
  Day?: string[];
  Distillery?: string[]; // linked record ID -> Distilleries table
  Tour?: string[]; // linked record ID -> Tours table
  Order?: number;
  /** True if this stop is the reason its Day exists - not droppable in
   *  the day screen's editing UI (added 9 Aug 2026, populated for every
   *  real Day Stop record already - see Distillery/HubDay.stops'
   *  `anchor` in types.ts). Undefined/false otherwise. */
  Anchor?: boolean;
}

// Matches the [label](/path) inline links already used in Day narratives
// (same renderWithLinks pattern as the Distillery/Explore pages) - reused
// here (and in src/lib/data/index.ts's own copy for getDays' Hub gating)
// to resolve which real Local Features a Day's map should pin, since Day
// Stops only links Day -> Distillery -> Tour, not Day -> Local Feature.
// Whatever the narrative actually links to under /explore/ is exactly the
// set of Local Features that Day cares about.
const EXPLORE_LINK_RE = /\[([^\]]+)\]\(\/explore\/([a-z0-9-]+)\)/g;

/** Everything mapAirtableDayRecord needs already resolved/looked-up, so it
 *  stays a pure per-record mapper (same shape as mapTour/mapToLocalFeature
 *  etc. elsewhere in this file) rather than doing its own Airtable calls. */
export interface DayResolutionContext {
  dayStopById: Map<string, AirtableDayStopFields>;
  tourById: Map<string, Tour>;
  distilleryById: Map<string, Distillery>;
  localFeatureBySlug: Map<string, LocalFeature>;
}

/** Maps one raw Days table record (+ its resolved Day Stops) into a
 *  HubDay - the single shared join/mapping logic behind both /days
 *  (getDays, Status: Live only, stops.length > 0 required - see that
 *  caller) and /journeys/[slug] (getJourneys, no such gating - a Journey
 *  and the Days inside it render regardless of Status, per Mark's own
 *  pre-launch review process). Extracted 12 Aug 2026 from what used to be
 *  inline logic in fetchDaysFromAirtable, specifically so the Journeys
 *  rebuild could reuse the exact same day-detail data shape instead of
 *  building a second, parallel one - see docs/content-structure-
 *  conventions.md's "Classic Journey day-by-day template".
 *
 *  Returns null for a blank placeholder row (no Name/Slug) - same
 *  "skip anything not a real record" pattern used everywhere else this
 *  file maps a table with a few empty seed rows mixed in. */
export function mapAirtableDayRecord(
  record: AirtableRecord<AirtableDayFields>,
  ctx: DayResolutionContext
): HubDay | null {
  const f = record.fields;
  if (!f.Name || !f.Slug) return null;

  const stopIds = f["Day Stops"] ?? [];
  const resolvedStops = stopIds
    .map((id) => ctx.dayStopById.get(id))
    .filter((s): s is AirtableDayStopFields => !!s)
    .map((s) => ({
      distillery: s.Distillery?.[0] ? ctx.distilleryById.get(s.Distillery[0]) : undefined,
      tour: s.Tour?.[0] ? ctx.tourById.get(s.Tour[0]) : undefined,
      order: s.Order ?? 0,
      anchor: s.Anchor === true,
    }))
    .filter(
      (s): s is { distillery: Distillery; tour: Tour | undefined; order: number; anchor: boolean } =>
        !!s.distillery
    )
    .sort((a, b) => a.order - b.order);

  const totalCost = resolvedStops.reduce((sum, s) => sum + (s.tour?.price ?? 0), 0);

  const mapFeatures: NonNullable<HubDay["mapFeatures"]> = [];
  const featureStops: HubDay["featureStops"] = [];
  const narrative = f.Narrative ?? "";
  for (const match of narrative.matchAll(EXPLORE_LINK_RE)) {
    const feature = ctx.localFeatureBySlug.get(match[2]);
    if (feature) {
      mapFeatures.push({ name: feature.name, slug: feature.slug, lat: feature.lat, lng: feature.lng, icon: feature.icon });
      featureStops.push(feature);
    }
  }

  const mapDistilleries: NonNullable<HubDay["mapDistilleries"]> = resolvedStops.map((s) => ({
    name: s.distillery.name,
    slug: s.distillery.slug,
    lat: s.distillery.lat,
    lng: s.distillery.lng,
  }));

  return {
    id: record.id,
    slug: f.Slug,
    name: f.Name,
    type: f.Type === "Multi" ? "Multi" : "Solo",
    distilleries: resolvedStops.map((s) => s.distillery.name),
    narrative,
    transportNote: f["Transport Note"] ?? "",
    pacing: f.Pacing ?? "",
    durationPortEllen: f["Duration from Port Ellen"] ?? "",
    durationBowmore: f["Duration from Bowmore"] ?? "",
    cost: totalCost > 0 ? `£${totalCost}pp` : "",
    mapDistilleries,
    mapFeatures: mapFeatures.length > 0 ? mapFeatures : undefined,
    stops: resolvedStops.map((s) => ({ distillery: s.distillery, tour: s.tour, anchor: s.anchor })),
    featureStops,
    source: "airtable",
  };
}

export interface AirtableJourneyFields {
  Name?: string;
  Slug?: string;
  Status?: string;
  "Card Description"?: string;
  Intro?: string;
  "Hero Image"?: AirtableAttachment[];
  "Hero Image Credit"?: string;
  "Getting There Note"?: string;
  "Accommodation Note"?: string;
  "Journey Days"?: string[]; // linked record IDs -> Journey Days table
}

export interface AirtableJourneyDayFields {
  Name?: string;
  Journey?: string[]; // linked record ID -> Journeys table
  Day?: string[]; // linked record ID -> Days table
  Order?: number;
}

export interface AirtableEventFields {
  Name?: string;
  Date?: string;
  "End Date"?: string;
  Time?: string;
  Location?: string;
  Description?: string;
  Link?: string;
  Category?: string;
  Price?: string;
  "Source URL"?: string;
  Distilleries?: string[];
}

const EVENT_CATEGORY_MAP: Record<string, LocalEvent["category"]> = {
  "Distillery Event": "Distillery Event",
  Festival: "Festival",
  "Seasonal Release": "Seasonal Release",
  Other: "Other",
};

/** Maps a raw Events record, resolving linked distillery record IDs to
 *  slugs against the already-fetched distilleries list (Airtable link
 *  fields return {id, name} pairs, not slugs, so this cross-reference is
 *  needed to link an event to a map pin). */
export function mapToLocalEvent(
  id: string,
  fields: AirtableEventFields,
  allDistilleries: Distillery[]
): LocalEvent | null {
  if (!fields.Name || !fields.Date) return null;
  const linkedIds = fields.Distilleries ?? [];
  const distillerySlugs = allDistilleries.filter((d) => linkedIds.includes(d.id)).map((d) => d.slug);
  return {
    id,
    name: fields.Name,
    date: fields.Date,
    endDate: fields["End Date"],
    time: fields.Time,
    location: fields.Location ?? "",
    description: fields.Description ?? "",
    link: fields.Link,
    category: EVENT_CATEGORY_MAP[fields.Category ?? ""] ?? "Other",
    price: fields.Price,
    sourceUrl: fields["Source URL"],
    distillerySlugs,
    source: "airtable",
  };
}
