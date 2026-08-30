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
//   ONE EXCEPTION, and it overrides the Journey (17 Aug 2026): a
//   transfer that routes shorter than SHORT_TRANSFER_WALK_METRES (600m)
//   is walked whatever `Transfer Mode` says. The Islay Grand Tour is
//   based in Port Ellen and its old day 5 was Port Ellen distillery, so
//   a Drive transfer mode was producing "a 1 minute drive" across the
//   village. Nobody does that. (That day was unlinked from the journey
//   on 30 Aug 2026; the rule outlives the example that prompted it.) The leg is re-routed on foot and timed at
//   WALKING_SPEED_KMH, and the fact that it was walked is written to the
//   record so the site prints the right verb over it. See that constant
//   in lib/routing.mjs for the full reasoning; within-day legs are NOT
//   subject to it.
//
//   The routing profiles themselves, the walking-pace rule and the rate
//   limiting all live in lib/routing.mjs, shared with the stop-to-stop
//   script — including the note on why OSRM's own /foot/ profile is not
//   used.
//
// BASE RESOLUTION, in order — reported per journey, never guessed
//
//   0. The Journey's own `Transfer Origin Latitude` / `Transfer Origin
//      Longitude`, when BOTH are set. AN AUTHORED OVERRIDE, and it beats
//      every rule below.
//
//      Added 17 Aug 2026 for The Kildalton Road (then named The South
//      Coast Walk), which is the case a
//      village centroid genuinely cannot describe. That journey is walked
//      along the Three Distilleries Pathway, and the pathway does not
//      begin in the middle of Port Ellen: it begins next to Port Ellen
//      Primary School, roughly 360m EAST of the Areas centroid
//      (55.629332, -6.188077). Measuring from the centroid therefore adds
//      the width of half a village to both ends of every day, and the
//      figure the site printed read longer than the signage the visitor
//      is standing in front of. The override is 55.629514 / -6.18228,
//      sourced from postcodes.io for PA42 7BW — a real, checkable
//      coordinate, per the site's coordinate verification hierarchy
//      (docs/project-conventions.md), and NOT a coordinate nudged until
//      the routed numbers agreed with a published one.
//
//      `Transfer Origin Label` travels with it — "the pathway start by
//      Port Ellen Primary School" — and is the point of the whole
//      override as far as a reader is concerned: a transfer time measured
//      from something other than the Base has to SAY so, or it is just a
//      number that quietly disagrees with the map. It is threaded to the
//      page through Journey.transferOriginLabel -> DayBase -> the walking
//      line, the day's timeline strip and the day-shape sentence. The
//      label is editorial copy and is never composed here.
//
//      BOTH coordinates are required. One on its own is not a position,
//      so a half-filled pair falls through to the rules below rather than
//      being combined with a centroid — and it is named in the run
//      summary rather than passing silently.
//
//      BLANK IS THE NORMAL CASE and changes nothing. The other three
//      journeys leave all three fields empty and resolve exactly as they
//      did before this pass.
//
//   REVERSED 17 Aug 2026, and the reasoning it replaced is worth stating
//   because it read convincingly. This script shipped preferring the
//   Journey's `Base Stay` link on the grounds that "a transfer starts at
//   a door, not at a village". The site owner has ruled that wrong. A
//   journey is described as being based at Port Ellen — the VILLAGE. The
//   featured hotel exists to supply one indicative room rate for the
//   sidebar; it is not where the visitor is told to sleep, and they may
//   book anywhere in that village. Measuring every transfer from one
//   particular front door claims a precision the journey never made, and
//   it moves as soon as the featured hotel is swapped.
//
//   1. An Areas record whose Name matches the Journey's `Base` text —
//      that village's own centroid. PREFERRED, per the above.
//   2. The Journey's `Base Stay` link, resolved to that Featured Stay's
//      own coordinates. The fallback where the Base names a place with
//      no Areas row: Bridgend has none, so The Rhinns Trail and The
//      Hidden Coast both land here and are measured from the Bridgend
//      Hotel. Coarse in the opposite direction — one building standing
//      in for a village — but it is a real, verified coordinate inside
//      the right place, which beats not routing the leg at all.
//   3. A Featured Stay whose Nearest Area, or whose own Name, starts with
//      the Base text. For a village with neither an Areas row nor a
//      linked Base Stay.
//   4. Nothing. The journey is skipped and named in the run summary. No
//      geocoding, no "close enough" coordinates — the site's coordinate
//      verification hierarchy (docs/project-conventions.md) makes that a
//      deliberate manual step, not something a script does at 1am.
//
//   `Base Stay` on the Journeys table is untouched by this reordering.
//   It still names the featured hotel and still drives the sidebar's
//   accommodation range (journeyAccommodationRange). All that changed is
//   that it no longer decides where a transfer is measured FROM.
//
// WHICH TWO STOPS THE TRANSFERS RUN TO AND FROM  (fixed 17 Aug 2026)
//
//   The day's first and last NON-OPTIONAL stop, by Order, distilleries
//   and Local Features alike.
//
//   Not simply its first and last: a stop the narrative offers as a maybe
//   is not where the day starts or ends, and the visitor who takes the
//   detour comes back through the real last stop. See the comment at the
//   filter itself for the two records this was measurably wrong for.
//
//   And not distilleries only, which is what this script read until now:
//   half these days end at a beach, a viewpoint or a village church, and
//   those have been real, ordered Day Stops since 17 Aug 2026. Both
//   halves of this had to change together - fixing the optional rule
//   while still ignoring features would have re-measured five days from
//   the wrong end and quietly rewritten figures that are already right.
//
// WHAT IT WRITES (Journey Days table, tblzTeYWOTDPZyzRZ)
//   Leg From Base Minutes   base → this day's FIRST stop, minutes
//   Leg To Base Minutes     this day's LAST stop → base, minutes
//   Leg From Base Walked    was that leg walked?  checkbox
//   Leg To Base Walked      was that leg walked?  checkbox
//
//   The two checkboxes exist because `Transfer Mode` no longer answers
//   the question on its own: the sub-600m rule above can walk a leg on a
//   Drive journey. They are written together with the minutes they
//   describe, so a row can never claim a walking time under a driving
//   verb. The site reads them (Journey.dayBaseLegs) instead of keeping a
//   second copy of the threshold.
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
import { SHORT_TRANSFER_WALK_METRES, modeFor, requestsSent, routeTransferLeg } from "./lib/routing.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

