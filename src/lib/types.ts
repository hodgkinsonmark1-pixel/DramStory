// Core domain types for DramStory.
// Data sources per the locked architecture:
//   Distilleries / Local Events / Natural Features / Local Features -> Airtable
//   Pubs / Cafes / Restaurants                                      -> Google Places
//   Accommodation                                                    -> Booking.com (fallback: Google Places "lodging")

export type DataSource = "airtable" | "google" | "booking" | "mock";

export interface Tour {
  name: string;
  duration: string;
  price: number;
  description: string;
}

export interface NearbyFeature {
  name: string;
  type: string;
  icon: string;
  distance: string;
  category: "viewpoint" | "attraction" | "beach" | "accommodation" | "food" | "walk";
}

/** A Natural Feature plotted directly on the workspace map (Beach, Walk,
 *  Bike Route, or Local Gem) - distinct from NearbyFeature above, which is
 *  the per-distillery "Nearby" list on each distillery's own page. This is
 *  the island-wide set used to populate map pins when that filter category
 *  is toggled on. */
export interface LocalFeature {
  id: string;
  slug: string;
  name: string;
  category: "beach" | "walk" | "bike-route" | "local-gem" | "historic-site" | "attraction-gem" | "pub" | "cafe" | "restaurant" | "golf" | "spa" | "transport";
  icon: string;
  description: string;
  lat: number;
  lng: number;
  parking: string;
  accessibility: string;
  openingHours: string;
  /** Postcode for satnav/directions - currently populated for transport
   *  listings (ferry terminals, the airport) where visitors are actually
   *  driving to a specific building, not general Local Feature content. */
  postcode?: string;
  /** "Best features" - one per line in Airtable, split into an array. */
  highlights: string[];
  /** Walks/bike routes only - undefined for beaches and local gems. */
  length?: string;
  duration?: string;
  difficulty?: string;
  /** Direct link to the venue's own site - food/drink venues only. */
  websiteUrl?: string;
  /** Official UK Food Hygiene Information Scheme (FHIS) status, sourced
   *  from ratings.food.gov.uk (a free government API) - NOT a customer
   *  review or star rating, purely the statutory hygiene inspection
   *  result. Food/drink venues only. */
  hygieneRating?: string;
  // ─── Natural Features content model (Beach/Walk/Bike Route/Local Gem) ───
  /** Punchy 1-2 sentence hook shown as a callout under the hero. */
  whyVisit?: string;
  /** One tight sentence written specifically for the map pin popup - NOT
   *  a trimmed whyVisit. whyVisit has grown into full-paragraph blockquote
   *  copy for the page itself, so it's no longer reliably popup-length.
   *  See MapCanvas.tsx's buildFeatureMarker for the truncated-fallback
   *  chain used when this is blank (mirrors the Tours "Short Summary"
   *  precedent in docs/deferred-features.md). */
  pinSummary?: string;
  /** Past-tense narrative - founding/notable events. Below the line. */
  history?: string;
  /** Shown as its own amber callout box, same treatment as the
   *  Distillery Status Notice - genuine hazards, tide risk, etc. */
  safetyNotes?: string;
  /** Direct link to live tide times - shown inside the safety callout. */
  tideTimesUrl?: string;
  /** Activity tags, e.g. Walking, Photography, Swimming - must stay
   *  consistent with safetyNotes (never Swimming where that warns
   *  against it). */
  greatFor?: string[];
  bestTimeToVisit?: string;
  nearestFacilities?: string;
  whatToBring?: string;
  mobileSignalNote?: string;
  /** Written-sentence version of the distillery cross-link. */
  pairsWellWith?: string;
  wildlifeHighlights?: string;
  /** Single main banner image - distinct from the gallery strip below it. */
  heroImageUrl?: string;
  /** Vertical crop anchor for the hero, 0-100 (0=top, 100=bottom).
   *  Defaults to 30 (biased toward the top third) when unset - most
   *  landscape photos have the interesting part (sky, headland) above
   *  center, but not all, hence the per-record override. */
  heroFocalY?: number;
  /** Full-size photo URLs for the gallery lightbox. */
  gallery?: string[];
  /** Photo credit for heroImageUrl - shown as a small corner tag. Plain
   *  text, or a "[label](url)" markdown-style link to the source/license
   *  page. Undefined/blank means no credit is required (own photography,
   *  CC0/public domain) - required whenever the photo is CC BY or CC
   *  BY-SA licensed (e.g. sourced from Wikimedia Commons). */
  heroImageCredit?: string;
  /** Photo credits for `gallery`, index-aligned (galleryCredits[i] is the
   *  credit for gallery[i]) - an empty string at an index means that
   *  photo needs no credit. Shown in the lightbox for whichever photo is
   *  currently enlarged. Same plain-text-or-markdown-link format as
   *  heroImageCredit. */
  galleryCredits?: string[];
}

