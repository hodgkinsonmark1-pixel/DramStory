import { cache } from "react";
import type { Area, Distillery, FeaturedStay, HubDay, JournalPost, Journey, LocalEvent, CostLine, LocalFeature, MonthBand, PlaceListing, Practicality, Season, Tour } from "@/lib/types";
import { airtableFetchAll } from "@/lib/airtable";
import { searchAccommodation, searchNearbyByCategory } from "@/lib/google-places";
import { isPublishableTour, formatPrice } from "@/lib/pricing";
import {
  deriveNextStops,
  mapAirtableDayRecord,
  mapClosedDays,
  mapLocalFeature,
  mapTour,
  mapToArea,
  mapToFeaturedStay,
  mapToJournalPost,
  mapToLocalEvent,
  mapToLocalFeature,
  parseLabelValueLines,
  parseMakeItYours,
  type AirtableAreaFields,
  type AirtableDayFields,
  type AirtableDayStopFields,
  type AirtableDistilleryFields,
  type AirtableEventFields,
  type AirtableFeaturedStayFields,
  type AirtableJournalFields,
  type AirtableJourneyDayFields,
  type AirtableJourneyFields,
  type AirtableLocalFeatureFields,
  type AirtableStayDistilleryDistanceFields,
  type AirtableTourFields,
} from "./airtable-mappers";

// ─────────────────────────────────────────────────────────────────────────
// DATA LAYER — every page/component reads through these functions, never
// the raw mock arrays or a future SDK client directly. That's what makes
// swapping a source (mock -> Airtable, mock -> Google Places, mock ->
// Booking.com) a change in ONE file, not a rebuild of the UI.
//
// Locked architecture (confirmed with Mark):
//   Distilleries, Local Events, Natural Features, Local Features -> Airtable
//   Pubs, Cafes, Restaurants                                     -> Google Places
//   Accommodation                                                 -> Booking.com
//                                                                    (fallback: Google Places "lodging")
// ─────────────────────────────────────────────────────────────────────────

// UPDATE 21 July 2026 - this used to be a hand-rolled module-level `let
// distilleriesCache: Promise<...> | null` memo. That's WRONG in a
// serverless environment: a warm Vercel function instance can survive
// across many separate incoming requests, and a plain module-level
// variable survives with it - so the very first successful fetch on a
// given warm instance silently became "the" answer for every later
// request that instance ever served, however stale, regardless of any
// per-fetch cache option. This was a real, live contributor to the
// Port Ellen/Isle of Jura undercount investigated the same day (see
// technical-notes.md). React's cache() is the correct tool here: it
// memoizes/dedupes within a single request's render pass only, and
// never persists across separate requests, so it can't reintroduce
// this exact staleness.
export const getDistilleries = cache(async (): Promise<Distillery[]> => {
  return fetchDistilleriesFromAirtable();
});

/** Published distilleries a visitor can ACTUALLY TURN UP TO - the eleven
 *  with a visitor centre, not the thirteen records.
 *
 *  Two different questions get asked of this table and they now have two
 *  different answers:
 *
 *    getDistilleries()          - "what exists on Islay". The right answer
 *                                 for the /distilleries index and for a
 *                                 distillery's own page, which is exactly
 *                                 where a producing-but-closed distillery
 *                                 SHOULD be listed. Being listed is the
 *                                 point: a guide to Islay that quietly
 *                                 shows ten of twelve is out of date.
 *
 *    getVisitableDistilleries() - "where can I go". The right answer
 *                                 everywhere a visit is implied: map pins
 *                                 offering tours, the planner's picker,
 *                                 suggested next stops, Add-to-Journey,
 *                                 the homepage cards, Day/Journey stop
 *                                 resolution, Area pages' local
 *                                 distilleries, "distilleries from your
 *                                 door" on a stay, and every count worded
 *                                 as "distilleries you can visit".
 *
 *  It reads through getDistilleries() rather than re-querying, so the
 *  Published gate is still enforced in exactly one place and these two
 *  can never disagree about which records exist. cache() for the same
 *  reason as getDistilleries - see its comment above.
 *
 *  If you are adding a new surface, the question to ask is not "does this
 *  page look like a distillery list" but "would a reader take this as an
 *  invitation to drive there". If yes, call this one. */
export const getVisitableDistilleries = cache(async (): Promise<Distillery[]> => {
  const all = await getDistilleries();
  return all.filter((d) => d.openToVisitors);
});

