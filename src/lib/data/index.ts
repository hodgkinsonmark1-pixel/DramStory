import { cache } from "react";
import type { Area, Distillery, FeaturedStay, HubDay, JournalPost, Journey, LocalEvent, LocalFeature, PlaceListing } from "@/lib/types";
import { airtableFetchAll } from "@/lib/airtable";
import { searchAccommodation, searchNearbyByCategory } from "@/lib/google-places";
import { isPublishableTour } from "@/lib/pricing";
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
    // This one filter is the whole gate, by design: every page, map,
    // picker and "suggested next stops" list reads distilleries through
    // getDistilleries() (getDistilleryBySlug and every Day/Journey/Area/
    // Featured Stay join resolve against this same array), so nothing
    // downstream needs its own copy of the rule and none can drift from
    // it. An unpublished slug therefore 404s on /distilleries/[slug]
    // rather than rendering a broken page.
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
        tours: (f.Tours ?? [])
          .map((id) => tourById.get(id))
          .filter((t): t is AirtableTourFields => !!t)
          .map(mapTour),
        hours: f.Hours ?? "",
        priceFrom: f["Price From"] != null ? `£${f["Price From"]}` : "",
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
        source: "airtable" as const,
      };
    });

  // Next Stops has no Airtable field yet, so derive a default from
  // geographic proximity now that we have the full list to compare against.
  for (const d of distilleries) {
    d.nextStops = deriveNextStops(d, distilleries);
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
export const getFeaturedStays = cache(async (): Promise<FeaturedStay[]> => {
  return fetchFeaturedStaysFromAirtable();
});

async function fetchFeaturedStaysFromAirtable(): Promise<FeaturedStay[]> {
  const [records, distilleries, localFeatures, days, distanceRecords] = await Promise.all([
    airtableFetchAll<AirtableFeaturedStayFields>("Featured Stays"),
    getDistilleries(),
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
    getDistilleries(),
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
    getDistilleries(),
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
 *  South Coast Walk"'s Day 1 ("Two Miles Apart") is exactly this case
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
    getDistilleries(),
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
      getDistilleries(),
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
      gettingThereNote: f["Getting There Note"] ?? "",
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
      beforeYouBookRows: parseLabelValueLines(f["Before You Book Rows"]),
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

export async function getLocalEvents(): Promise<LocalEvent[]> {
  const [records, distilleries] = await Promise.all([
    airtableFetchAll<AirtableEventFields>("Events"),
    getDistilleries(),
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
