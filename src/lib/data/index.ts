import type { Distillery, LocalEvent, LocalFeature, PlaceListing } from "@/lib/types";
import { airtableFetchAll } from "@/lib/airtable";
import { searchAccommodation, searchNearbyByCategory } from "@/lib/google-places";
import {
  deriveNextStops,
  mapLocalFeature,
  mapTour,
  mapToLocalFeature,
  type AirtableDistilleryFields,
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

let distilleriesCache: Promise<Distillery[]> | null = null;

export async function getDistilleries(): Promise<Distillery[]> {
  if (!distilleriesCache) {
    distilleriesCache = fetchDistilleriesFromAirtable().catch((err) => {
      // Reset the cache on failure so the next request retries instead of
      // permanently serving a rejected promise.
      distilleriesCache = null;
      throw err;
    });
  }
  return distilleriesCache;
}

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
        image: f["Hero Image"]?.[0]?.url ?? "",
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
 *  map's overlay - separate from each distillery's own "Nearby" list. */
let localFeaturesCache: Promise<LocalFeature[]> | null = null;

export async function getLocalFeatures(): Promise<LocalFeature[]> {
  if (!localFeaturesCache) {
    localFeaturesCache = fetchLocalFeaturesFromAirtable().catch((err) => {
      localFeaturesCache = null;
      throw err;
    });
  }
  return localFeaturesCache;
}

async function fetchLocalFeaturesFromAirtable(): Promise<LocalFeature[]> {
  const records = await airtableFetchAll<AirtableLocalFeatureFields>("Local Features");
  return records
    .map((r) => mapToLocalFeature(r.id, r.fields))
    .filter((f): f is LocalFeature => f !== null);
}

export async function getDistilleryBySlug(slug: string): Promise<Distillery | undefined> {
  const all = await getDistilleries();
  return all.find((d) => d.slug === slug);
}

export async function getLocalEvents(): Promise<LocalEvent[]> {
  // TODO(Phase 2): Airtable "Events" table.
  return [];
}

export async function getNearbyPlaces(
  category: "pub" | "cafe" | "restaurant",
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