/** Any WALKED transfer longer than this is printed as a REVIEW line in
 *  the run summary. Not a filter and not a threshold the data has to
 *  respect — the figure is still written exactly as routed. It exists so
 *  that "the visitor walks an hour and a half before their first tour"
 *  reaches a human instead of only reaching the page. */
const LONG_WALK_REVIEW_MINUTES = 60;

const norm = (s) => (s ?? "").trim().toLowerCase();

/** Coordinates to measure this Journey's transfers from, plus where they
 *  came from — see the BASE RESOLUTION block above. Also carries the
 *  authored `Transfer Origin Label`, when there is one, purely so the run
 *  summary names it; the site reads the field itself. Null when nothing
 *  matches. */
function resolveBase(journeyFields, stayById, areas, stays) {
  const wanted = norm(journeyFields.Base);

  // 0. The authored transfer origin, ahead of everything else. See rule 0
  //    in BASE RESOLUTION above: this exists because Port Ellen's
  //    centroid is not where the Three Distilleries Pathway starts, and
  //    a village centroid has no way of saying so.
  const originLat = journeyFields["Transfer Origin Latitude"];
  const originLng = journeyFields["Transfer Origin Longitude"];
  const originLabel = (journeyFields["Transfer Origin Label"] ?? "").trim();
  if (typeof originLat === "number" && typeof originLng === "number") {
    return {
      lat: originLat,
      lng: originLng,
      label: originLabel || undefined,
      source: `Transfer Origin override -> ${
        originLabel || `${originLat}, ${originLng} (no label authored)`
      }`,
    };
  }
  // Half a pair is not a position. Say so rather than silently measuring
  // from a centroid the author thought they had overridden.
  if (typeof originLat === "number" || typeof originLng === "number") {
    console.log(
      `  NOTE: ${journeyFields.Name ?? "journey"} has only one of Transfer Origin Latitude/Longitude — ignoring the override and resolving the Base as normal`
    );
  }

  // 1. The village itself. See BASE RESOLUTION above for why this now
  //    outranks the Base Stay link rather than backing it up.
  if (wanted) {
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
        source: `Areas → ${area.fields.Name} (village centroid)`,
      };
    }
  }

  // 2. No Areas row for this Base — fall back to the featured stay's own
  //    coordinates. Bridgend is the real case: no Areas record exists, so
  //    both journeys based there measure from the Bridgend Hotel.
  const stayId = journeyFields["Base Stay"]?.[0];
  if (stayId) {
    const stay = stayById.get(stayId);
    if (stay && typeof stay.Latitude === "number" && typeof stay.Longitude === "number") {
      return {
        lat: stay.Latitude,
        lng: stay.Longitude,
        source: `Base Stay → ${stay.Name ?? stayId} (no Areas record for "${journeyFields.Base ?? ""}")`,
      };
    }
    // A linked stay with no coordinates is worth saying out loud rather
    // than silently sliding down to the looser name match.
    console.log(
      `  NOTE: Base Stay "${stay?.Name ?? stayId}" has no coordinates — falling back to a name match on the Base text`
    );
  }

  if (!wanted) return null;

  // 3. The looser name match, unchanged.
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

