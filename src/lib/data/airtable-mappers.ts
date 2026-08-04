import type { AirtableAttachment } from "@/lib/airtable";
import type { Distillery, FeaturedStay, JournalPost, LocalEvent, LocalFeature, NearbyFeature, Tour } from "@/lib/types";

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
  "Distance from Ferry/Airport"?: string;
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
  localFeatureById: Map<string, LocalFeature>
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
    distanceFromFerryAirport: fields["Distance from Ferry/Airport"] || undefined,
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
    source: "airtable",
  };
}

/** Great-circle distance in km between two lat/lng points (haversine). */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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