async function fetchDistilleriesFromAirtable(): Promise<Distillery[]> {
  const [distilleryRecords, tourRecords, featureRecords] = await Promise.all([
    airtableFetchAll<AirtableDistilleryFields>("Distilleries"),
    airtableFetchAll<AirtableTourFields>("Tours"),
    airtableFetchAll<AirtableLocalFeatureFields>("Local Features"),
  ]);

  const tourById = new Map(tourRecords.map((r) => [r.id, r.fields]));
  const featureById = new Map(featureRecords.map((r) => [r.id, r.fields]));

  const distilleries: Distillery[] = distilleryRecords
    // Airtable has a few blank placeholder rows (no Name/Slug) mixed into
    // the table — skip anything that isn't a real, populated record.
    .filter((r) => r.fields.Name && r.fields.Slug)
    // PUBLISHED GATE (29 Aug 2026). Only ticked records render anywhere.
    // Laggan Bay and Portintruan are real, producing distilleries that
    // take no visitors; their Airtable records are complete, but the
    // distillery page template still assumes a visitable distillery (a
    // "Book a Tour" button over an empty tours section, "+ Add to
    // Journey", an empty Visit panel, "Est. 0"), so they are held back
    // until the not-yet-open variant of that template exists.
    //
    // This one filter is the whole EXISTENCE gate, by design: every page,
    // map, picker and "suggested next stops" list reads distilleries
    // through getDistilleries() (getDistilleryBySlug and every Day/
    // Journey/Area/Featured Stay join resolve against this same array, as
    // does getVisitableDistilleries below), so nothing downstream needs
    // its own copy of the rule and none can drift from it. An unpublished
    // slug therefore 404s on /distilleries/[slug] rather than rendering a
    // broken page.
    //
    // It is NOT the visitability gate. "Does this record exist" and "can
    // a reader go there" are two questions with two answers - see
    // getVisitableDistilleries() immediately below, which is what every
    // surface that implies a visit reads instead. Publishing Laggan Bay
    // and Portintruan is meant to list them, not to offer them.
    //
    // Explicitly `=== true`, not truthiness: Airtable omits an unchecked
    // checkbox from the payload entirely, so missing means unpublished.
    //
    // Deliberately NOT gated on `Status` - see AirtableDistilleryFields'
    // Published doc comment for why that field would hide most of the
    // site. Also deliberately not softened to "show drafts on preview"
    // the way mapToArea/mapToFeaturedStay do for Status: these two are
    // withheld because the template renders them WRONG, not because the
    // copy is unfinished, so there is nothing useful to preview yet.
    .filter((r) => r.fields.Published === true)
    .map((r) => {
      const f = r.fields;
      return {
        id: r.id,
        slug: f.Slug!,
        name: f.Name!,
        region: f.Region ?? "",
        style: f.Style ?? "",
        lat: f.Latitude ?? 0,
        lng: f.Longitude ?? 0,
        founded: f.Founded ?? 0,
        tagline: f.Tagline ?? "",
        description: f.Description ?? "",
        // Routed through /api/attachment - Airtable's own attachment URLs
        // expire after a few hours. Safe on Team plan quota - see
        // /api/attachment/route.ts before reintroducing on Free.
        image: f["Hero Image"]?.[0] ? `/api/attachment?t=tblSPRTIf1sFK3UDL&r=${r.id}&f=fldbYJ8xNSPCLwG0h&i=0` : "",
        heroImageCredit: f["Hero Image Credit"] || undefined,
        tours: (f.Tours ?? [])
          .map((id) => tourById.get(id))
          .filter((t): t is AirtableTourFields => !!t)
          .map(mapTour),
        hours: f.Hours ?? "",
        // COMPUTED from this distillery's own Tours, not read from the
        // Distilleries table's `Price From` column (30 Aug 2026).
        //
        // That column disagreed with Tours on every single distillery -
        // £10 for Lagavulin, Bowmore, Bruichladdich, Bunnahabhain, Caol
        // Ila, Kilchoman and Ardnahoe, and £15 for Laphroaig and Ardbeg,
        // against cheapest real tours of £20, £25, £25, £20, £21, £18,
        // £15, £22 and £22.50. Seven identical figures across seven very
        // different distilleries is a seeded default, and unlike Tours
        // the column carried no source and no verified date.
        //
        // /distilleries renders this as "Tours from £N" and sorts by it,
        // so it is the same measure the homepage computes - which is
        // exactly why the two pages must not derive it differently. Same
        // publishable-tour rule as everywhere else: placeholders and
        // unpriced rows are excluded, so Port Ellen's free Open Days
        // cannot make it read "Tours from £0", and a distillery with
        // nothing bookable returns "" and prints no label at all.
        priceFrom: cheapestPublishableTourPrice(
          (f.Tours ?? [])
            .map((id) => tourById.get(id))
            .filter((t): t is AirtableTourFields => !!t)
            .map(mapTour)
        ),
        avgVisit: f["Avg Visit"] ?? "",
        parking: f.Parking ?? "",
        accessibility: f.Accessibility ?? "",
        motorhomeFriendly: f["Motorhome Friendly"] ?? false,
        giftShop: f["Gift Shop"] ?? false,
        restaurantName: f["Restaurant Name"] ?? null,
        facilities: f.Facilities ?? [],
        nearby: (f["Local Features"] ?? [])
          .map((id) => featureById.get(id))
          .filter((n): n is AirtableLocalFeatureFields => !!n)
          .map(mapLocalFeature),
        nextStops: [] as string[], // filled in below, once every distillery is mapped
        bookingUrl: f["Booking URL"],
        statusNotice: f["Status Notice"] || undefined,
        whyVisit: f["Why Visit"] || undefined,
        websiteUrl: f["Website URL"] || undefined,
        gallery: (f.Gallery ?? []).map(
          (_, i) => `/api/attachment?t=tblSPRTIf1sFK3UDL&r=${r.id}&f=fldXfwuMOV8A76nIt&i=${i}`
        ),
        funFacts: f["Fun Facts"] || undefined,
        history: f.History || undefined,
        whiskyProfile: f["Whisky Profile"] || undefined,
        closedDays: mapClosedDays(f["Closed Days"]),
        // Explicitly `=== true`, same reasoning as the Published gate
        // above: Airtable omits an unchecked checkbox from the payload
        // entirely, so a missing value has to mean "not open", never
        // "unknown, assume yes".
        openToVisitors: f["Open To Visitors"] === true,
        homepageBadge: f["Homepage Badge"] || undefined,
        wallStatus: f["Wall Status"] || undefined,
        wallNote: f["Wall Note"] || undefined,
        source: "airtable" as const,
      };
    });

  // Next Stops has no Airtable field yet, so derive a default from
  // geographic proximity now that we have the full list to compare
  // against. CANDIDATES are the visitable ones only: "suggested next
  // stops" is an invitation to drive somewhere, and a distillery with no
  // visitor centre is not somewhere you can go. Every distillery still
  // GETS suggestions, including the two that take no visitors - "here is
  // what you can actually visit near this one" is useful on their pages
  // too. Filtered inline rather than via getVisitableDistilleries() only
  // because that helper reads through this very function.
  const visitableCandidates = distilleries.filter((d) => d.openToVisitors);
  for (const d of distilleries) {
    d.nextStops = deriveNextStops(d, visitableCandidates);
  }

  return distilleries;
}