/** A Featured Stay - a curated hotel/accommodation partner shown on its own
 *  detail page (and, eventually, the workspace map's Accommodation layer -
 *  see journey-options.ts's "places-to-stay" category and the Map pin
 *  behaviour note in docs/deferred-features.md; pins are deliberately not
 *  wired yet, this is the content layer only). Schema deliberately modelled
 *  on LocalFeature above - Hero Image + Credit, Gallery + Credits, a
 *  Why Visit-equivalent ("Why Stay"), Pin Summary - so it inherits the same
 *  conventions rather than inventing new ones. Two fields that exist in the
 *  Airtable table (`Meals Included`, `Accessibility`) are deliberately NOT
 *  represented here - dropped from scope (on-site dining is covered by the
 *  "On-site Restaurant" Facilities tag instead; accessibility specifics are
 *  left to the hotel's own site) - see AirtableFeaturedStayFields for the
 *  same omission on the raw-fields side. */
export interface FeaturedStay {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** e.g. "Boutique country house hotel", "Traditional coaching inn". */
  style?: string;
  /** Short, punchy 1-2 sentence hook shown as a callout under the hero -
   *  same pattern as Distillery/LocalFeature's Why Visit. */
  whyStay?: string;
  /** Main editorial copy - what to expect. */
  description: string;
  /** Only present where there's a genuine, verifiable story - not forced. */
  history?: string;
  /** Single main banner image - distinct from the gallery strip below it. */
  heroImageUrl?: string;
  /** Photo credit for heroImageUrl - same "[label](url)" markdown-style
   *  convention as LocalFeature's heroImageCredit. */
  heroImageCredit?: string;
  /** Full-size photo URLs for the gallery lightbox. */
  gallery?: string[];
  /** Photo credits for `gallery`, index-aligned - same convention as
   *  LocalFeature's galleryCredits. */
  galleryCredits?: string[];
  /** Formatted e.g. "£450" - empty string if unset. */
  priceFrom?: string;
  /** e.g. Spa, On-site Restaurant, Bar, Parking, Pet Friendly, Family
   *  Rooms, Wi-Fi, Sea View. */
  facilities: string[];
  /** e.g. "Sea view, on the dunes above a seven-mile beach". */
  setting?: string;
  /** Split into three separate fields (rather than one combined
   *  "ferry/airport" field) so each can render as its own Visit Info tile
   *  and link through to its own /explore page - a single free-text field
   *  read awkwardly once Port Ellen's closure caveat was added alongside
   *  Port Askaig and the airport. */
  distanceFromAirport?: string;
  distanceFromPortAskaigFerry?: string;
  distanceFromPortEllenFerry?: string;
  /** Genuine whisky-relevant hook for a whisky-trip site - an on-site bar
   *  with a notable collection, tasting evenings, etc. */
  whiskyBarNote?: string;
  mobileSignalNote?: string;
  parking?: string;
  /** Plain text for now, e.g. "Port Ellen" - becomes a real linked field
   *  once an Areas table exists (see docs/deferred-features.md). */
  nearestArea?: string;
  bookingUrl?: string;
  /** The hotel's own official website - shown only when it differs from
   *  Booking URL, same deliberate external-link exception as Distillery/
   *  LocalFeature's websiteUrl. */
  websiteUrl?: string;
  /** Deliberate link-out only ("See reviews on TripAdvisor ->") - NOT a
   *  scraped rating/score, per the site's sourcing rule (no third-party
   *  aggregator content rendered as if it were DramStory's own). */
  tripAdvisorUrl?: string;
  /** One tight sentence written specifically for the map pin popup. */
  pinSummary?: string;
  /** Nearby/complementary Distilleries this hotel pairs well with -
   *  rendered on the hotel page as "Works Great With". Resolved to full
   *  Distillery records (not just slugs) so the section can show more than
   *  a bare name - deliberately actually rendered, unlike the past mistake
   *  where LocalFeature's own "Distilleries" linked field was mapped into
   *  the raw Airtable type but never mapped onto the object or rendered
   *  anywhere (see mapToLocalFeature). */
  worksGreatWithDistilleries: Distillery[];
  /** Nearby/complementary Local Features this hotel pairs well with - same
   *  "Works Great With" section, same rendering guarantee as above. */
  worksGreatWithLocalFeatures: LocalFeature[];
  /** Short historical pull-quote for the hotel page's "A Night in [Year]"
   *  sidebar box - a curated highlight of the full `history` field, not a
   *  replacement for it. All three must be present together to render
   *  (partial data - e.g. a quote with no year - would look broken), so
   *  callers should check historyHighlightYear before rendering the box.
   *  Added 05 Aug 2026 for the hotel-template rebuild. */
  historyHighlightYear?: string;
  historyHighlightQuote?: string;
  historyHighlightSource?: string;
  /** At a Glance sidebar rows for the simplified two-column hotel
   *  template (06 Aug 2026) - short single-line facts. Any blank field
   *  just omits its row. */
  rooms?: string;
  roomTypes?: string;
  dogs?: string;
  /** Award/accolade line shown in the Eating & Drinking section, e.g.
   *  "Hotels of the Year Scotland 2023 Summer Star Award". */
  recognition?: string;
  /** Eating & Drinking section body - split out of Description (06 Aug
   *  2026) so the two sections can render under their own headings. */
  eatingDrinking?: string;
  /** Focus box (06 Aug 2026) - a second, generalised variant of the dark
   *  "A Night in [Year]" band for hotels without a genuine dated history
   *  anecdote. Eyebrow + text (+ optional source) rather than a big year
   *  numeral - see historyHighlightYear's doc comment above for the
   *  original variant, which still takes priority when both are set.
   *  All three fields deliberately not forced - many hotels will have
   *  neither this nor a history highlight. */
  focusEyebrow?: string;
  focusText?: string;
  focusSource?: string;
  /** One caption per `gallery` photo, index-aligned - same convention as
   *  galleryCredits, but distinct from it: this is a short caption (e.g.
   *  "a bedroom - the shot that sells the stay"), galleryCredits is photo
   *  attribution. Undefined (not an array of empty strings) when the
   *  field is blank in Airtable. Added 05 Aug 2026. */
  galleryCaptions?: string[];
  /** Curated Pre-Designed Days shown as "Plan your days from here" cards -
   *  resolved to full HubDay records via the Days table's new "Plan Your
   *  Days" link field on Featured Stays (added 05 Aug 2026), same
   *  "resolve to real records, not just IDs" pattern as
   *  worksGreatWithDistilleries above. Empty array if none picked yet. */
  planYourDays: HubDay[];
  /** Nearest four distilleries by one-way drive time from this hotel, for
   *  the "Distilleries from your door" section. Drive time isn't a fact
   *  about the Stay or the Distillery alone, so it's sourced from the
   *  separate "Stay Distillery Distances" junction table (added 05 Aug
   *  2026) rather than computed from coordinates - Mark wanted real
   *  driving time, entered manually per hotel-distillery pair, not
   *  straight-line distance. Filled in as a post-processing step in
   *  fetchFeaturedStaysFromAirtable (mapToFeaturedStay alone can't see a
   *  separate table). Empty array if no distances have been entered yet
   *  for this hotel - the section shows a "coming soon" state rather than
   *  nothing, same pattern as an empty Gallery. */
  nearestDistilleries: { distillery: Distillery; driveTimeMinutes: number }[];
  source: DataSource;
}

