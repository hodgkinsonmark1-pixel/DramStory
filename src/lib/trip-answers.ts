import type { Distillery } from "@/lib/types";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { AREAS } from "@/lib/areas";
import { DREAM_AREAS } from "@/lib/dream-areas";

/**
 * Shared read helpers for TripAnswers (see trip-context.tsx) - used by
 * both the homepage hero's sentence control (Hero.tsx) and the /days
 * answers bar (DaysAnswersBar.tsx) so the two don't drift on how a
 * base/nights/picks answer gets turned into words.
 */

/** Copy deck lines (docs/days-trip-flow-handoff.md §10, "Base sheet") -
 *  one line on why you'd choose each Featured Stay. Keyed by slug. */
export const FEATURED_STAY_NOTES: Record<string, string> = {
  "the-machrie": "On the links above Laggan Bay, halfway between north and south",
  "ardbeg-house": "Charlotte Street, Port Ellen — the peated south on your doorstep",
  "port-charlotte-hotel": "Victorian, on the shore — Bruichladdich and Kilchoman close by",
  "bridgend-hotel": "Where the island's roads meet — nothing is far from here",
};

/** Copy deck lines for "Or just an area". Only three of AREAS' five
 *  entries have a line here. The design doc's own copy deck (§10) also
 *  listed Port Askaig, but that predates the 8 Aug decision on
 *  feature/areas-port-ellen to drop it from every area/accommodation
 *  picker site-wide - it isn't a real /areas/[slug] page, just a Local
 *  Features "Ferry Port" record. Excluded here too (Mark's call, 9 Aug)
 *  so this list stays consistent with that one rather than reopening it.
 *  Bruichladdich is excluded for the separate reason noted in
 *  @/lib/areas - never part of the signed-off base-sheet list at all. */
export const AREA_NOTES: Record<string, string> = {
  "port-ellen": "The south — Laphroaig, Lagavulin, Ardbeg",
  bowmore: "The middle — everything within reach",
  "port-charlotte": "The Rhinns — Bruichladdich and Kilchoman",
};

/** The Featured Stays offered on the homepage/answers-bar base sheet -
 *  all four, same as FEATURED_STAYS itself. */
export const BASE_SHEET_STAYS = FEATURED_STAYS;

/** The Areas offered on the homepage/answers-bar base sheet - only the
 *  three with a copy deck line (see AREA_NOTES above): Port Ellen,
 *  Bowmore, Port Charlotte - matching the 3 real, live Area pages. */
export const BASE_SHEET_AREAS = AREAS.filter((a) => a.slug in AREA_NOTES);

/** Looks up the full place (name/lat/lng) for a base answer, so a caller
 *  can pass it straight to setAnswersBase (which needs it for
 *  setAccommodationFromDay). Returns undefined if the slug isn't found
 *  in either list (shouldn't happen for anything this UI itself wrote,
 *  but keeps this honest for anything else that might set it later). */
export function findBaseAccommodation(base: string, baseKind: "hotel" | "area") {
  return baseKind === "hotel"
    ? FEATURED_STAYS.find((s) => s.slug === base)
    : AREAS.find((a) => a.slug === base);
}

/** The base answer's display name, e.g. "The Machrie" or "Port Ellen".
 *  Falls back to the slug itself if somehow not found, rather than
 *  showing nothing. */
export function baseDisplayName(base: string, baseKind: "hotel" | "area"): string {
  return findBaseAccommodation(base, baseKind)?.name ?? base;
}

/** "any distillery" / "Laphroaig" / "Laphroaig and Lagavulin" /
 *  "Laphroaig, Lagavulin and 2 more" - matches the prototype's own
 *  wording (join(' and ') for two, no doc guidance given for 3+, so this
 *  extends the same pattern rather than inventing new copy). */
export function describePicks(picks: string[], distilleries: Distillery[]): string {
  if (picks.length === 0) return "any distillery";
  const names = picks
    .map((slug) => distilleries.find((d) => d.slug === slug)?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return "any distillery";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/** "the" preposition before the base answer changes with what kind of
 *  place it is (docs/hero-handoff.md §3.2) - "at The Machrie" (a named
 *  hotel) vs "in Port Ellen" (an area). Getting this wrong reads as a
 *  typo, not a design choice, so it is worth its own small helper rather
 *  than inlining the ternary at every call site. */
export function basePreposition(baseKind: "hotel" | "area"): "at" | "in" {
  return baseKind === "hotel" ? "at" : "in";
}

/** The dreaming clause's area name, e.g. "the peated south". Falls back
 *  to the id itself if somehow not found. */
export function dreamAreaDisplayName(dreamArea: string): string {
  return DREAM_AREAS.find((a) => a.id === dreamArea)?.name ?? dreamArea;
}

/** The today clause's village name, e.g. "Port Ellen". Reuses the same
 *  three real Areas as the base sheet's "or just an area" group (see
 *  BASE_SHEET_AREAS above) rather than inventing a second village list -
 *  docs/hero-handoff.md §10 flags "which villages does the near clause
 *  offer" as an open decision; this is the judgment call made for Phase
 *  1, easy to swap for a dedicated list later if that decision lands
 *  differently. */
export function villageDisplayName(todayNear: string): string {
  return AREAS.find((a) => a.slug === todayNear)?.name ?? todayNear;
}