/** Natural Features (Beach/Walk/Bike Route/Local Gem) for the workspace
 *  map's overlay - separate from each distillery's own "Nearby" list.
 *  Uses React's cache() (see getDistilleries above for why) rather than a
 *  module-level variable, so this can't persist stale data across
 *  separate requests on a warm serverless instance. */
export const getLocalFeatures = cache(async (): Promise<LocalFeature[]> => {
  return fetchLocalFeaturesFromAirtable();
});

async function fetchLocalFeaturesFromAirtable(): Promise<LocalFeature[]> {
  const records = await airtableFetchAll<AirtableLocalFeatureFields>("Local Features");
  return records
    .map((r) => mapToLocalFeature(r.id, r.fields))
    .filter((f): f is LocalFeature => f !== null);
}

export async function getLocalFeatureBySlug(slug: string): Promise<LocalFeature | undefined> {
  const features = await getLocalFeatures();
  return features.find((f) => f.slug === slug);
}

/** Featured Stays (curated hotel/accommodation partners). Only Status: Live
 *  records are returned in production - same "never leak a draft onto the
 *  live site" gate as getDays' Status filter above (Featured Stays uses
 *  the identical Draft/In review/Live convention, not Local Features'
 *  Todo/In progress/Done task-tracking style). On preview/dev
 *  environments, Draft/In review show too - see the gate comment on
 *  mapToFeaturedStay in airtable-mappers.ts for the full reasoning.
 *  React's cache() again (see getDistilleries above for why), not a
 *  module-level variable. */
/** The cheapest tour a visitor can actually book at this distillery,
 *  formatted for display, or "" when there is nothing bookable. Feeds
 *  Distillery.priceFrom - see the note at its assignment for why this is
 *  computed rather than read from Airtable's own Price From column. */
function cheapestPublishableTourPrice(tours: Tour[]): string {
  const prices = tours.filter((t) => isPublishableTour(t) && t.price > 0).map((t) => t.price);
  return prices.length > 0 ? formatPrice(Math.min(...prices)) : "";
}

export const getFeaturedStays = cache(async (): Promise<FeaturedStay[]> => {
  return fetchFeaturedStaysFromAirtable();
});

