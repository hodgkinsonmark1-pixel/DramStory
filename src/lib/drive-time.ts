// ─────────────────────────────────────────────────────────────────────────
// Estimated drive time between two points, based on straight-line
// (haversine) distance and an assumed average speed for Islay's rural
// single-track roads. Not routed via a real roads API — that's a
// reasonable future upgrade (e.g. a driving-directions API) once traffic
// justifies the cost, but this gets close enough for trip planning today
// (verified against the approved mockup's Ardbeg -> Bowmore estimate).
// ─────────────────────────────────────────────────────────────────────────

const AVERAGE_SPEED_KMH = 40;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimated drive time in whole minutes, rounded to the nearest 5. */
export function estimatedDriveMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const km = haversineKm(a, b);
  const minutes = (km / AVERAGE_SPEED_KMH) * 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Formats minutes as "25m" or "1h 40m", matching the approved mockup. */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Every duration/visit string in the base is free text typed by a human,
 *  so one shared parser handles all of them rather than three near-copies
 *  drifting apart. Ordered most-specific first:
 *
 *    1. compact compound   "~1h15", "1h30"
 *    2. spelled compound   "1 hr 30 min", "1 hour 15 minutes"
 *    3. two-unit range     "45 min - 1 hour"        -> upper end
 *    4. shared-unit range  "30-45 min", "2-2.5 hrs" -> upper end
 *    5. single value       "1.5 hrs", "50 min", "~90 min"
 *
 *  Returns null when nothing numeric is recognisable ("Unconfirmed - not
 *  publicly listed" is a real value in the Tours table) - null means
 *  "this string does not state a duration", which is a different fact
 *  from "the duration is zero", and callers are expected to fall back
 *  rather than print a fabricated number.
 *
 *  Ranges resolve to their UPPER end, matching the rule
 *  parseFeatureDurationMinutes has documented since 22 July 2026: a
 *  schedule that assumes the short end of every range runs late. */
export function parseDurationMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  // Airtable content uses real en/em dashes ("2\u20132.5 hrs"); normalise to a
  // plain hyphen so one set of range patterns covers both.
  const text = raw.replace(/[\u2012-\u2015]/g, "-");

  // 1. "1h15" / "~1h30" - hours and minutes run together, no unit on the
  //    minutes. Anchored on \d rather than [\d.] so "1.5 hrs" can't be
  //    misread as 1 hour 5 minutes.
  const compact = text.match(/(\d+)\s*h\s*(\d{1,2})(?!\d)\s*(?:mins?|minutes?|m)?/i);
  if (compact) return Number(compact[1]) * 60 + Number(compact[2]);

  // 2. "1 hr 30 min" - both parts spelled out, hours first.
  const compound = text.match(
    /([\d.]+)\s*(?:hours?|hrs?|h)\b[^\d]{0,6}?([\d.]+)\s*(?:mins?|minutes?|m)\b/i
  );
  if (compound) return Math.round(parseFloat(compound[1]) * 60 + parseFloat(compound[2]));

  // 3. Two explicit units either side of the range, e.g. "45 min - 1 hour".
  const twoUnits = text.match(
    new RegExp(`([\\d.]+)\\s*${DURATION_UNIT_RE}\\b\\s*-\\s*([\\d.]+)\\s*${DURATION_UNIT_RE}\\b`, "i")
  );
  if (twoUnits) {
    const a = durationUnitToMinutes(parseFloat(twoUnits[1]), twoUnits[2]);
    const b = durationUnitToMinutes(parseFloat(twoUnits[3]), twoUnits[4]);
    return Math.round(Math.max(a, b));
  }

  // 4. A range sharing one trailing unit, e.g. "30-45 min", "2-2.5 hrs".
  const sharedUnit = text.match(new RegExp(`([\\d.]+)\\s*-\\s*([\\d.]+)\\s*${DURATION_UNIT_RE}\\b`, "i"));
  if (sharedUnit) return Math.round(durationUnitToMinutes(parseFloat(sharedUnit[2]), sharedUnit[3]));

  // 5. A single value, e.g. "1 hour", "~90 min".
  const single = text.match(new RegExp(`([\\d.]+)\\s*${DURATION_UNIT_RE}\\b`, "i"));
  if (single) return Math.round(durationUnitToMinutes(parseFloat(single[1]), single[2]));

  return null;
}

/** A chosen Tour's own `Duration` in minutes, or null when the Tours
 *  table doesn't state one in a parseable form (several Port Ellen tours
 *  are genuinely "Unconfirmed - not publicly listed"). Null, not a
 *  guess: the caller falls back to the distillery's Avg Visit, which is
 *  the honest second-best answer rather than a number nobody wrote down.
 *
 *  Added 17 Aug 2026. Until now every scheduled stop was sized by the
 *  DISTILLERY's Avg Visit even when the Day Stop named a specific tour,
 *  so a day built around Laphroaig's 1.5 hr "Laphroaig Experience" was
 *  scheduled as 75 minutes (Laphroaig's Avg Visit is 1.25 hrs) and
 *  every clock time after it inherited the error. */
export function parseTourDurationMinutes(duration: string | undefined): number | null {
  return parseDurationMinutes(duration);
}

/** Parses a distillery's "avgVisit" string (e.g. "1.5 hours", "90 min")
 *  into minutes. Falls back to 90 minutes if the format is unrecognized
 *  or the field is blank (Port Ellen and Isle of Jura both are) - this
 *  is the last-resort default, so unlike parseDurationMinutes it never
 *  returns null. */
export function parseAvgVisitMinutes(avgVisit: string): number {
  return parseDurationMinutes(avgVisit) ?? 90;
}

const DURATION_UNIT_RE = "(hours?|hrs?|h|mins?|minutes?|m)";

function durationUnitToMinutes(value: number, unit: string): number {
  return /^h/i.test(unit) ? value * 60 : value;
}

/** Parses a Local Feature's "duration" string (walks/bike routes only -
 *  e.g. "30-45 min", "45 min - 1 hour", "1.5-2 hours", "1 hour") into the
 *  UPPER end of the range, in minutes. Used so a walk's default itinerary
 *  visit length matches what its own narrative/Explore page already say
 *  (22 July 2026 - "Rubha Mor Headland" showed a flat 25-minute default
 *  in the itinerary while its own duration field, and the Bunnahabhain Day
 *  narrative, both say "30-45 min"). Returns null if duration is missing
 *  or doesn't match a recognizable format - callers should fall back to a
 *  flat default, same as before this existed.
 *
 *  Now a thin alias over parseDurationMinutes (17 Aug 2026): the range
 *  handling it used to own was always the more capable of the two
 *  parsers in this file, so it became the shared implementation rather
 *  than being duplicated when tour durations needed the same
 *  treatment. */
export function parseFeatureDurationMinutes(duration: string | undefined): number | null {
  return parseDurationMinutes(duration);
}
