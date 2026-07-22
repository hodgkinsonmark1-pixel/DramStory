import { cache } from "react";
import type { Distillery, HubDay, JournalPost, LocalEvent, LocalFeature, PlaceListing } from "@/lib/types";
import { airtableFetchAll } from "@/lib/airtable";
import { searchAccommodation, searchNearbyByCategory } from "@/lib/google-places";
import {
  deriveNextStops,
  mapLocalFeature,
  mapTour,
  mapToJournalPost,
  mapToLocalEvent,
  mapToLocalFeature,
  type AirtableDayFields,
  type AirtableDayStopFields,
  type AirtableDistilleryFields,
  type AirtableEventFields,
  type AirtableJournalFields,
  type AirtableLocalFeatureFields,
  type AirtableTourFields,
} from "./airtable-mappers";

const DISTILLERIES_TABLE_ID = "tblSPRTIf1sFK3UDL";
const DISTILLERY_HERO_FIELD_ID = "fldbYJ8xNSPCLwG0h";

// Matches the [label](/path) inline links already used in Day narratives
// (same renderWithLinks pattern as the Distillery/Explore pages) - reused
// here to resolve which real Local Features a Day's map should pin,
// since Day Stops only links Day -> Distillery -> Tour, not Day -> Local
// Feature. Whatever the narrative actually links to under /explore/ is
// exactly the set of Local Features that Day cares about.
const EXPLORE_LINK_RE = /\[([^\]]+)\]\(\/explore\/([a-z0-9-]+)\)/g;

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
  const tourPriceById = new Map(tourRecords.map((r) => [r.id, r.fields.Price]));
  const distilleryById = new Map(distilleries.map((d) => [d.id, d]));
  const localFeatureBySlug = new Map(localFeatures.map((f) => [f.slug, f]));

  const days: HubDay[] = [];

  for (const record of dayRecords) {
    const f = record.fields;
    // Airtable has a few blank placeholder rows mixed into the table
    // (same pattern as Distilleries) - skip anything not a real record,
    // and gate on Status: Live so drafts never show on the live site.
    if (!f.Name || !f.Slug || f.Status !== "Live") continue;

    const stopIds = f["Day Stops"] ?? [];
    const stops = stopIds
      .map((id) => dayStopById.get(id))
      .filter((s): s is AirtableDayStopFields => !!s)
      .map((s) => ({
        distillery: s.Distillery?.[0] ? distilleryById.get(s.Distillery[0]) : undefined,
        tourPrice: s.Tour?.[0] ? tourPriceById.get(s.Tour[0]) : undefined,
        order: s.Order ?? 0,
      }))
      .filter((s): s is { distillery: Distillery; tourPrice: number | undefined; order: number } => !!s.distillery)
      .sort((a, b) => a.order - b.order);

    if (stops.length === 0) continue; // no resolvable stops - not ready to show

    const totalCost = stops.reduce((sum, s) => sum + (s.tourPrice ?? 0), 0);

    // Local Feature map pins: resolved from the narrative's own
    // [label](/explore/slug) links against the live Local Features list -
    // see EXPLORE_LINK_RE above for why (Day Stops has no Day -> Local
    // Feature link field).
    const mapFeatures: HubDay["mapFeatures"] = [];
    const narrative = f.Narrative ?? "";
    for (const match of narrative.matchAll(EXPLORE_LINK_RE)) {
      const feature = localFeatureBySlug.get(match[2]);
      if (feature) mapFeatures.push({ name: feature.name, slug: feature.slug, lat: feature.lat, lng: feature.lng });
    }

    const mapDistilleries: HubDay["mapDistilleries"] = stops.map((s) => ({
      name: s.distillery.name,
      slug: s.distillery.slug,
      lat: s.distillery.lat,
      lng: s.distillery.lng,
    }));

    days.push({
      id: record.id,
      slug: f.Slug,
      name: f.Name,
      type: f.Type === "Multi" ? "Multi" : "Solo",
      distilleries: stops.map((s) => s.distillery.name),
      narrative,
      pacing: f.Pacing ?? "",
      durationPortEllen: f["Duration from Port Ellen"] ?? "",
      durationBowmore: f["Duration from Bowmore"] ?? "",
      cost: totalCost > 0 ? `£${totalCost}pp` : "",
      // Visual priority matches the previous hardcoded page: a single
      // hero image for a one-stop Day, a split image for a two-stop
      // Multi Day, otherwise the real map.
      heroImageUrl:
        stops.length === 1 && stops[0].distillery.image
          ? `/api/attachment?t=${DISTILLERIES_TABLE_ID}&r=${stops[0].distillery.id}&f=${DISTILLERY_HERO_FIELD_ID}&i=0`
          : undefined,
      heroImageUrls:
        stops.length === 2 && stops.every((s) => s.distillery.image)
          ? stops.map(
              (s) => `/api/attachment?t=${DISTILLERIES_TABLE_ID}&r=${s.distillery.id}&f=${DISTILLERY_HERO_FIELD_ID}&i=0`
            )
          : undefined,
      mapDistilleries,
      mapFeatures: mapFeatures.length > 0 ? mapFeatures : undefined,
      source: "airtable",
    });
  }

  return days;
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