async function fetchFeaturedStaysFromAirtable(): Promise<FeaturedStay[]> {
  const [records, distilleries, localFeatures, days, distanceRecords] = await Promise.all([
    airtableFetchAll<AirtableFeaturedStayFields>("Featured Stays"),
    getVisitableDistilleries(),
    getLocalFeatures(),
    getDays(),
    airtableFetchAll<AirtableStayDistilleryDistanceFields>("Stay Distillery Distances"),
  ]);

  const distilleryById = new Map(distilleries.map((d) => [d.id, d]));
  const localFeatureById = new Map(localFeatures.map((f) => [f.id, f]));
  const daysById = new Map(days.map((d) => [d.id, d]));

  const stays = records
    .map((r) => mapToFeaturedStay(r.id, r.fields, distilleryById, localFeatureById, daysById))
    .filter((s): s is FeaturedStay => s !== null);

  // "Distilleries from your door" - nearest four by real drive time,
  // sourced from the Stay Distillery Distances junction table rather than
  // computed from coordinates (see FeaturedStay.nearestDistilleries' doc
  // comment in types.ts for why). Grouped by Stay first since a stay's
  // rows are scattered across the whole junction table, not adjacent.
  const distancesByStayId = new Map<string, { distillery: Distillery; driveTimeMinutes: number }[]>();
  for (const rec of distanceRecords) {
    const stayId = rec.fields.Stay?.[0];
    const distilleryId = rec.fields.Distillery?.[0];
    const minutes = rec.fields["Drive Time (Minutes)"];
    if (!stayId || !distilleryId || minutes == null) continue;
    const distillery = distilleryById.get(distilleryId);
    if (!distillery) continue;
    const list = distancesByStayId.get(stayId) ?? [];
    list.push({ distillery, driveTimeMinutes: minutes });
    distancesByStayId.set(stayId, list);
  }
  for (const stay of stays) {
    stay.nearestDistilleries = (distancesByStayId.get(stay.id) ?? [])
      .sort((a, b) => a.driveTimeMinutes - b.driveTimeMinutes)
      .slice(0, 4);
  }

  return stays;
}

export async function getFeaturedStayBySlug(slug: string): Promise<FeaturedStay | undefined> {
  const stays = await getFeaturedStays();
  return stays.find((s) => s.slug === slug);
}

/** Areas (village/region guide pages, e.g. Port Ellen) - same "never leak
 *  a draft onto the live site" Status gate as getFeaturedStays, handled
 *  inside mapToArea. Added 06 Aug 2026. */
export const getAreas = cache(async (): Promise<Area[]> => {
  return fetchAreasFromAirtable();
});

async function fetchAreasFromAirtable(): Promise<Area[]> {
  const [records, distilleries, localFeatures, featuredStays, days] = await Promise.all([
    airtableFetchAll<AirtableAreaFields>("Areas"),
    getVisitableDistilleries(),
    getLocalFeatures(),
    getFeaturedStays(),
    getDays(),
  ]);

  const localFeatureById = new Map(localFeatures.map((f) => [f.id, f]));
  const featuredStayById = new Map(featuredStays.map((s) => [s.id, s]));
  const daysById = new Map(days.map((d) => [d.id, d]));
  // Name/slug only, built from the raw records before any Area is fully
  // mapped - see mapToArea's doc comment for why (Alternate Areas
  // self-links would otherwise need a circular fetch).
  const areaMetaById = new Map(
    records
      .filter((r) => r.fields.Name && r.fields.Slug)
      .map((r) => [r.id, { name: r.fields.Name!, slug: r.fields.Slug! }])
  );

  const areas = records
    .map((r) => mapToArea(r.id, r.fields, localFeatureById, featuredStayById, areaMetaById, daysById))
    .filter((a): a is Area => a !== null);

  // Local Distilleries - grouped via the Distilleries table's own curated
  // Region field (matched to this area's distilleryRegion), not computed
  // straight-line distance. Islay's geography makes raw distance
  // misleading for "nearby" claims (see content-sourcing-standards.md).
  // `distilleries` here is getVisitableDistilleries() - an Area page's
  // "Local Distilleries" is a list of places to go in that area, so a
  // producing-but-closed distillery must not appear in it (Laggan Bay's
  // Region is "West Islay" and would otherwise land on the Rhinns).
  for (const area of areas) {
    area.distilleries = area.distilleryRegion
      ? distilleries.filter((d) => d.region === area.distilleryRegion)
      : [];
  }

  return areas;
}

export async function getAreaBySlug(slug: string): Promise<Area | undefined> {
  const areas = await getAreas();
  return areas.find((a) => a.slug === slug);
}

/** Pre-Designed Days Hub entries. Only Status: Live Days are returned -
 *  same "never leak a draft onto the live site" gate as getJournalPosts'
 *  Published filter above. React's cache() again (see getDistilleries),
 *  so this can't persist stale data across separate serverless requests. */
export const getDays = cache(async (): Promise<HubDay[]> => {
  return fetchDaysFromAirtable();
});

async function fetchDaysFromAirtable(): Promise<HubDay[]> {
  const [dayRecords, dayStopRecords, tourRecords, distilleries, localFeatures] = await Promise.all([
    airtableFetchAll<AirtableDayFields>("Days"),
    airtableFetchAll<AirtableDayStopFields>("Day Stops"),
    airtableFetchAll<AirtableTourFields>("Tours"),
    getVisitableDistilleries(),
    getLocalFeatures(),
  ]);

  const dayStopById = new Map(dayStopRecords.map((r) => [r.id, r.fields]));
  const tourById = new Map(tourRecords.map((r) => [r.id, mapTour(r.fields)]));
  const distilleryById = new Map(distilleries.map((d) => [d.id, d]));
  const localFeatureBySlug = new Map(localFeatures.map((f) => [f.slug, f]));
  const localFeatureById = new Map(localFeatures.map((f) => [f.id, f]));
  const ctx = { dayStopById, tourById, distilleryById, localFeatureBySlug, localFeatureById };

  const days: HubDay[] = [];

  for (const record of dayRecords) {
    // Gate on Status: Live so drafts never show on the live Pre-Designed
    // Days Hub - same "never leak a draft onto the live site" rule as
    // every other index page. mapAirtableDayRecord itself only skips a
    // genuinely blank placeholder row (no Name/Slug); it has no opinion
    // on Status, since getJourneys() below reuses it WITHOUT this gate
    // (a Journey renders regardless of its own or its Days' Status, for
    // Mark's pre-launch review - see that function's own comment).
    if (record.fields.Status !== "Live") continue;

    const day = mapAirtableDayRecord(record, ctx);
    if (!day) continue;
    if (day.stops.length === 0) continue; // no resolvable stops - not ready to show

    days.push(day);
  }

  return days;
}