export interface JournalPost {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  heroImage: string;
  /** Raw attachment URLs in upload order - the Markdown body references
   *  these via (inline:1), (inline:2) etc. placeholders, swapped for the
   *  real URL at render time. */
  inlineImages: string[];
  /** Markdown - rendered to HTML by the journal detail page. */
  body: string;
  publishedDate: string;
  category?: string;
}

/** A village/region guide page (Areas table) - helps a visitor decide
 *  whether to base themselves in, or just visit, a given area. Same
 *  golden-source-in-Airtable pattern as Distillery/LocalFeature/
 *  FeaturedStay. Added 06 Aug 2026 for the Port Ellen area page. */
export interface Area {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  population?: number;
  /** Where the Population figure came from, e.g. "NRS via Argyll and
   *  Bute Council" - shown as a small citation, not just asserted. */
  populationSource?: string;
  /** Short, punchy 1-2 sentence hook - same pattern as Distillery/
   *  FeaturedStay's Why Visit/Why Stay. */
  whyHook?: string;
  /** Atmosphere/character - meant to read emotionally, not as a bare
   *  fact listing, while every claim in it still traces to a source. */
  whatToExpect: string;
  /** Genuine limitations - not padded out for balance. */
  whatNotToExpect?: string;
  shopsAmenities?: string;
  bestFor?: string;
  notFor?: string;
  gettingHere?: string;
  /** Maps to the Distilleries table's own curated Region field (e.g.
   *  "South Islay") so nearby distilleries can be grouped correctly -
   *  Islay's geography makes straight-line distance misleading for
   *  "nearby" claims here. */
  distilleryRegion?: string;
  inVillageFoodDrink?: string;
  /** Only set where genuinely sourced - never invented for symmetry
   *  with areas that do have a real hazard. */
  hazardCallout?: string;
  heroImageUrl?: string;
  /** Same [label](url) markdown-link convention as Local Features/
   *  Featured Stays' heroImageCredit. */
  heroImageCredit?: string;
  /** Curated by verifying coordinates against this Area's own lat/lng,
   *  not the LocalFeature "Distance" free-text field (not reliably
   *  anchored to a specific village - see content-sourcing-standards.md). */
  /** Real Distillery records whose own Region field matches this area's
   *  distilleryRegion - filled in as a post-processing step in
   *  fetchAreasFromAirtable (mapToArea alone can't see the full
   *  Distilleries list at map time), same "resolve to real records"
   *  pattern as FeaturedStay.nearestDistilleries. */
  distilleries: Distillery[];
  nearbyLocalFeatures: LocalFeature[];
  /** The Featured Stay(s) tied to this area, if any. */
  featuredStays: FeaturedStay[];
  /** "If this isn't quite right" pointer to alternate areas - resolved to
   *  name/slug only (not a full Area, to avoid a circular fetch). */
  alternateAreas: { name: string; slug: string }[];
  /** Time-bound notice that changes the trip (e.g. a ferry closure) - most
   *  areas won't have one, render conditionally. Added 06 Aug 2026 for the
   *  redesigned area-page template. */
  advisoryNotice?: string;
  /** "IN THE VILLAGE" sidebar rows, parsed from the Airtable "Label: Value"
   *  per-line convention (see parseLabelValueLines). */
  inTheVillage: { key: string; value: string }[];
  /** Closing line under the In The Village rows naming what's genuinely
   *  missing locally (pharmacy/dentist/bank etc). */
  inTheVillageMissing?: string;
  /** The one curated Day (from the Days table) featured in "Base here and
   *  day one plans itself" - a real HubDay record, not invented content. */
  dayPlan?: HubDay;
  /** Booking-handoff advice rows ("Book by", "Also try", "Cheaper"), same
   *  "Label: Value" per-line convention as inTheVillage. Genuinely new
   *  editorial content - expected blank until drafted/reviewed, in which
   *  case the section shows a pending state rather than invented advice. */
  bookingAdvice: { key: string; value: string }[];
  /** Glance-bar "Places to stay" qualitative fact - covers ALL village
   *  accommodation, not just featuredStays, so it can't be derived from
   *  data already on this record. Blank until sourced/decided. */
  glancePlacesToStay?: string;
  source: DataSource;
}