/** Where a Day Stop actually is - a Distillery or a Local Feature, the
 *  same two links and the same precedence as the sibling script's
 *  coordsFor.
 *
 *  The feature branch is not optional politeness: a day's real last stop
 *  is often a beach or a viewpoint ("Kilchoman and Machir Bay" ends at
 *  Machir Bay Beach, "Bunnahabhain, Back from Silence" at Rubha
 *  Bhachlaig), and reading only the Distillery link measured the journey
 *  home from a stop the visitor left an hour earlier - 15 rather than 17
 *  minutes back to Bridgend, 34 rather than 37 back to Port Ellen. The
 *  stored figures on Journey Days are the feature-aware ones; this is
 *  the code catching up with them, not a change of answer. */
function coordsForStop(stopFields, distilleryById, featureById) {
  const distId = stopFields.Distillery?.[0];
  if (distId) {
    const d = distilleryById.get(distId);
    if (!d || typeof d.Latitude !== "number" || typeof d.Longitude !== "number") return null;
    return { lat: d.Latitude, lng: d.Longitude, label: d.Name ?? distId };
  }
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

  const [journeys, journeyDays, days, dayStops, distilleries, features, areas, stays] = await Promise.all([
    airtableFetchAll("Journeys"),
    airtableFetchAll("Journey Days"),
    airtableFetchAll("Days"),
    airtableFetchAll("Day Stops"),
    airtableFetchAll("Distilleries"),
    airtableFetchAll("Local Features"),
    airtableFetchAll("Areas"),
    airtableFetchAll("Featured Stays"),
  ]);

  const journeyById = new Map(journeys.map((r) => [r.id, r.fields]));
  const dayById = new Map(days.map((r) => [r.id, r.fields]));
  const stopById = new Map(dayStops.map((r) => [r.id, r]));
  const distilleryById = new Map(distilleries.map((r) => [r.id, r.fields]));
  const featureById = new Map(features.map((r) => [r.id, r.fields]));
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
        `${label}: neither a Base ${
          journey.Base ? `"${journey.Base}"` : "(blank)"
        } that resolves nor a Base Stay with coordinates — left blank`
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
        `\n${journey.Name} — transfers ${
          mode === "walk" ? "WALKED" : "DRIVEN (any under 600m walked)"
        }, from ${base.source}`
      );
    }

    // OPTIONAL STOPS ARE NOT THE ENDS OF A DAY (17 Aug 2026). A Day Stop
    // marked `Optional` is one the narrative offers rather than plans -
    // "if you have the energy... it's worth continuing to Kildalton
    // Cross" - and the visitor who takes it walks back through the day's
    // real last stop anyway. Measuring the return transfer from it
    // states, as a fact, a journey home nobody was told to make: "Ardbeg,
    // on Foot" ends at Ardbeg for the purposes of getting back to Port
    // Ellen, not at Port Mòr an hour and a half further on. It also put
    // this script at odds with the site, whose walkingLineFor has counted
    // the optional tail separately - as a stated detour, there and back -
    // since the checkbox existed.
    //
    // So the ends of the day are its first and last NON-OPTIONAL stops.
    // Optional stops in the MIDDLE change nothing, here or anywhere: they
    // are neither end, and this script has never routed the legs between
    // stops.
    const allStops = (day["Day Stops"] ?? [])
      .map((id) => stopById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.fields.Order ?? 0) - (b.fields.Order ?? 0));
    const optionalCount = allStops.filter((s) => s.fields.Optional).length;
    const stops = allStops
      .filter((s) => !s.fields.Optional)
      .map((s) => coordsForStop(s.fields, distilleryById, featureById))
      .filter(Boolean);

    if (stops.length === 0) {
      skipped.push(
        `${label}: no non-optional stop with usable coordinates${
          optionalCount > 0 ? ` (${optionalCount} optional stop(s) ignored, deliberately)` : ""
        } — left blank`
      );
      continue;
    }

    const first = stops[0];
    const last = stops[stops.length - 1];

    const [out, back] = [
      await routeTransferLeg(base, first, mode),
      await routeTransferLeg(last, base, mode),
    ];

    const fields = {};
    if (out.error) skipped.push(`${label}: base → ${first.label} (${mode}) failed — ${out.error}; left blank`);
    else {
      fields["Leg From Base Minutes"] = out.minutes;
      fields["Leg From Base Walked"] = out.walked;
    }
    if (back.error) skipped.push(`${label}: ${last.label} → base (${mode}) failed — ${back.error}; left blank`);
    else {
      fields["Leg To Base Minutes"] = back.minutes;
      fields["Leg To Base Walked"] = back.walked;
    }

    if (Object.keys(fields).length === 0) continue;

    const describe = (leg) =>
      leg.error ? "—" : `${leg.minutes} min ${leg.walked ? "walk" : "drive"} (${leg.km} km)`;
    console.log(
      `  ${label} base → ${first.label}: ${describe(out)} | ${last.label} → base: ${describe(back)}`
    );

    const legs = [
      { what: `base → ${first.label}`, leg: out },
      { what: `${last.label} → base`, leg: back },
    ];
    for (const { what, leg } of legs) {
      if (leg.error) continue;
      if (leg.note) review.push(`${label}: ${what} — ${leg.note}`);
      // A leg the 600m rule turned into a walk on a Drive journey is
      // worth naming: it is the one place this script contradicts an
      // authored field, and a human should see it happen.
      if (leg.walked && mode !== "walk") {
        review.push(
          `${label}: ${what} routed under ${SHORT_TRANSFER_WALK_METRES}m, so it is WALKED (${leg.minutes} min, ${leg.km} km) despite Transfer Mode "Drive"`
        );
      }
      if (leg.walked && leg.minutes > LONG_WALK_REVIEW_MINUTES) {
        review.push(`${label}: ${what} is a ${leg.minutes} min walk (${leg.km} km) — is this really walked from base?`);
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
