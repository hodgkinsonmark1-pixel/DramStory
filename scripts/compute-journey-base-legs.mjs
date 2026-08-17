#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// compute-journey-base-legs.mjs — precompute the travel from a journey's
// BASE to each day's first stop, and from that day's last stop back
// again, and store both on the Journey Days junction record.
//
// WHY THIS EXISTS
//   compute-day-stop-legs.mjs routes the legs BETWEEN a day's stops, so a
//   day's schedule and travel total used to start at its first stop and
//   end at its last one — the drive out of bed in the morning and back to
//   it at night simply weren't counted. On /days/[slug] read cold that is
//   the honest answer (nobody has said where they're sleeping). Inside a
//   Journey it isn't: the Journey states its Base.
//
// WHY THE JUNCTION TABLE
//   The same Day appears in journeys with different bases — "Bowmore,
//   Unhurried" is The Islay Grand Tour's Day 2 (from Port Ellen) and The
//   Rhinns Trail's Day 3 (from Bridgend). The leg is a fact about the
//   pairing, not about the Day, so it lives on Journey Days.
//
// WHAT IT WRITES (Journey Days table, tblzTeYWOTDPZyzRZ)
//   Leg From Base Minutes   base → this day's FIRST stop, minutes
//   Leg To Base Minutes     this day's LAST stop → base, minutes
//
//   Both are left ALONE (blank, if they were never set) whenever the base
//   can't be resolved to real coordinates or the router fails — the site
//   falls back to its own estimate for a blank cell, which is a better
//   answer than a fabricated one. Neither is derived from the other:
//   one-way systems and one-way ferry legs make out and back genuinely
//   different, and Islay's single-track roads round differently in each
//   direction.
//
//   There is deliberately NO `Leg Computed` written here: unlike Day
//   Stops, the Journey Days table has no such field (checked 17 Aug
//   2026), and adding one is a schema change, not a code one. Worth
//   adding when these legs start going stale often enough to need it.
//
// BASE RESOLUTION, in order — reported per journey, never guessed
//   1. An Areas record whose Name matches the Journey's Base. Preferred:
//      Base names a place ("Port Ellen"), not a hotel, so the village
//      centroid is the honest point to measure from.
//   2. A Featured Stay whose Nearest Area, or whose own Name, starts with
//      the Base. The fallback for a village with no Area record yet —
//      Bridgend has no Areas row, but Bridgend Hotel sits in it.
//   3. Nothing. The journey is skipped and named in the run summary. No
//      geocoding, no "close enough" coordinates — the site's coordinate
//      verification hierarchy (docs/project-conventions.md) makes that a
//      deliberate manual step, not something a script does at 1am.
//
// TRAVEL MODE
//   The Day's own `Travel Mode` picks the routing profile, same as the
//   stop-to-stop script, via the shared lib/routing.mjs.
//
//   FLAGGED, because it is a real limitation rather than a detail: that
//   field describes how a visitor moves BETWEEN a day's stops. It is not
//   a statement about the transfer from a base that isn't part of the
//   day. Where the two coincide this is exactly right — "Ardbeg, on Foot"
//   really is walked out of Port Ellen, and its own Transport Note says
//   so ("Three miles out from Port Ellen on the Three Distilleries
//   Pathway"). Where they don't, routing the transfer on foot produces a
//   figure the base itself contradicts: "Bowmore, Unhurried" is a Walk
//   day whose Transport Note reads "Bus to Bowmore and back from Port
//   Ellen (~25 min each way)", and routing it on foot returns 269
//   minutes. Writing that would be the same class of silent error as
//   OSRM's fake foot profile, just sourced from our own schema instead.
//
//   So: a Walk day whose Transport Note names a motorised transfer has
//   its base legs LEFT BLANK and reported, rather than filled with a
//   walk the day says nobody takes. Blank means the site falls back to
//   its own clearly-labelled estimate, which is the honest answer to a
//   question this data can't yet answer — there is no per-journey-day
//   transfer mode, and inventing the bus timetable is not a script's job.
//   Reading the Day's own free text for this follows the precedent set by
//   isAppointmentOnly() in src/lib/day-derivations.ts, which reads a
//   distillery's Hours for "by appointment" rather than hardcoding a slug.
//
//   The run summary also calls out any walking base leg over an hour that
//   IS written, so a long-but-genuine walk still gets a human look.
//
// USAGE
//   AIRTABLE_API_KEY=pat...  (needs data.records:read AND :write)
//   AIRTABLE_BASE_ID=app14n7N50HZGglqV
//   node scripts/compute-journey-base-legs.mjs [--dry-run]
// ─────────────────────────────────────────────────────────────────────────

