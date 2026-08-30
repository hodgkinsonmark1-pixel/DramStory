import type { AirtableAttachment, AirtableRecord } from "@/lib/airtable";
import type { Area, Distillery, FeaturedStay, HubDay, ItineraryStop, JournalPost, LocalEvent, LocalFeature, NearbyFeature, SeasonalWindow, Tour, TravelMode } from "@/lib/types";

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
  /** Attribution for Hero Image, added to the table 29 Aug 2026. Every
   *  distillery hero on this site came from Geograph or Wikimedia
   *  Commons under CC BY / CC BY-SA, where crediting the photographer is
   *  a CONDITION of the licence rather than a courtesy - and none of
   *  them was credited until this field existed. Same `[label](url)`
   *  markdown convention as Areas', Local Features', Featured Stays' and
   *  Journeys' identically-named fields.
   *
   *  May carry a sentence of plain prose BEFORE the link where the
   *  photograph needs explaining - Laggan Bay's says the picture is of
   *  the beach the distillery is named after, not of the distillery -
   *  so the page's renderer splits on the link rather than requiring the
   *  whole value to be one. */
  "Hero Image Credit"?: string;
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
  /** Go-live gate (added to the table 29 Aug 2026 by the site owner).
   *  Ticked on all 11 distilleries open to visitors; unticked on Laggan
   *  Bay and Portintruan, which are real, producing distilleries that
   *  take no visitors. Their records are complete and correct - they are
   *  held back only because the distillery page template assumes a
   *  visitable distillery (a Book a Tour button over an empty tours
   *  section, an empty Visit panel, "Est. 0"), and the not-yet-open
   *  variant of that template is still to be built.
   *
   *  Deliberately NOT the `Status` field: Status is a content-workflow
   *  marker (Todo/In progress/Done) and is blank on 9 of the 11 live
   *  distilleries, so gating on it would hide most of the site.
   *
   *  Enforced in fetchDistilleriesFromAirtable - the single point every
   *  page, map, picker and "suggested next stops" list reads distilleries
   *  through. Missing/false means unpublished. */
  Published?: boolean;
  /** Whether visitors can actually turn up (added to the table 29 Aug
   *  2026 by the site owner, alongside Published). Ticked on all 11
   *  distilleries with a visitor centre; unticked on Laggan Bay and
   *  Portintruan.
   *
   *  Separate question from Published on purpose. Published decides
   *  whether the record renders AT ALL; this decides whether the site is
   *  allowed to imply you can go. Both are unticked on the two new
   *  records today, but they will diverge the moment the site owner
   *  publishes them - which is the whole point of the not-yet-open page
   *  variant. See Distillery.openToVisitors in types.ts. */
  "Open To Visitors"?: boolean;
  "Homepage Badge"?: string;
}