/** A Pre-Designed Days Hub entry - a ready-made day itinerary built from
 *  the Airtable Days + Day Stops tables. Named "HubDay" (not "Day") to
 *  avoid colliding with the unrelated ItineraryDay used by the trip
 *  planner further down this file. */
export interface HubDay {
  id: string;
  slug: string;
  name: string;
  type: "Solo" | "Multi";
  distilleries: string[];
  narrative: string;
  pacing: "Relaxed" | "Moderate" | "Packed" | string;
  durationPortEllen: string;
  durationBowmore: string;
  /** Indicative distillery cost - sum of the Day's stop tours' prices,
   *  formatted e.g. "£60pp". Empty string if no priced tours resolved. */
  cost: string;
  mapDistilleries?: { name: string; slug: string; lat: number; lng: number }[];
  mapFeatures?: { name: string; slug: string; lat: number; lng: number; icon: string }[];
  /** Resolved stops in visiting order - the real Distillery record plus
   *  whichever Tour this Day's Day Stop links (if any). This is what
   *  "+ Add this day to my trip" writes into TripContext via
   *  addDay/addStop/setTourForStop, so it needs the real objects those
   *  functions expect, not just names.
   *
   *  `anchor` - true when this stop is the reason the Day exists (e.g.
   *  Ardbeg on "Ardbeg, on Foot") and shouldn't be droppable/swappable in
   *  the day screen's editing UI - sourced from Day Stops' own "Anchor"
   *  checkbox (added 9 Aug 2026, docs/days-trip-flow-handoff.md §2.2),
   *  read straight through, not recomputed here. */
  stops: { distillery: Distillery; tour?: Tour; anchor: boolean }[];
  /** The real Local Feature records behind mapFeatures above (walks,
   *  viewpoints, pubs the narrative links to) - same "+ Add this day"
   *  flow also adds these via addFeatureStop, so a Day's trip stops match
   *  what its own narrative actually describes, not just the
   *  distillery/tour part of it. */
  featureStops: LocalFeature[];
  source: DataSource;
}

