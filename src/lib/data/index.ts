import type { Distillery, LocalEvent, PlaceListing } from "@/lib/types";
import { MOCK_DISTILLERIES } from "./distilleries";

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

export async function getDistilleries(): Promise<Distillery[]> {
  // TODO(Phase 2): swap for an Airtable fetch once the base + PAT are ready.
  // e.g. return getDistilleriesFromAirtable();
  return MOCK_DISTILLERIES;
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
  _category: "pub" | "cafe" | "restaurant",
  _center: { lat: number; lng: number },
  _radiusMeters = 5000
): Promise<PlaceListing[]> {
  // TODO(Phase 4): Google Places Nearby Search (New), includedTypes filter
  // per category, field-masked to keep cost down.
  return [];
}

export async function getAccommodation(
  _center: { lat: number; lng: number },
  _radiusMeters = 10000
): Promise<PlaceListing[]> {
  // TODO(Phase 5): Booking.com Demand API search, falling back to
  // Google Places `lodging` type (informational only, no affiliate link)
  // if Booking.com access isn't approved yet or has an outage.
  return [];
}