export interface AirtableTourFields {
  Name?: string;
  Distillery?: string[];
  Duration?: string;
  Price?: number;
  Description?: string;
  /** Editorial confidence in the row - "Verified — official source",
   *  "Needs check before go-live", "Placeholder — do not publish".
   *  Added to the table 18 Aug 2026 by the site owner; read here so the
   *  "standard tours start at" floor on /journeys/[slug] can skip the
   *  rows nobody stands behind. Two Bowmore alternatives are flagged
   *  Placeholder and would otherwise undercut a real published price. */
  Verification?: string;
  "Last Verified"?: string;
  /** Inclusive ISO dates bounding a period in which this tour runs
   *  differently from the rest of this record - Laphroaig's and Ardbeg's
   *  silent seasons, Ardnahoe's summer maintenance shutdown. Blank on
   *  every tour with no seasonal variation, which is nearly all of them.
   *  Added to the table 18 Aug 2026. Year-specific: these are real dates
   *  for one year, not a recurring rule. */
  "Seasonal From"?: string;
  "Seasonal To"?: string;
  /** What actually changes inside that window, written for the visitor.
   *  Read verbatim - the whole value of this field is that a human wrote
   *  "five drams rather than three, fully accessible, 18+" rather than
   *  the site printing a generic "this tour may be affected". */
  "Seasonal Note"?: string;
  /** Day names ("Monday", "Saturday", ...) for the weekdays this tour
   *  runs. Added to the table 29 Aug 2026 by the site owner, populated
   *  on three Ardbeg tours only. Blank on every other tour, and blank
   *  means "no tour-specific restriction" - see Tour.runsOnDays in
   *  types.ts for why two of Ardbeg's own tours are left blank on
   *  purpose rather than half-encoded. */
  "Runs On Days"?: string[];
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
 *  (Days/Trip flow Phase 4, docs/days-trip-flow-handoff.md §2.2/§4.4)
 *  and, since 29 Aug 2026, Tours' "Runs On Days" into Tour.runsOnDays -
 *  the two inputs to the same availability check, so they read the day
 *  names through the same table rather than two that could disagree. */
const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Airtable day names -> weekday indices. An unrecognised option is
 *  dropped rather than guessed at: a day nobody can name is a day this
 *  codebase won't warn about. */
export function mapWeekdayNames(days: string[] | undefined): number[] {
  if (!days) return [];
  return days
    .map((name) => WEEKDAY_INDEX[name])
    .filter((n): n is number => n != null);
}

export function mapClosedDays(closedDays: string[] | undefined): number[] {
  return mapWeekdayNames(closedDays);
}

export function mapTour(fields: AirtableTourFields): Tour {
  return {
    name: fields.Name ?? "",
    duration: fields.Duration ?? "",
    price: fields.Price ?? 0,
    description: fields.Description ?? "",
    // Verbatim, trimmed, undefined when blank - never normalised into a
    // boolean here. See Tour.verification and isPublishableTour.
    verification: fields.Verification?.trim() || undefined,
    lastVerified: fields["Last Verified"] || undefined,
    // All three or nothing. A window with no note has nothing to say,
    // and a note with no window can't be tested against a visitor's
    // dates - so it would have to be shown always or never, and "always"
    // is the failure mode this whole feature is built to avoid. See
    // Tour.seasonal.
    seasonal: seasonalWindow(fields),
    // Empty is the normal case and means "runs whenever its distillery
    // is open" - never "unknown". See Tour.runsOnDays.
    runsOnDays: mapWeekdayNames(fields["Runs On Days"]),
  };
}

function seasonalWindow(fields: AirtableTourFields): SeasonalWindow | undefined {
  const from = fields["Seasonal From"]?.trim();
  const to = fields["Seasonal To"]?.trim();
  const note = fields["Seasonal Note"]?.trim();
  if (!from || !to || !note) return undefined;
  return { from, to, note };
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
  "Card Note"?: string;
  Areas?: string[]; // linked record IDs -> Areas table
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
    cardNote: fields["Card Note"] || undefined,
    areaIds: fields.Areas ?? [],
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
/** The two nearest distilleries to `target`, by straight-line distance.
 *  `candidates` is deliberately not "every distillery": callers pass the
 *  VISITABLE ones only, because this drives "Suggested next stops", which
 *  is an invitation to drive somewhere. See the call site in
 *  fetchDistilleriesFromAirtable. */
export function deriveNextStops(target: Distillery, candidates: Distillery[]): string[] {
  return candidates
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
  /** One-line teaser for the compact day card (journey spine, /days hub
   *  card) - shorter than and distinct from Narrative. Added 13 Aug 2026
   *  for the Journeys page rebuild. */
  Hook?: string;
  /** Only populated for days genuinely walkable end-to-end, e.g.
   *  "2 miles". Blank means "not a walking day" - callers fall back to
   *  "Duration from Port Ellen" instead. Added 13 Aug 2026. */
  "Distance on Foot"?: string;
  /** The whole caption under the numeral on a journey spine day card's
   *  pace tile - noun and phrase together ("distilleries one road",
   *  "distillery and a beach"). See HubDay.tileCaption. Blank is a
   *  supported state, not a gap to fill: the tile shows the numeral
   *  alone. Added 17 Aug 2026, populated on all 16 real Days.
   *
   *  REPLACES `Tile Label`, which held only the second line and left the
   *  noun to be generated in code. That field is no longer read by
   *  anything; it is left on the table rather than deleted only because
   *  field deletion isn't available over the API this project uses. */
  "Tile Caption"?: string;
  /** Short phrase naming where the day happens - "The north east",
   *  "The Rhinns". Added 18 Aug 2026; see HubDay.areaNote for why this
   *  is not the Areas link. */
  "Area Note"?: string;
  /** One-glance transport summary for the day card header, e.g. "Car
   *  needed". Added 18 Aug 2026; see HubDay.transportClause. */
  "Transport Clause"?: string;
  /** Short name for this day's spend in the cost breakdown. Added 18 Aug
   *  2026; see HubDay.costLabel. */
  "Cost Label"?: string;
  /** When this Day starts, "HH:MM" (e.g. "13:00"). Blank means the 09:30
   *  default (docs/days-trip-flow-handoff.md §2.2). Added 16 Aug 2026.
   *
   *  This REPLACES the retired "Day Timeline" field, which held a
   *  hand-written run of times for the journey page's "THE DAY" strip.
   *  That field has been deleted from the Days table (confirmed against
   *  Airtable, 16 Aug 2026 - a read naming it now 422s), and with it the
   *  bug it caused: a hand-written timeline and the computed schedule on
   *  the day screen were two independent sources for the same fact, and
   *  showed the same day starting at two different times. Everything is
   *  computed from Start Time now - see scheduleForHubDay() in
   *  day-derivations.ts. */
  "Start Time"?: string;
  /** "Drive" | "Walk" - how the visitor gets between this Day's stops.
   *  Blank is treated as Drive (every Day was implicitly a driving day
   *  before this field existed). Added 17 Aug 2026; populated on all 16
   *  real Days. Chooses the OSRM profile in
   *  scripts/compute-day-stop-legs.mjs and the site's own drive/walk
   *  wording - see HubDay.travelMode. */
  "Travel Mode"?: string;
}

export interface AirtableDayStopFields {
  Name?: string;
  Day?: string[];
  Distillery?: string[]; // linked record ID -> Distilleries table
  /** linked record ID -> Local Features table. MUTUALLY EXCLUSIVE with
   *  `Distillery`: a Day Stop is one place, and which of the two tables
   *  that place lives in is the only difference. Added 17 Aug 2026 -
   *  before it existed, a Day's cafes, beaches, ruins and museums were
   *  only ever inline [label](/explore/slug) links inside its Narrative,
   *  so they carried no routed leg, counted for nothing in the day's
   *  walking total, and sat after every distillery whatever order the
   *  prose described. */
  "Local Feature"?: string[];
  Tour?: string[]; // linked record ID -> Tours table
  Order?: number;
  /** True if this stop is the reason its Day exists - not droppable in
   *  the day screen's editing UI (added 9 Aug 2026, populated for every
   *  real Day Stop record already - see Distillery/HubDay.stops'
   *  `anchor` in types.ts). Undefined/false otherwise. */
  Anchor?: boolean;
  /** Real routed travel time IN MINUTES from the previous stop in this
   *  Day (by Order) to this one, precomputed once by
   *  scripts/compute-day-stop-legs.mjs rather than at render time - the
   *  OSRM public demo server is explicitly non-commercial with no SLA,
   *  so it is not something to call on every page view. Blank on the
   *  first stop of a Day (nothing precedes it) and blank wherever
   *  routing failed; blank means the site falls back to its own
   *  straight-line estimate for that leg. Added 17 Aug 2026. */
  "Leg Minutes"?: number;
  /** The clock time this stop actually happens at, "HH:MM" (e.g.
   *  "13:00") - the published start of the tour booked here. Added 17
   *  Aug 2026. Blank is the normal case and means exactly what it used
   *  to: this stop starts when the previous one finishes plus the travel
   *  between them. Set, it pins the stop to that time and the gap in
   *  front of it becomes the visitor's own - see
   *  scheduleForItineraryDay() in day-derivations.ts. */
  "Scheduled Time"?: string;
  /** Real routed distance in km for the same leg. Not rendered anywhere
   *  yet - stored so a leg can be sanity-checked against the map without
   *  re-routing. */
  "Leg Distance (km)"?: number;
  /** Internal only. ISO date the two fields above were last computed, so
   *  a leg left stale by a reorder/coordinate change can be spotted. */
  "Leg Computed"?: string;
  /** True where the Day's own narrative frames this stop as a choice
   *  ("if you have the energy... it's worth continuing"), not part of
   *  the plan. Added 17 Aug 2026. See ItineraryStop.optional for what
   *  the site does with it - in short, it splits a walking total into
   *  the plan and the detour rather than merging them. */
  Optional?: boolean;
  /** "Drive" | "Walk" - how the visitor reaches THIS stop from the
   *  previous one in its Day. Added 17 Aug 2026. Blank is the normal
   *  case and inherits the Day's own `Travel Mode`; it is authored only
   *  where one leg differs from the rest of its day, i.e. a walked final
   *  approach on an otherwise driven day.
   *
   *  It exists because scripts/compute-day-stop-legs.mjs used to carry a
   *  hardcoded list of Local Feature slugs to force onto the foot
   *  profile - code knowing about specific beaches. Same field now
   *  chooses the OSRM profile there and paces the site's own fallback
   *  estimate here (see ItineraryStop.arriveBy / legModeFor). */
  "Arrive By"?: string;
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
  /** By RECORD ID, for Day Stops' own `Local Feature` link - as opposed
   *  to `localFeatureBySlug` above, which resolves the /explore/<slug>
   *  links found in a Narrative. Both are needed and they answer
   *  different questions: one "which feature is this stop", the other
   *  "which feature does this sentence point at". */
  localFeatureById: Map<string, LocalFeature>;
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

  // Every Day Stop of this Day, in ONE `Order` sequence, whether it
  // links a Distillery or a Local Feature. A row that resolves to
  // neither (a blank placeholder, or a link to a record that no longer
  // exists) is dropped rather than becoming a stop with no place.
  const orderedStops: ItineraryStop[] = (f["Day Stops"] ?? [])
    .map((id) => ctx.dayStopById.get(id))
    .filter((s): s is AirtableDayStopFields => !!s)
    .map((s) => {
      const shared = {
        anchor: s.Anchor === true,
        optional: s.Optional === true,
        // Read straight through, never recomputed here: this is the
        // precomputed routed leg from the PREVIOUS stop in this Day. A
        // blank cell (first stop of the day, or a leg whose routing
        // failed) stays undefined so the schedule falls back to its own
        // estimate for that leg alone.
        legMinutes: typeof s["Leg Minutes"] === "number" ? s["Leg Minutes"] : undefined,
        // Also read straight through, not validated here: a cell that
        // isn't a clock time is caught once, in the schedule's own parser,
        // which falls back to the chained behaviour rather than throwing.
        scheduledTime: s["Scheduled Time"]?.trim() || undefined,
        // Blank stays undefined rather than defaulting to "drive" here:
        // the difference between "this leg is driven" and "nobody said,
        // so use the Day's mode" is the whole point of the field, and
        // collapsing it at the mapper would silently drive every leg of
        // every walking day.
        arriveBy: ((s["Arrive By"] === "Walk" ? "walk" : s["Arrive By"] === "Drive" ? "drive" : undefined) as
          | TravelMode
          | undefined),
      };
      const order = s.Order ?? 0;
      const distillery = s.Distillery?.[0] ? ctx.distilleryById.get(s.Distillery[0]) : undefined;
      if (distillery) {
        const stop: ItineraryStop = {
          kind: "distillery",
          distillery,
          tour: s.Tour?.[0] ? ctx.tourById.get(s.Tour[0]) : undefined,
          ...shared,
        };
        return { order, stop };
      }
      const feature = s["Local Feature"]?.[0] ? ctx.localFeatureById.get(s["Local Feature"][0]) : undefined;
      if (feature) {
        const stop: ItineraryStop = { kind: "feature", feature, ...shared };
        return { order, stop };
      }
      return { order, stop: undefined };
    })
    .filter((s): s is { order: number; stop: ItineraryStop } => !!s.stop)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.stop);

  // The distillery-only subset, still in visiting order - what `stops`
  // has always meant, and what prices, pick-hits and the ferry check
  // still want. NOTE its `legMinutes` is the leg from whatever stop
  // precedes it in the FULL order, which may now be a feature; anything
  // adding legs up must walk `orderedStops`, not this.
  const resolvedStops = orderedStops.flatMap((s) =>
    s.kind === "distillery" ? [{ distillery: s.distillery, tour: s.tour, anchor: s.anchor === true, legMinutes: s.legMinutes, scheduledTime: s.scheduledTime }] : []
  );

  const totalCost = resolvedStops.reduce((sum, s) => sum + (s.tour?.price ?? 0), 0);

  // Features this Day cares about, in visiting order: the ones it now
  // has real Day Stop records for first, then any the Narrative links
  // that no Day Stop covers. The second half is the ORIGINAL behaviour,
  // kept deliberately - it is what still pins a feature a narrative
  // mentions but nobody has ordered into the day yet, and dropping it
  // would silently lose map pins.
  const featureStops: HubDay["featureStops"] = orderedStops.flatMap((s) => (s.kind === "feature" ? [s.feature] : []));
  const narrative = f.Narrative ?? "";
  const narrativeOnlyFeatures: LocalFeature[] = [];
  for (const match of narrative.matchAll(EXPLORE_LINK_RE)) {
    const feature = ctx.localFeatureBySlug.get(match[2]);
    if (!feature) continue;
    if (featureStops.some((existing) => existing.id === feature.id)) continue;
    if (narrativeOnlyFeatures.some((existing) => existing.id === feature.id)) continue;
    narrativeOnlyFeatures.push(feature);
  }
  featureStops.push(...narrativeOnlyFeatures);

  const mapFeatures: NonNullable<HubDay["mapFeatures"]> = featureStops.map((feature) => ({
    name: feature.name,
    slug: feature.slug,
    lat: feature.lat,
    lng: feature.lng,
    icon: feature.icon,
  }));

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
    stops: resolvedStops,
    orderedStops,
    featureStops,
    hook: f.Hook ?? "",
    distanceOnFoot: f["Distance on Foot"] || undefined,
    tileCaption: f["Tile Caption"]?.trim() || undefined,
    areaNote: f["Area Note"]?.trim() || undefined,
    transportClause: f["Transport Clause"]?.trim() || undefined,
    costLabel: f["Cost Label"]?.trim() || undefined,
    startTime: f["Start Time"]?.trim() || undefined,
    // Blank is Drive, per the field's own description - not a third
    // "unknown" state. Anything other than the exact "Walk" option falls
    // to drive rather than throwing on an unexpected select value.
    travelMode: f["Travel Mode"] === "Walk" ? "walk" : "drive",
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
  /** One-sentence claim shown in the dark band under the hero - markdown
   *  `**bold**` for emphasis on the payoff clause. Added 13 Aug 2026. */
  Claim?: string;
  /** Short region/theme kicker above the journey title, e.g. "The Peated
   *  South". Added 13 Aug 2026. */
  "Region Label"?: string;
  /** Total nights for this journey - an explicit editorial call, not
   *  always Day count ± 1. Added 13 Aug 2026. */
  Nights?: number;
  /** Where the visitor sleeps, e.g. "Port Ellen" - shown on each night
   *  connector between day cards. Added 13 Aug 2026. */
  Base?: string;
  /** One line per night, in order. Fewer lines than Nights repeats the
   *  last line; blank falls back to Accommodation Note. Added 13 Aug
   *  2026. */
  "Night Notes"?: string;
  /** Up to 3 "Make it yours" variation cards, one per line, pipe-
   *  delimited: EYEBROW | Title | Body | link-slug. Added 13 Aug 2026. */
  "Make It Yours"?: string;
  /** "Getting here and away" panel rows - "Label: Value" per line, same
   *  convention as Areas' In The Village. Added 13 Aug 2026. */
  "Getting Here Rows"?: string;
  /** "Before you book" panel rows - same convention. Added 13 Aug 2026.
   *  Still mapped, no longer rendered on /journeys/[slug] since 18 Aug
   *  2026 - see "When To Come Rows" below. */
  "Before You Book Rows"?: string;
  /** "When to come" panel rows - same "Label: Value" convention. Three
   *  rows: Silent, Fèis Ìle, Rooms. Added 18 Aug 2026, taking the slot
   *  "Before You Book Rows" used to hold. */
  "When To Come Rows"?: string;
  /** Indicative lowest (off-season) per-night room rate at this
   *  Journey's Base. Populated 17 Aug 2026 for the two Port Ellen
   *  journeys only (Ardbeg House); the two Bridgend journeys are still
   *  blank and the sidebar renders a pending state for them rather than
   *  copying the Port Ellen figure across. Added 13 Aug 2026. */
  "Accommodation From (per night)"?: number;
  /** Indicative PEAK-season per-night room rate at the same Base - the
   *  top end of the sidebar's range. Same blank-means-pending rule.
   *  Added 17 Aug 2026. */
  "Accommodation Peak (per night)"?: number;
  /** Indicative car hire per day. Blank means one of two DIFFERENT
   *  things and the sidebar has to tell them apart: "no car needed"
   *  (The Kildalton Road, every day walkable) or "not priced yet"
   *  (the Bridgend journeys). Added 17 Aug 2026. */
  "Car Hire Per Day"?: number;
  /** One factual sentence under the sidebar route map. Written in
   *  Airtable (never composed in code) so it can be reviewed like any
   *  other editorial line. Added 13 Aug 2026. */
  "Route Summary"?: string;
  /** "Drive" | "Walk" - how the visitor gets from their Base to where
   *  each day STARTS, and back again. The TRANSFER legs only. Blank is
   *  treated as Drive.
   *
   *  Deliberately NOT the same thing as a Day's own `Travel Mode`, which
   *  governs movement BETWEEN that day's stops: a car-based journey
   *  drives its transfers even to a day that is walked once you arrive
   *  (drive Port Ellen -> Bowmore, then walk Bowmore). Added 17 Aug 2026,
   *  after the first pass at base legs conflated the two and routed that
   *  Bowmore transfer on foot - 269 minutes. */
  "Transfer Mode"?: string;
  /** Linked Featured Stay - the actual building the visitor sleeps in on
   *  this journey, and the origin the transfer legs are measured from.
   *  Preferred over the `Base` text field's village centroid, and it is
   *  what this record's accommodation rates refer to. One stay only;
   *  first link used. Added 17 Aug 2026. */
  "Base Stay"?: string[];
  /** An explicit coordinate to measure this journey's TRANSFER legs from,
   *  overriding both the `Base` village's Areas centroid and `Base Stay`.
   *  Both halves are required; one on its own is ignored.
   *
   *  Populated 17 Aug 2026 for The Kildalton Road only. Port Ellen's
   *  Areas centroid (55.629332, -6.188077) sits about 360m west of where
   *  the Three Distilleries Pathway actually starts, so every transfer on
   *  that journey was being measured across half a village the visitor
   *  never walks - and the site printed a longer figure than the signage
   *  in front of them. The override is PA42 7BW via postcodes.io, next to
   *  Port Ellen Primary School, which is where Walkhighlands and
   *  islayjura.com both put the pathway's start.
   *
   *  Blank on the other three journeys, which is the normal case and
   *  changes nothing about how they resolve. */
  "Transfer Origin Latitude"?: number;
  "Transfer Origin Longitude"?: number;
  /** What that coordinate IS, in the visitor's words - "the pathway start
   *  by Port Ellen Primary School". Editorial copy, never composed in
   *  code, and the reason the override is safe to make at all: a transfer
   *  time measured from somewhere other than the named Base has to say so
   *  on the page, or it is a number that silently disagrees with the map.
   *  Blank (the other three journeys) keeps the existing "from {Base}"
   *  phrasing everywhere. */
  "Transfer Origin Label"?: string;
}

/** Parses the "Make It Yours" field - one card per line, pipe-delimited
 *  EYEBROW | Title | Body | link-slug. A line missing any of the four
 *  parts is skipped rather than rendered half-built; the slug is
 *  resolved to a real /days or /journeys URL by the page itself (it
 *  needs both tables to know which), not here. */
export function parseMakeItYours(
  text?: string
): { eyebrow: string; title: string; body: string; linkSlug: string }[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 4) return null;
      const [eyebrow, title, body, linkSlug] = parts;
      if (!eyebrow || !title || !body || !linkSlug) return null;
      return { eyebrow, title, body, linkSlug };
    })
    .filter(
      (c): c is { eyebrow: string; title: string; body: string; linkSlug: string } => c !== null
    )
    .slice(0, 3);
}

