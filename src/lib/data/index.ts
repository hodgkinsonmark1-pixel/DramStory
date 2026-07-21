import { cache } from "react";
import type { Distillery, JournalPost, LocalEvent, LocalFeature, PlaceListing } from "@/lib/types";
import { airtableFetchAll } from "@/lib/airtable";
import { searchAccommodation, searchNearbyByCategory } from "@/lib/google-places";
import {
  deriveNextStops,
  mapLocalFeature,
  mapTour,
  mapToJournalPost,
  mapToLocalEvent,
  mapToLocalFeature,
  type AirtableDistilleryFields,
  type AirtableEventFields,
  type AirtableJournalFields,
  type AirtableLocalFeatureFields,
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
