import type { Distillery, LocationAnswer } from "./types";
import { estimatedDriveMinutes } from "./drive-time";

/**
 * Reference points for the "today" live-forecast link (added 21 July
 * 2026). Previously a single hardcoded Bowmore link regardless of where
 * the visitor actually was - fine for a Bowmore-area visitor, meaningfully
 * wrong for one nearer Port Ellen, Port Charlotte, Port Askaig, or Jura.
 *
 * Each entry reuses an existing, already-sourced distillery's own lat/lng
 * as its reference coordinate, rather than maintaining a second set of
 * village coordinates elsewhere - Airtable's Distillery records stay the
 * one golden source of location data on this site.
 *
 * Met Office forecast URLs verified live and correctly named 21 July
 * 2026 (each fetched directly to confirm the place name matches and the
 * page is genuine, not an aggregator). Met Office location codes are
 * stable in practice but not guaranteed permanent - worth a quick re-check
 * if any of these ever 404.
 */
const WEATHER_REFERENCE_POINTS: { distillerySlug: string; url: string; label: string }[] = [
  { distillerySlug: "port-ellen", url: "https://weather.metoffice.gov.uk/forecast/gcgs7pn0t", label: "Port Ellen" },
  { distillerySlug: "bowmore", url: "https://weather.metoffice.gov.uk/forecast/gcgt0ynnb", label: "Bowmore" },
  // Islay Youth Hostel's Met Office page - the hostel itself sits right in
  // Port Charlotte village, next to Bruichladdich distillery, so this is a
  // genuine Rinns-area reference point even though the page's own title
  // names the hostel rather than the village.
  { distillerySlug: "bruichladdich", url: "https://weather.metoffice.gov.uk/forecast/gcgmng5yu", label: "Port Charlotte" },
  { distillerySlug: "bunnahabhain", url: "https://weather.metoffice.gov.uk/forecast/gcgtec6sd", label: "Ballygrant" },
  { distillerySlug: "isle-of-jura", url: "https://weather.metoffice.gov.uk/forecast/gcgv8s1qu", label: "Craighouse, Jura" },
];

// Bowmore - roughly central to Islay - is the safest fallback when there's
// no specific "today" starting distillery to work from.
const DEFAULT_REFERENCE = WEATHER_REFERENCE_POINTS[1];

/** Picks whichever reference point's own distillery is geographically
 *  closest (by the same drive-time estimate used elsewhere) to the
 *  visitor's chosen "today" starting distillery. Falls back to the
 *  Bowmore reference if location isn't a specific distillery (e.g. an
 *  older/legacy "today" session, or the resume-with-stops-but-no-intake
 *  case) or the slug can't be matched against the resolved distilleries
 *  list. */
export function nearestWeatherReference(
  location: LocationAnswer,
  distilleries: Distillery[]
): { url: string; label: string } {
  if (location.kind !== "distillery") return DEFAULT_REFERENCE;
  const start = distilleries.find((d) => d.slug === location.distillerySlug);
  if (!start) return DEFAULT_REFERENCE;

  let best = DEFAULT_REFERENCE;
  let bestMinutes = Infinity;
  for (const ref of WEATHER_REFERENCE_POINTS) {
    const refDistillery = distilleries.find((d) => d.slug === ref.distillerySlug);
    if (!refDistillery) continue;
    const minutes = estimatedDriveMinutes(start, refDistillery);
    if (minutes < bestMinutes) {
      bestMinutes = minutes;
      best = ref;
    }
  }
  return best;
}