export interface AirtableJourneyDayFields {
  Name?: string;
  Journey?: string[]; // linked record ID -> Journeys table
  Day?: string[]; // linked record ID -> Days table
  Order?: number;
  /** Routed minutes from this Journey's Base to this Day's FIRST stop,
   *  and from its LAST stop back again - precomputed offline by
   *  scripts/compute-journey-base-legs.mjs. On the junction, not the Day,
   *  because the same Day is reached from a different bed in each
   *  Journey that includes it. Blank is normal (never routed, or
   *  deliberately blank where the Day's own Transport Note says the
   *  transfer isn't made the way the Day's Travel Mode implies) - the
   *  reader falls back to an estimate. Added 17 Aug 2026. */
  "Leg From Base Minutes"?: number;
  "Leg To Base Minutes"?: number;
  /** Was that leg actually walked? Usually just the Journey's Transfer
   *  Mode, but a transfer under 600m (SHORT_TRANSFER_WALK_METRES in
   *  scripts/lib/routing.mjs) is walked even on a Drive journey - nobody
   *  drives 550m - so Transfer Mode alone no longer says which verb
   *  belongs over these minutes. Recorded here rather than re-derived on
   *  the site, so the rule has one implementation. Blank on a row not
   *  recomputed since 17 Aug 2026; readers fall back to Transfer Mode. */
  "Leg From Base Walked"?: boolean;
  "Leg To Base Walked"?: boolean;
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