/** Every Day record, mapped regardless of Status - powers /days/[slug]
 *  (the new per-day detail page, added 13 Aug 2026). Deliberately
 *  ungated, unlike getDays() above: a Day reachable from inside a Journey
 *  (via its "Open the day →" link) can itself be Status: Draft - "The
 *  Kildalton Road"'s Day 1 ("Two Miles Apart") is exactly this case
 *  (see /journeys/[slug]'s own doc comment on the same reasoning) - so
 *  gating this page on Status would silently 404 a day a Journey page
 *  just linked to. Same "never leak a draft onto the live site" concern
 *  doesn't apply here the way it does to an index page (getDays/getAreas/
 *  getFeaturedStays): nothing lists/links to a Draft Day's detail page
 *  except a Journey that itself already renders regardless of Status for
 *  Mark's own pre-launch review - a real Status gate belongs here once
 *  Journeys go public, not yet. React's cache() again (see getDistilleries
 *  above), so this can't persist stale data across separate requests. */
export const getAllDaysAnyStatus = cache(async (): Promise<HubDay[]> => {
  const [dayRecords, dayStopRecords, tourRecords, distilleries, localFeatures] = await Promise.all([
    airtableFetchAll<AirtableDayFields>("Days"),
    airtableFetchAll<AirtableDayStopFields>("Day Stops"),
    airtableFetchAll<AirtableTourFields>("Tours"),
    getVisitableDistilleries(),
    getLocalFeatures(),
  ]);

  const dayStopById = new Map(dayStopRecords.map((r) => [r.id, r.fields]));
  const tourById = new Map(tourRecords.map((r) => [r.id, mapTour(r.fields)]));
  const distilleryById = new Map(distilleries.map((d) => [d.id, d]));
  const localFeatureBySlug = new Map(localFeatures.map((f) => [f.slug, f]));
  const localFeatureById = new Map(localFeatures.map((f) => [f.id, f]));
  const ctx = { dayStopById, tourById, distilleryById, localFeatureBySlug, localFeatureById };

  const days: HubDay[] = [];
  for (const record of dayRecords) {
    const day = mapAirtableDayRecord(record, ctx);
    if (day) days.push(day);
  }
  return days;
});

export async function getDayBySlug(slug: string): Promise<HubDay | undefined> {
  const days = await getAllDaysAnyStatus();
  return days.find((d) => d.slug === slug);
}

/** Every Journey Day junction row is fetched once and reused by both
 *  getJourneys() (list) and getJourneyBySlug() (detail) - same shape as
 *  every other "fetch once, resolve in memory" join in this file. Kept
 *  as its own function (rather than folded into fetchJourneysFromAirtable
 *  inline) purely for readability given how many tables a Journey joins
 *  across (Journeys, Journey Days, Days, Day Stops, Tours, Distilleries,
 *  Local Features). */