export interface Distillery {
  id: string;
  slug: string;
  name: string;
  region: string;
  style: "Heavily Peated" | "Medium Peated" | "Light" | string;
  lat: number;
  lng: number;
  founded: number;
  tagline: string;
  description: string;
  image: string;
  tours: Tour[];
  hours: string;
  priceFrom: string;
  avgVisit: string;
  parking: string;
  accessibility: string;
  motorhomeFriendly: boolean;
  giftShop: boolean;
  restaurantName: string | null;
  facilities: string[];
  nearby: NearbyFeature[];
  nextStops: string[];
  bookingUrl?: string;
  /** The distillery's own official website - the one deliberate exception
   *  to the internal-links-only rule, shown at the bottom of Visit Info. */
  websiteUrl?: string;
  /** Operational callout - production pause, closure, seasonal notice.
   *  Undefined/empty when there's nothing to flag. */
  statusNotice?: string;
  /** Short, punchy hook - the single best reason to visit. Shown as a
   *  standout callout right under the hero. */
  whyVisit?: string;
  /** Photo gallery beyond the single Hero Image. */
  gallery?: string[];
  /** Short scannable "did you know" bullets - markdown list, colour/
   *  atmosphere rigour rather than hard-fact rigour. */
  funFacts?: string;
  /** "Below the line" deep-read content - founding story, ownership,
   *  notable moments. */
  history?: string;
  /** House style, core expressions, tasting notes. */
  whiskyProfile?: string;
  /** Weekly closure pattern - which weekdays (0 = Sunday .. 6 = Saturday)
   *  this distillery is closed, sourced from Airtable's "Closed Days"
   *  field (added 9 Aug 2026, docs/days-trip-flow-handoff.md §2.2/§4.4).
   *  An EMPTY array deliberately means "open every day", not "unknown" -
   *  every distillery without a genuine weekly closure has this field
   *  left blank in Airtable on purpose. Port Ellen is the one exception:
   *  its closedDays is also empty, but because it has no fixed weekly
   *  pattern at all (monthly appointment-only open days) - callers that
   *  render open/closed status should check its `hours` text (or the
   *  isAppointmentOnly helper in day-derivations.ts) rather than reading
   *  an empty closedDays as "open every day" for Port Ellen specifically. */
  closedDays: number[];
  source: DataSource;
}

