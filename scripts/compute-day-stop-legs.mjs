#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// compute-day-stop-legs.mjs — precompute the real routed travel leg
// between consecutive stops of every Day, and store it in Airtable.
//
// WHY THIS EXISTS
//   The site used to size every travel leg with a straight-line haversine
//   estimate (src/lib/drive-time.ts, distance ÷ 40km/h). Real routed
//   times are available free from OSRM, but OSRM's public demo server is
//   explicitly for "reasonable, non-commercial use" with no SLA — not
//   something to call on every page render. So routing happens ONCE,
//   here, offline, and the answer is stored on the Day Stop record. The
//   site then just reads a number out of Airtable
//   (day-derivations.ts → legTravelMinutes), and falls back to its old
//   estimate for any leg this script left blank.
//
//   The live planner (src/components/journey/Workspace.tsx) is
//   deliberately NOT changed by this: someone actively dragging stops
//   around is asking about an order nobody precomputed, so it keeps
//   calling OSRM live.
//
// WHAT IT WRITES (Day Stops table, tbl9WmZxgEXGzzrxp)
//   Leg Minutes         travel time from the PREVIOUS stop, minutes
//                       (driving: the router's own duration; walking:
//                       derived from the distance below — see
//                       WALKING_SPEED_KMH in lib/routing.mjs)
//   Leg Distance (km)   routed distance for the same leg, 1dp
//   Leg Computed        today's date, ISO — so a stale leg is spottable
//
//   The FIRST stop of each Day is left blank: nothing precedes it. The
//   travel in from the visitor's bed and back again is a different
//   question with a different answer per journey — see the sibling
//   script, compute-journey-base-legs.mjs. Any leg whose routing fails is
//   left as it was (blank if never computed) and reported at the end —
//   this script never writes a guess, and it never writes an estimate
//   dressed up as a routed figure.
//
// RE-RUNNING
//   Safe and idempotent — it recomputes and overwrites every leg. Re-run
//   whenever a stop's Order, a venue's coordinates, or a Day's Travel
//   Mode changes; `Leg Computed` is how you tell whether that's overdue.
//
// TRAVEL MODE / ROUTING PROFILES
//   A Day's `Travel Mode` (Drive/Walk, blank = Drive) picks the profile.
//   The profiles themselves, the walking-pace rule and the rate limiting
//   all live in lib/routing.mjs, shared with the base-legs script —
//   including the note on why OSRM's own /foot/ profile is not used.
//
// USAGE
//   AIRTABLE_API_KEY=pat...  (needs data.records:read AND :write)
//   AIRTABLE_BASE_ID=app14n7N50HZGglqV
//   node scripts/compute-day-stop-legs.mjs [--dry-run]
// ─────────────────────────────────────────────────────────────────────────

import { airtableFetchAll, airtableUpdate, requireKey } from "./lib/airtable.mjs";
import { modeFor, requestsSent, routeLeg } from "./lib/routing.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

function coordsFor(stopFields, distilleryById, featureById) {
  const distId = stopFields.Distillery?.[0];
  if (distId) {
    const d = distilleryById.get(distId);
    if (d && typeof d.Latitude === "number" && typeof d.Longitude === "number") {
      return { lat: d.Latitude, lng: d.Longitude, label: d.Name ?? distId };
    }
    return null;
  }
  // Day Stops has no Local Feature link field as of 17 Aug 2026 — every
  // Day Stop record is a distillery, and a Day's feature stops are
  // discovered from /explore/ links in its Narrative instead (see
  // mapAirtableDayRecord). This branch exists so that adding such a link
  // field later Just Works rather than needing this script rewritten.
  const featId = stopFields["Local Feature"]?.[0] ?? stopFields["Local Features"]?.[0];
  if (featId) {
    const f = featureById.get(featId);
    if (f && typeof f.Latitude === "number" && typeof f.Longitude === "number") {
      return { lat: f.Latitude, lng: f.Longitude, label: f.Name ?? featId };
    }
  }
  return null;
}

async function main() {
  requireKey({ dryRun: DRY_RUN });

  const [days, dayStops, distilleries, features] = await Promise.all([
    airtableFetchAll("Days"),
    airtableFetchAll("Day Stops"),
    airtableFetchAll("Distilleries"),
    airtableFetchAll("Local Features"),
  ]);

  const stopById = new Map(dayStops.map((r) => [r.id, r]));
  const distilleryById = new Map(distilleries.map((r) => [r.id, r.fields]));
  const featureById = new Map(features.map((r) => [r.id, r.fields]));

  const today = new Date().toISOString().slice(0, 10);
  const updates = [];
  const skipped = [];
  let firstStops = 0;

  for (const day of days) {
    const name = day.fields.Name;
    if (!name) continue; // blank placeholder row
    const mode = modeFor(day.fields["Travel Mode"]);

    const stops = (day.fields["Day Stops"] ?? [])
      .map((id) => stopById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.fields.Order ?? 0) - (b.fields.Order ?? 0));

    let prev = null;
    for (const [i, stop] of stops.entries()) {
      const here = coordsFor(stop.fields, distilleryById, featureById);
      if (!here) {
        skipped.push(`${name} → ${stop.fields.Name ?? stop.id}: no usable coordinates`);
        prev = null; // the next leg has nothing honest to measure from either
        continue;
      }
      if (i === 0 || !prev) {
        if (i === 0) firstStops++;
        prev = here;
        continue;
      }

      const leg = await routeLeg(prev, here, mode);

      if (leg.error) {
        skipped.push(`${name}: ${prev.label} → ${here.label} (${mode}) routing failed — ${leg.error}; left blank`);
      } else {
        console.log(
          `${name} [${mode}] ${prev.label} → ${here.label}: ${leg.minutes} min, ${leg.km} km`
        );
        updates.push({
          id: stop.id,
          fields: { "Leg Minutes": leg.minutes, "Leg Distance (km)": leg.km, "Leg Computed": today },
        });
      }
      prev = here;
    }
  }

  console.log(
    `\n${updates.length} leg(s) routed in ${requestsSent()} request(s), ` +
      `${firstStops} first stop(s) left blank, ${skipped.length} skipped.`
  );
  for (const s of skipped) console.log(`  SKIPPED: ${s}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: nothing written to Airtable.");
    return;
  }
  await airtableUpdate("Day Stops", updates);
  console.log(`Wrote ${updates.length} Day Stop record(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