async function fetchJourneysFromAirtable(): Promise<Journey[]> {
  const [journeyRecords, journeyDayRecords, dayRecords, dayStopRecords, tourRecords, distilleries, localFeatures] =
    await Promise.all([
      airtableFetchAll<AirtableJourneyFields>("Journeys"),
      airtableFetchAll<AirtableJourneyDayFields>("Journey Days"),
      airtableFetchAll<AirtableDayFields>("Days"),
      airtableFetchAll<AirtableDayStopFields>("Day Stops"),
      airtableFetchAll<AirtableTourFields>("Tours"),
      getVisitableDistilleries(),
      getLocalFeatures(),
    ]);

  const dayStopById = new Map(dayStopRecords.map((r) => [r.id, r.fields]));
  const tourById = new Map(tourRecords.map((r) => [r.id, mapTour(r.fields)]));
  const distilleryById = new Map(distilleries.map((d) => [d.id, d]));
  const localFeatureBySlug = new Map(localFeatures.map((f) => [f.slug, f]));
  const localFeatureById = new Map(localFeatures.map((f) => [f.id, f]));
  const ctx = { dayStopById, tourById, distilleryById, localFeatureBySlug, localFeatureById };

  // mapAirtableDayRecord returns a HubDay per Day record - built once per
  // unique Day (not per Journey Day row), since the same Day can be
  // linked into more than one Journey (e.g. "Bowmore, Unhurried" is both
  // The Islay Grand Tour's Day 2 and The Rhinns Trail's Day 3 - editing
  // it once updates both, per the Journey Days table's own description).
  const dayById = new Map<string, HubDay>();
  for (const record of dayRecords) {
    const day = mapAirtableDayRecord(record, ctx);
    if (day) dayById.set(record.id, day);
  }

  const journeyDayById = new Map(journeyDayRecords.map((r) => [r.id, r.fields]));

  // THE FLOOR (18 Aug 2026). The cheapest publishable, priced tour at
  // every distillery on the island, keyed by slug - built once here from
  // the WHOLE Tours table rather than from the tours these journeys
  // happen to book, because "what is the least this distillery will take
  // from you" is a fact about the distillery, not about the itinerary.
  //
  // Two rows are excluded, for two different reasons:
  //  - Verification "Placeholder — do not publish". Both of Bowmore's
  //    are, and one of them (£30) undercuts its real £20 standard tour;
  //    a floor built from a price nobody stands behind is worse than no
  //    floor at all.
  //  - price <= 0. Port Ellen Open Days carries £0 with a duration of
  //    "Unconfirmed — not publicly listed", which means "we don't know",
  //    not "free" - and £0 would drag Port Ellen's floor from £250 to
  //    nothing and take the whole journey's claim band with it.
  // A distillery left with nothing publishable is simply ABSENT from
  // this map. Callers must treat absence as "we can't say", never as
  // zero - see journeyTourFloor.
  const cheapestTourByDistilleryId = new Map<string, number>();
  for (const record of tourRecords) {
    const tour = mapTour(record.fields);
    if (!isPublishableTour(tour)) continue;
    const distilleryId = record.fields.Distillery?.[0];
    if (!distilleryId) continue;
    const current = cheapestTourByDistilleryId.get(distilleryId);
    if (current === undefined || tour.price < current) {
      cheapestTourByDistilleryId.set(distilleryId, tour.price);
    }
  }
  const standardTourFloorBySlug: Record<string, number> = {};
  for (const [distilleryId, price] of cheapestTourByDistilleryId) {
    const distillery = distilleryById.get(distilleryId);
    if (distillery) standardTourFloorBySlug[distillery.slug] = price;
  }

  const journeys: Journey[] = [];

  for (const record of journeyRecords) {
    const f = record.fields;
    // Same "skip a blank placeholder row" pattern as every other table -
    // deliberately NOT gated on Status here. Every real Journey record is
    // Status: Draft as of 12 Aug 2026 and this page is explicitly for
    // Mark's own pre-launch review on a preview deployment, so gating on
    // Status would just make the page unreviewable - see the /journeys/
    // [slug] route itself for where a real Live gate would need adding
    // once these are ready to go public.
    if (!f.Name || !f.Slug) continue;

    // Sorted ONCE, then split into the two index-aligned arrays the
    // Journey type exposes (`days` and `dayBaseLegs`) - deliberately not
    // two separate sorts, which is the only way those two could ever
    // disagree about which base leg belongs to which day.
    const journeyDayIds = f["Journey Days"] ?? [];
    const orderedJourneyDays = journeyDayIds
      .map((id) => journeyDayById.get(id))
      .filter((jd): jd is AirtableJourneyDayFields => !!jd)
      .map((jd) => ({ order: jd.Order ?? 0, day: jd.Day?.[0] ? dayById.get(jd.Day[0]) : undefined, jd }))
      .filter((entry): entry is { order: number; day: HubDay; jd: AirtableJourneyDayFields } => !!entry.day)
      .sort((a, b) => a.order - b.order);
    const days = orderedJourneyDays.map((entry) => entry.day);
    const dayBaseLegs = orderedJourneyDays.map((entry) => ({
      // Undefined (not 0) for a blank cell: "this leg was never routed"
      // is a different fact from "this leg takes no time", and only the
      // first should send the reader to its fallback estimate.
      fromBaseMinutes:
        typeof entry.jd["Leg From Base Minutes"] === "number" ? entry.jd["Leg From Base Minutes"] : undefined,
      toBaseMinutes:
        typeof entry.jd["Leg To Base Minutes"] === "number" ? entry.jd["Leg To Base Minutes"] : undefined,
      // Airtable returns an unticked checkbox as absent, not false, and
      // that is exactly the distinction wanted here: undefined means
      // "this row predates the sub-600m rule, fall back to Transfer
      // Mode", while an explicit false means "recomputed, and driven".
      fromBaseWalked:
        typeof entry.jd["Leg From Base Walked"] === "boolean" ? entry.jd["Leg From Base Walked"] : undefined,
      toBaseWalked:
        typeof entry.jd["Leg To Base Walked"] === "boolean" ? entry.jd["Leg To Base Walked"] : undefined,
    }));

    journeys.push({
      id: record.id,
      slug: f.Slug,
      name: f.Name,
      cardDescription: f["Card Description"] ?? "",
      intro: f.Intro ?? "",
      // Routed through /api/attachment, same pattern/reasoning as
      // Distilleries' Hero Image (see fetchDistilleriesFromAirtable
      // above) - Airtable's own attachment URLs expire after a few
      // hours. Empty string (never a broken/placeholder image) when the
      // field is blank, which it is for all four Journeys as of 12 Aug
      // 2026 - the page falls back to a plain navy header for these
      // rather than fabricating a photo.
      heroImage: f["Hero Image"]?.[0] ? `/api/attachment?t=tbl7fro0EjvRoqsAo&r=${record.id}&f=fld1V2lL6maIEebAv&i=0` : "",
      heroImageCredit: f["Hero Image Credit"] || undefined,
      accommodationNote: f["Accommodation Note"] ?? "",
      days,
      dayBaseLegs,
      // Blank is Drive, per the field's own description - not a third
      // "unknown" state, and never inherited from the Days inside it.
      transferMode: f["Transfer Mode"] === "Walk" ? "walk" : "drive",
      baseStayId: f["Base Stay"]?.[0],
      // Both halves or neither: one coordinate is not a position, and
      // pairing a stray latitude with a centroid's longitude would put
      // the origin somewhere nobody authored. Same rule the precompute
      // script applies, so the two can never disagree about whether an
      // override is in force.
      transferOriginLat:
        typeof f["Transfer Origin Latitude"] === "number" && typeof f["Transfer Origin Longitude"] === "number"
          ? f["Transfer Origin Latitude"]
          : undefined,
      transferOriginLng:
        typeof f["Transfer Origin Latitude"] === "number" && typeof f["Transfer Origin Longitude"] === "number"
          ? f["Transfer Origin Longitude"]
          : undefined,
      // The label stands on its own - it describes what the STORED legs
      // were measured from, which stays true even if someone later blanks
      // the coordinates without recomputing.
      transferOriginLabel: f["Transfer Origin Label"]?.trim() || undefined,
      claim: f.Claim ?? "",
      regionLabel: f["Region Label"] ?? "",
      nights: f.Nights ?? 0,
      base: f.Base ?? "",
      nightNotesLines: (f["Night Notes"] ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      makeItYours: parseMakeItYours(f["Make It Yours"]),
      gettingHereRows: parseLabelValueLines(f["Getting Here Rows"]),
      whenToComeRows: parseLabelValueLines(f["When To Come Rows"]),
      // Every distillery's floor, not just this journey's - the page
      // narrows it to the ones it visits. Sharing one object across all
      // four journeys is deliberate: there is only one answer to "what
      // does the cheapest Bowmore tour cost", and copying it per journey
      // is how two pages start disagreeing.
      standardTourFloor: standardTourFloorBySlug,
      // Undefined (not 0) throughout, so the sidebar can tell "no rate
      // sourced yet" from a real £0 - and, for car hire, "not needed"
      // from "not priced". See each field's own doc comment in
      // airtable-mappers.ts.
      accommodationFromPerNight:
        typeof f["Accommodation From (per night)"] === "number"
          ? f["Accommodation From (per night)"]
          : undefined,
      accommodationPeakPerNight:
        typeof f["Accommodation Peak (per night)"] === "number"
          ? f["Accommodation Peak (per night)"]
          : undefined,
      carHirePerDay: typeof f["Car Hire Per Day"] === "number" ? f["Car Hire Per Day"] : undefined,
      routeSummary: f["Route Summary"] ?? "",
      source: "airtable",
    });
  }

  return journeys;
}

/** Classic Journeys (Islay Grand Tour, Rhinns Trail, etc.) - assembled
 *  from the Journeys + Journey Days tables rather than hardcoded. The
 *  array this replaced (journeys-data.ts's CLASSIC_JOURNEYS) was deleted
 *  on 17 Aug 2026, when the homepage's Classic Journeys section moved
 *  onto this same call - it is the only source of journey content on the
 *  site now, homepage cards included. React's
 *  cache() again (see getDistilleries above), so this can't persist
 *  stale data across separate serverless requests on a warm instance. */
export const getJourneys = cache(async (): Promise<Journey[]> => {
  return fetchJourneysFromAirtable();
});

export async function getJourneyBySlug(slug: string): Promise<Journey | undefined> {
  const journeys = await getJourneys();
  return journeys.find((j) => j.slug === slug);
}

/** Journal blog posts - filters out drafts (Published unchecked) so
 *  in-progress writing never accidentally goes live. React's cache() again
 *  (see getDistilleries above) rather than a module-level variable. */
export const getJournalPosts = cache(async (): Promise<JournalPost[]> => {
  return fetchJournalPostsFromAirtable();
});

async function fetchJournalPostsFromAirtable(): Promise<JournalPost[]> {
  const records = await airtableFetchAll<AirtableJournalFields>("Journal");
  return records
    .filter((r) => r.fields.Published === true)
    .map((r) => mapToJournalPost(r.fields, r.id))
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1)); // newest first
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | undefined> {
  const posts = await getJournalPosts();
  return posts.find((p) => p.slug === slug);
}