export interface LocalEvent {
  id: string;
  name: string;
  date: string;
  /** For multi-day events - undefined means single-day. */
  endDate?: string;
  time?: string;
  location: string;
  description: string;
  link?: string;
  category: "Distillery Event" | "Festival" | "Seasonal Release" | "Other";
  price?: string;
  /** The listing site this was sourced from - shown nowhere on-site yet,
   *  kept for the same audit-trail transparency as Local Features'
   *  Location Source field. */
  sourceUrl?: string;
  /** Distilleries hosting/associated with this event, if any - drives the
   *  pulsing map highlight. Empty for island-wide events with no single
   *  venue (e.g. the Book Festival). */
  distillerySlugs: string[];
  source: DataSource;
}

/** A generic point-of-interest layer item (Pubs / Cafes / Restaurants via Google, or the
 *  Booking.com-fallback Accommodation layer). Deliberately provider-agnostic so swapping
 *  the underlying source is a config change, not a component rewrite. */
export interface PlaceListing {
  id: string;
  name: string;
  category: "pub" | "cafe" | "restaurant" | "accommodation" | "golf" | "spa";
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  address?: string;
  photoUrl?: string;
  /** Present only for real Booking.com results — absent when falling back to Google */
  pricePerNight?: number;
  affiliateUrl?: string;
  websiteUrl?: string;
  /** Google's own listing link - the required/permitted way to send users
   *  to view this place, since Places content can't be shown on/near a
   *  non-Google map (see components rendering PlaceListing as a list). */
  googleMapsUrl?: string;
  source: DataSource;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string;
  source: DataSource;
}

// ─────────────────────────────────────────────────────────────────────────
// JOURNEY PLANNER INTAKE — Q1 (When) is answered on the homepage Hero and
// passed through as ?mode=. Q2 (Where) and Q3 (What matters) are answered
// on /journey before the workspace (map + itinerary) loads. There is no
// longer a "how long" question - trip length is no longer asked upfront;
// it becomes evident once the visitor sets specific dates (the itinerary
// day count then follows the date range) or simply builds their own
// itinerary by adding/removing days freely.
// ─────────────────────────────────────────────────────────────────────────

/** Q1 — answered on the homepage Hero, passed through as the `mode` query
 *  param. Three options: a firm "here today" visit, a "planning" trip with
 *  real (if not yet fixed) intent, or pure "dreaming" with no concrete
 *  plan yet. The header date control's own month-vs-specific-date choice
 *  is independent of this - a "planning" visitor can still pick just a
 *  month, and a "dreaming" one can still pick exact dates. */
export type TripTiming = "today" | "planning" | "dreaming";

/** Whether the header date control is set to a single specific range or a
 *  looser month. Shared by Local Events filtering, the weather popup, and
 *  (once live) accommodation - see TripDates. */
export type TripDateMode = "range" | "month";

/** Global "when are you visiting" state, set once via the workspace
 *  header and read everywhere it's needed - Local Events filtering, the
 *  weather/daylight popup, calendar-date itinerary labels, and (once
 *  live) accommodation availability. Lives in TripContext (persisted),
 *  not local component state, so it survives navigating away and back
 *  and isn't tied to any one subtab being open. */
export interface TripDates {
  mode: TripDateMode;
  /** ISO date, used when mode === "range". */
  startDate: string;
  /** ISO date, used when mode === "range". */
  endDate: string;
  /** "YYYY-MM", used when mode === "month". */
  month: string;
  /** True once the visitor has actively picked a date/month - false for
   *  the untouched default, so nothing date-dependent (weather popup,
   *  calendar-date day labels) shows before it's actually relevant. */
  confirmed: boolean;
}

export type RegionId = "islay" | "speyside" | "highland" | "campbeltown" | "lowland";

/** Q2 — "Where does your story take you?" Three distinct shapes depending on
 *  which of the 7 options the visitor picks. Only "islay" has live Airtable
 *  data today; every other region still routes to the workspace, just with
 *  no populated overlay yet. */
