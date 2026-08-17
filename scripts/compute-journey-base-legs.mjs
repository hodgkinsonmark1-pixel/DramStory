#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// compute-journey-base-legs.mjs — precompute the TRANSFER legs of a
// journey: base → each day's first stop, and that day's last stop → base.
// Stored on the Journey Days junction record.
//
// WHY THIS EXISTS
//   compute-day-stop-legs.mjs routes the legs BETWEEN a day's stops, so a
//   day's schedule and travel total used to start at its first stop and
//   end at its last one — the travel out of bed in the morning and back
//   to it at night simply weren't counted. On /days/[slug] read cold that
//   is the honest answer (nobody has said where they're sleeping). Inside
//   a Journey it isn't: the Journey states where the visitor sleeps.
//
// WHY THE JUNCTION TABLE
//   The same Day appears in journeys with different bases — "Bowmore,
//   Unhurried" is The Islay Grand Tour's Day 2 (from Port Ellen) and The
//   Rhinns Trail's Day 3 (from Bridgend). The leg is a fact about the
//   pairing, not about the Day, so it lives on Journey Days.
//
// ─────────────────────────────────────────────────────────────────────────
// THE TWO MODES ARE DIFFERENT QUESTIONS  (corrected 17 Aug 2026)
//
//   TRANSFER legs — base → first stop, last stop → base — use the
//   JOURNEY's own `Transfer Mode` (Drive/Walk, blank = Drive).
//
//   WITHIN-DAY legs — stop → stop — use the DAY's `Travel Mode`, and are
//   computed by the sibling script. Nothing here touches them.
//
//   These are genuinely independent facts and the previous version of
//   this script conflated them: it routed the transfer with the Day's
//   Travel Mode. On a car-based journey you DRIVE to where the day starts
//   even if the day itself is walked once you arrive — The Islay Grand
//   Tour drives the ~16 minutes from Port Ellen to Bowmore, and only then
//   is "Bowmore, Unhurried" walked around the village. Routing that
//   transfer on foot returned 269 minutes.
//
//   The workaround that error forced — "a Walk day whose Transport Note
//   mentions a bus/taxi/ferry has its base legs left blank" — is GONE as
//   of this pass. It was a free-text regex standing in for a field that
//   did not exist yet. `Transfer Mode` is that field, it is authored per
//   journey, and it answers the question directly, so there is nothing
//   left for the regex to guard against. Days whose legs it used to
//   suppress (both appearances of "Bowmore, Unhurried") now carry real
//   routed drives.
//
//   The routing profiles themselves, the walking-pace rule and the rate
//   limiting all live in lib/routing.mjs, shared with the stop-to-stop
//   script — including the note on why OSRM's own /foot/ profile is not
//   used.
//
// BASE RESOLUTION, in order — reported per journey, never guessed
//   1. The Journey's `Base Stay` link, resolved to that Featured Stay's
//      own coordinates. PREFERRED: it is the actual building the visitor
//      sleeps in, and it is what this Journey's accommodation rates
//      refer to. A transfer starts at a door, not at a village.
//   2. An Areas record whose Name matches the Journey's `Base` text.
//      The fallback when no Base Stay is linked — a village centroid,
//      which is honest but coarser.
//   3. A Featured Stay whose Nearest Area, or whose own Name, starts with
//      the Base text. For a village with no Areas row at all.
//   4. Nothing. The journey is skipped and named in the run summary. No
//      geocoding, no "close enough" coordinates — the site's coordinate
//      verification hierarchy (docs/project-conventions.md) makes that a
//      deliberate manual step, not something a script does at 1am.
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
// USAGE
//   AIRTABLE_API_KEY=pat...  (needs data.records:read AND :write)
//   AIRTABLE_BASE_ID=app14n7N50HZGglqV
//   node scripts/compute-journey-base-legs.mjs [--dry-run]
// ─────────────────────────────────────────────────────────────────────────

import { airtableFetchAll, airtableUpdate, requireKey } from "./lib/airtable.mjs";
import { modeFor, requestsSent, routeLeg } from "./lib/routing.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

/** Any WALKED transfer longer than this is printed as a REVIEW line in
 *  the run summary. Not a filter and not a threshold the data has to
 *  respect — the figure is still written exactly as routed. It exists so
 *  that "the visitor walks an hour and a half before their first tour"
 *  reaches a human instead of only reaching the page. */
const LONG_WALK_REVIEW_MINUTES = 60;

const norm = (s) => (s ?? "").trim().toLowerCase();

/** Coordinates to measure this Journey's transfers from, plus where they
 *  came from — see the BASE RESOLUTION block above. Null when nothing
 *  matches. */
function resolveBase(journeyFields, stayById, areas, stays) {
  const stayId = journeyFields["Base Stay"]?.[0];
  if (stayId) {
    const stay = stayById.get(stayId);
    if (stay && typeof stay.Latitude === "number" && typeof stay.Longitude === "number") {
      return {
        lat: stay.Latitude,
        lng: stay.Longitude,
        source: `Base Stay → ${stay.Name ?? stayId} (the building itself)`,
      };
    }
    // A linked stay with no coordinates is worth saying out loud rather
    // than silently sliding down to the village centroid.
    console.log(
      `  NOTE: Base Stay "${stay?.Name ?? stayId}" has no coordinates — falling back to the Base text field`
    );
  }

  const wanted = norm(journeyFields.Base);
  if (!wanted) return null;

  const area = areas.find(
    (r) =>
      norm(r.fields.Name) === wanted &&
      typeof r.fields.Latitude === "number" &&
      typeof r.fields.Longitude === "number"
  );
  if (area) {
    return {
      lat: area.fields.Latitude,
      lng: area.fields.Longitude,
      source: `Areas → ${area.fields.Name} (village centroid; no Base Stay linked)`,
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
      source: `Featured Stays → ${stay.fields.Name} (matched on "${journeyFields.Base}")`,
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
  const stayById = new Map(stays.map((r) => [r.id, r.fields]));

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

    const base = resolveBase(journey, stayById, areas, stays);
    if (!base) {
      skipped.push(
        `${label}: neither a Base Stay with coordinates nor a Base ${
          journey.Base ? `"${journey.Base}"` : "(blank)"
        } that resolves — left blank`
      );
      continue;
    }

    // The journey's own transfer mode, NOT the day's travel mode. See the
    // header block: these answer different questions and conflating them
    // is the bug this pass exists to fix.
    const mode = modeFor(journey["Transfer Mode"]);

    if (!basesReported.has(journey.Name)) {
      basesReported.add(journey.Name);
      console.log(
        `\n${journey.Name} — transfers ${mode === "walk" ? "WALKED" : "DRIVEN"}, from ${base.source}`
      );
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