export async function getDistilleryBySlug(slug: string): Promise<Distillery | undefined> {
  const all = await getDistilleries();
  return all.find((d) => d.slug === slug);
}

interface AirtableSeasonFields {
  Name?: string;
  Eyebrow?: string;
  Copy?: string;
  Busyness?: number;
  Order?: number;
  "Show As Card"?: boolean;
  "Month Note"?: string;
}

interface AirtableMonthFields {
  Name?: string;
  Order?: number;
  Season?: string[];
}

/** The bands of Islay's year, ordered. Feeds the homepage's "When to go"
 *  cards and, via Months, the colour of the twelve-month bar. */
export const getSeasons = cache(async (): Promise<Season[]> => {
  const records = await airtableFetchAll<AirtableSeasonFields>("Seasons");
  return records
    .filter((r) => !!r.fields.Name)
    .map((r) => ({
      id: r.id,
      name: r.fields.Name as string,
      eyebrow: r.fields.Eyebrow ?? "",
      copy: r.fields.Copy ?? "",
      busyness: r.fields.Busyness ?? 0,
      order: r.fields.Order ?? 0,
      // === true for the same reason every other checkbox on this site
      // reads that way: Airtable omits an unchecked box entirely.
      showAsCard: r.fields["Show As Card"] === true,
      monthNote: r.fields["Month Note"] || undefined,
    }))
    .sort((a, b) => a.order - b.order);
});

