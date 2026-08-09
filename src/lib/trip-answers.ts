import type { Distillery } from "@/lib/types";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { AREAS } from "@/lib/areas";

/**
 * Shared read helpers for TripAnswers (see trip-context.tsx) - used by
 * both the homepage question block (AnswersBlock.tsx) and the /days
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

/** Copy deck lines for "Or just an area". Only four of AREAS' five
 *  entries have a line here - see the note in @/lib/areas about
 *  Bruichladdich not being part of the signed-off base-sheet list. */
export const AREA_NOTES: Record<string, string> = {
  "port-ellen": "The south — Laphroaig, Lagavulin, Ardbeg",
  bowmore: "The middle — everything within reach",
  "port-charlotte": "The Rhinns — Bruichladdich and Kilchoman",
  "port-askaig": "The north-east — Caol Ila, Ardnahoe, and the Jura ferry",
};

/** The Featured Stays offered on the homepage/answers-bar base sheet -
 *  all four, same as FEATURED_STAYS itself. */
export const BASE_SHEET_STAYS = FEATURED_STAYS;

/** The Areas offered on the homepage/answers-bar base sheet - only the
 *  four with a copy deck line (see AREA_NOTES above), matching the
 *  design doc's signed-off "Or just an area" list exactly. */
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