import { airtableFetchAll, airtableUpdate, requireKey } from "./lib/airtable.mjs";
import { modeFor, requestsSent, routeLeg } from "./lib/routing.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

/** Any walking base leg longer than this is printed as a REVIEW line in
 *  the run summary. Not a filter and not a threshold the data has to
 *  respect — the figure is still written exactly as routed. It exists so
 *  that "the visitor walks four and a half hours before their first
 *  tour" reaches a human instead of only reaching the page. */
const LONG_WALK_REVIEW_MINUTES = 60;

/** Words that, in a Day's Transport Note, mean the visitor gets to this
 *  day by engine rather than on foot. Deliberately a short, literal list
 *  of transport nouns - not an attempt to understand the sentence. */
const MOTORISED_TRANSFER = /\b(bus|taxi|ferry|coach|shuttle)\b/i;

const norm = (s) => (s ?? "").trim().toLowerCase();

/** A Walk day whose own Transport Note names a bus/taxi/ferry is telling
 *  us the transfer in and out is not walked, whatever its Travel Mode
 *  says about getting between the stops once you're there. Returns the
 *  word that triggered it, for the run summary, or null. See the TRAVEL
 *  MODE block above for why this guard exists at all. */
function motorisedTransferNote(dayFields, mode) {
  if (mode !== "walk") return null;
  const match = MOTORISED_TRANSFER.exec(dayFields["Transport Note"] ?? "");
  return match ? match[0].toLowerCase() : null;
}

/** Coordinates for a Journey's `Base`, plus where they came from — see
 *  the BASE RESOLUTION block above. Null when nothing matches. */
function resolveBase(baseText, areas, stays) {
  const wanted = norm(baseText);
  if (!wanted) return null;

  const area = areas.find(
    (r) => norm(r.fields.Name) === wanted && typeof r.fields.Latitude === "number" && typeof r.fields.Longitude === "number"
  );
  if (area) {
    return {
      lat: area.fields.Latitude,
      lng: area.fields.Longitude,
      source: `Areas → ${area.fields.Name} (village centroid)`,
    };
  }

  const stay = stays.find(
    (r) =>
      typeof r.fields.Latitude === "number" &&
      typeof r.fields.Longitude === "number" &&
      (norm(r.fields["Nearest Area"]).startsWith(wanted) || norm(r.fields.Name).startsWith(wanted))
  );
  if (stay) {
    return {
      lat: stay.fields.Latitude,
      lng: stay.fields.Longitude,
      source: `Featured Stays → ${stay.fields.Name} (no Areas record for "${baseText}")`,
    };
  }

  return null;
}

function coordsForStop(stopFields, distilleryById) {
  const distId = stopFields.Distillery?.[0];
  if (!distId) return null;
  const d = distilleryById.get(distId);
  if (!d || typeof d.Latitude !== "number" || typeof d.Longitude !== "number") return null;
  return { lat: d.Latitude, lng: d.Longitude, label: d.Name ?? distId };
}