export type LocationAnswer =
  | { kind: "region"; region: RegionId }
  | { kind: "airport"; airportName: string }
  | { kind: "distillery"; distillerySlug: string };

/** Q3 — "What matters most to your trip?" Multi-select; Distilleries is
 *  always-on (it's the core of the site), the other 5 are toggleable and
 *  double as the map's top-bar layer filters later in the workspace. */
export type InterestCategoryId =
  | "distilleries"
  | "natural-features"
  | "local-attractions"
  | "local-events"
  | "places-to-eat"
  | "places-to-stay";

export interface TripIntake {
  timing: TripTiming;
  location: LocationAnswer;
  interests: InterestCategoryId[];
}

// ─────────────────────────────────────────────────────────────────────────
// ITINERARY — day-based model for the workspace panel. Day count starts at
// a flat default (see DEFAULT_STARTING_DAYS in Workspace.tsx) and follows
// a specific date range automatically once one is set in the header
// (Workspace's date-range sync effect); the visitor can also add/remove
// days freely at any time regardless.
//
// When the location answer is "airport", Day 1 shows an arrival banner and
// the LAST day shows a departure banner at that airport. These aren't
// stored stops — they're derived from `days.length` + the location answer
// wherever they're rendered, so adding/removing a day "automatically
// updates" the itinerary for free instead of needing to re-sync stored
// data every time the day count changes.
// ─────────────────────────────────────────────────────────────────────────

export type ItineraryStop = (
  | { kind: "distillery"; distillery: Distillery; tour?: Tour }
  | { kind: "feature"; feature: LocalFeature }
) & {
  /** Visitor-adjusted visit duration (minutes), overriding the default
   *  estimate (a distillery's avgVisit, or the flat feature estimate) -
   *  set via the +/- toggle next to the "~X visit" line. Undefined means
   *  "use the default estimate". */
  customMinutes?: number;
  /** A free-text reminder for this stop (e.g. "tour at 12", "should be
   *  there for 2") - shown and editable even when the stop is collapsed,
   *  since it's exactly the kind of detail someone wants at a glance
   *  while scanning a busy day. Per 19 July 2026 conversation. */
  note?: string;
  /** True when this stop is the reason the day exists (Days/Trip flow
   *  Phase 4, docs/days-trip-flow-handoff.md §2.2/§3.4) - carried over
   *  from HubDay.stops' own `anchor` when a day is added via "+ Add this
   *  day to my trip" (see DaysHubGrid.tsx / trip-context.tsx's addStop).
   *  Undefined/false for everything else, including every stop added
   *  freehand in the planner - an anchor is never droppable or swappable
   *  in the day screen's editing UI. */
  anchor?: boolean;
};

/** Where a day's trip starts/ends - a real, verifiable place (a village,
 *  or wherever the visitor tells us they're staying), NOT a specific
 *  booked property. There's no accommodation affiliate/booking integration
 *  yet, so this deliberately stops short of claiming any bookable
 *  inventory - it exists purely so each day's route and drive-time totals
 *  have a real start/end point instead of just floating between stops. */
export interface TripAccommodation {
  name: string;
  lat: number;
  lng: number;
}

/** Where the map is currently panned/zoomed to - persisted so leaving to
 *  view a distillery and coming back doesn't reset the view to the
 *  default island-wide center every time. */
export interface TripMapView {
  lat: number;
  lng: number;
  zoom: number;
}

export interface ItineraryDay {
  id: string;
  label: string;
  stops: ItineraryStop[];
  accommodation?: TripAccommodation;
  /** Set when this day was created via the Days Hub's "+ Add this day to
   *  my trip" (see DaysHubGrid.tsx) - the slug of the HubDay it came from.
   *  Lets that button show a persistent "already added" state driven by
   *  real trip data instead of a timed flash, and it naturally clears if
   *  the visitor removes the day (removeDay just drops it from the array).
   *  Editing the day's stops afterwards does NOT clear it - "already
   *  added" tracks "this Hub Day still has a day here", not "still
   *  exactly matches what was originally added". */
  sourceHubDaySlug?: string;
}