/** Twelve months in calendar order, each carrying the Season it belongs
 *  to. Sorted by Order rather than Airtable's record order, so re-sorting
 *  the grid view cannot scramble the year on the page. */
export const getMonths = cache(async (): Promise<MonthBand[]> => {
  const records = await airtableFetchAll<AirtableMonthFields>("Months");
  return records
    .filter((r) => !!r.fields.Name)
    .map((r) => ({
      name: r.fields.Name as string,
      order: r.fields.Order ?? 0,
      seasonId: r.fields.Season?.[0],
    }))
    .sort((a, b) => a.order - b.order);
});

interface AirtablePracticalityFields {
  Name?: string;
  Category?: string;
  URL?: string;
  Note?: string;
  Order?: number;
  Affiliate?: boolean;
}

/** The hire firms, taxi guides and collection points behind "Before you
 *  go". Rows with no Name are skipped; rows with no URL still render, as
 *  plain text. */
export const getPracticalities = cache(async (): Promise<Practicality[]> => {
  const records = await airtableFetchAll<AirtablePracticalityFields>("Practicalities");
  return records
    .filter((r) => !!r.fields.Name)
    .map((r) => ({
      id: r.id,
      name: r.fields.Name as string,
      category: r.fields.Category ?? "",
      url: r.fields.URL || undefined,
      note: r.fields.Note || undefined,
      order: r.fields.Order ?? 0,
      // === true: Airtable omits an unchecked box, and "not stated" must
      // mean "not paid", never the reverse.
      affiliate: r.fields.Affiliate === true,
    }))
    .sort((a, b) => a.order - b.order);
});

interface AirtableCostLineFields {
  Label?: string;
  Figure?: string;
  Sub?: string;
  Auto?: boolean;
  Order?: number;
  Verified?: string;
}

export const getCostLines = cache(async (): Promise<CostLine[]> => {
  const records = await airtableFetchAll<AirtableCostLineFields>("Cost Lines");
  return records
    .filter((r) => !!r.fields.Label)
    .map((r) => ({
      id: r.id,
      label: r.fields.Label as string,
      figure: r.fields.Figure ?? "",
      sub: r.fields.Sub || undefined,
      auto: r.fields.Auto === true,
      order: r.fields.Order ?? 0,
      verified: r.fields.Verified || undefined,
    }))
    .sort((a, b) => a.order - b.order);
});

export async function getLocalEvents(): Promise<LocalEvent[]> {
  const [records, distilleries] = await Promise.all([
    airtableFetchAll<AirtableEventFields>("Events"),
    getVisitableDistilleries(),
  ]);
  return records
    .map((r) => mapToLocalEvent(r.id, r.fields, distilleries))
    .filter((e): e is LocalEvent => e !== null);
}

export async function getNearbyPlaces(
  category: "pub" | "cafe" | "restaurant" | "golf" | "spa",
  center: { lat: number; lng: number },
  radiusMeters = 5000
): Promise<PlaceListing[]> {
  return searchNearbyByCategory(category, center, radiusMeters);
}

export async function getAccommodation(
  center: { lat: number; lng: number },
  radiusMeters = 10000
): Promise<PlaceListing[]> {
  // TODO(Phase 5): try Booking.com Demand API first once the affiliate
  // application is approved; this Google Places `lodging` search is the
  // fallback (informational only, no affiliate link/pricePerNight).
  return searchAccommodation(center, radiusMeters);
}