async function main() {
  requireKey({ dryRun: DRY_RUN });

  const [journeys, journeyDays, days, dayStops, distilleries, areas, stays] = await Promise.all([
    airtableFetchAll("Journeys"),
    airtableFetchAll("Journey Days"),
    airtableFetchAll("Days"),
    airtableFetchAll("Day Stops"),
    airtableFetchAll("Distilleries"),
    airtableFetchAll("Areas"),
    airtableFetchAll("Featured Stays"),
  ]);

  const journeyById = new Map(journeys.map((r) => [r.id, r.fields]));
  const dayById = new Map(days.map((r) => [r.id, r.fields]));
  const stopById = new Map(dayStops.map((r) => [r.id, r]));
  const distilleryById = new Map(distilleries.map((r) => [r.id, r.fields]));

  const updates = [];
  const skipped = [];
  const review = [];
  const basesReported = new Set();

  // Journey Days in journey-then-order sequence, purely so the run's
  // output reads like the site does rather than like Airtable's record
  // order.
  const rows = journeyDays
    .filter((r) => r.fields.Journey?.[0] && r.fields.Day?.[0])
    .sort((a, b) => {
      const ja = journeyById.get(a.fields.Journey[0])?.Name ?? "";
      const jb = journeyById.get(b.fields.Journey[0])?.Name ?? "";
      return ja === jb ? (a.fields.Order ?? 0) - (b.fields.Order ?? 0) : ja.localeCompare(jb);
    });

  for (const row of rows) {
    const journey = journeyById.get(row.fields.Journey[0]);
    const day = dayById.get(row.fields.Day[0]);
    const label = row.fields.Name ?? row.id;
    if (!journey || !day) {
      skipped.push(`${label}: journey or day link doesn't resolve`);
      continue;
    }

    const base = resolveBase(journey.Base, areas, stays);
    if (!base) {
      skipped.push(
        `${label}: Base ${journey.Base ? `"${journey.Base}"` : "(blank)"} has no Areas or Featured Stays record with coordinates — left blank`
      );
      continue;
    }
    if (!basesReported.has(journey.Name)) {
      basesReported.add(journey.Name);
      console.log(`\n${journey.Name} — Base "${journey.Base}" resolved from ${base.source}`);
    }

    const stops = (day["Day Stops"] ?? [])
      .map((id) => stopById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.fields.Order ?? 0) - (b.fields.Order ?? 0))
      .map((s) => coordsForStop(s.fields, distilleryById))
      .filter(Boolean);

    if (stops.length === 0) {
      skipped.push(`${label}: no stop with usable coordinates — left blank`);
      continue;
    }

    const mode = modeFor(day["Travel Mode"]);
    const blocked = motorisedTransferNote(day, mode);
    if (blocked) {
      skipped.push(
        `${label}: Walk day, but its Transport Note says the transfer is by ${blocked} ` +
          `- base legs left blank rather than routed on foot (site falls back to its estimate)`
      );
      continue;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];

    const [out, back] = [await routeLeg(base, first, mode), await routeLeg(last, base, mode)];

    const fields = {};
    if (out.error) skipped.push(`${label}: base → ${first.label} (${mode}) failed — ${out.error}; left blank`);
    else fields["Leg From Base Minutes"] = out.minutes;
    if (back.error) skipped.push(`${label}: ${last.label} → base (${mode}) failed — ${back.error}; left blank`);
    else fields["Leg To Base Minutes"] = back.minutes;

    if (Object.keys(fields).length === 0) continue;

    console.log(
      `  ${label} [${mode}] base → ${first.label}: ${out.error ? "—" : `${out.minutes} min (${out.km} km)`}` +
        ` | ${last.label} → base: ${back.error ? "—" : `${back.minutes} min (${back.km} km)`}`
    );

    if (mode === "walk") {
      const walkLegs = [
        { what: `base → ${first.label}`, leg: out },
        { what: `${last.label} → base`, leg: back },
      ];
      for (const { what, leg } of walkLegs) {
        if (!leg.error && leg.minutes > LONG_WALK_REVIEW_MINUTES) {
          review.push(`${label}: ${what} is a ${leg.minutes} min walk (${leg.km} km) — is this really walked from base?`);
        }
      }
    }

    updates.push({ id: row.id, fields });
  }

  console.log(
    `\n${updates.length} journey day(s) updated from ${requestsSent()} routing request(s), ${skipped.length} issue(s).`
  );
  for (const s of skipped) console.log(`  SKIPPED: ${s}`);
  for (const r of review) console.log(`  REVIEW: ${r}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: nothing written to Airtable.");
    return;
  }
  await airtableUpdate("Journey Days", updates);
  console.log(`Wrote ${updates.length} Journey Day record(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
