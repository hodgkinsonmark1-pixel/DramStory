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
//   Leg Minutes         routed travel time from the PREVIOUS stop, minutes
//   Leg Distance (km)   routed distance for the same leg, 1dp
//   Leg Computed        today's date, ISO — so a stale leg is spottable
//
//   The FIRST stop of each Day is left blank: nothing precedes it. Any
//   leg whose routing fails is left as it was (blank if never computed)
//   and reported at the end — this script never writes a guess, and it
//   never writes an estimate dressed up as a routed figure.
//
// RE-RUNNING
//   Safe and idempotent — it recomputes and overwrites every leg. Re-run
//   whenever a stop's Order, a venue's coordinates, or a Day's Travel
//   Mode changes; `Leg Computed` is how you tell whether that's overdue.
//
// TRAVEL MODE / ROUTING PROFILES  (verified 17 Aug 2026)
//   A Day's `Travel Mode` (Drive/Walk, blank = Drive) picks the profile.
//
//   router.project-osrm.org DOES respond 200 to /route/v1/foot/... but it
//   does NOT actually have the foot profile loaded: the response is
//   byte-for-byte identical to the /driving/ response for the same
//   coordinates (verified on Laphroaig→Lagavulin: both return
//   duration 189.8s / distance 1971.9m, i.e. ~37km/h, which is not a
//   walking pace). Writing those numbers onto a walking day would be
//   exactly the silent error this script is meant to remove.
//
//   So walking legs are routed against FOSSGIS's public OSRM instance,
//   routing.openstreetmap.de/routed-foot, which does have a real foot
//   profile (same leg: 1566.3s / 1964.7m, ~4.5km/h). If that host is ever
//   unavailable, the leg fails and is left blank — the script does not
//   quietly substitute a driving time. Self-hosting OSRM with both
//   profiles is the right answer once this matters commercially.
//
// USAGE
//   AIRTABLE_API_KEY=pat...  (needs data.records:read AND :write)
//   AIRTABLE_BASE_ID=app14n7N50HZGglqV
//   node scripts/compute-day-stop-legs.mjs [--dry-run]
//
//   --dry-run  routes everything and prints the table it would write,
//              without touching Airtable. Also the way to run this with a
//              read-only token.
// ─────────────────────────────────────────────────────────────────────────

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? "app14n7N50HZGglqV";
const DRY_RUN = process.argv.includes("--dry-run");

const PROFILES = {
  drive: "https://router.project-osrm.org/route/v1/driving",
  // See the TRAVEL MODE note above — NOT router.project-osrm.org/foot,
  // which silently answers with car routing.
  walk: "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
};

/** Space requests out. Both hosts are free public services asking for
 *  reasonable use; ~1 request/sec is well inside that and this whole run
 *  is a handful of requests. */
const REQUEST_SPACING_MS = 1100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireKey() {
  if (!API_KEY) {
    console.error("Missing AIRTABLE_API_KEY. Set it, or pass --dry-run to route without writing.");
    process.exit(1);
  }
}

async function airtableFetchAll(table) {
  const out = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) throw new Error(`Airtable read failed for "${table}": ${res.status} ${await res.text()}`);
    const data = await res.json();
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

async function airtableUpdate(table, records) {
  // Airtable's PATCH endpoint takes 10 records at a time.
  for (let i = 0; i < records.length; i += 10) {
    const chunk = records.slice(i, i + 10);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: chunk }),
    });
    if (!res.ok) throw new Error(`Airtable write failed: ${res.status} ${await res.text()}`);
  }
}

/** One routed leg, or null. Null means "we do not know" — the caller
 *  leaves the fields alone rather than inventing a figure. */
async function routeLeg(from, to, mode) {
  const base = PROFILES[mode] ?? PROFILES.drive;
  const url = `${base}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "DramStory/1.0 (one-off leg precompute)" } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    const route = data?.routes?.[0];
    if (data?.code !== "Ok" || !route) return { error: `OSRM code ${data?.code ?? "none"}` };
    return {
      // Matches route-geometry.ts's own rounding, so a stored leg and a
      // live-planner leg for the same pair read the same.
      minutes: Math.max(1, Math.round(route.duration / 60)),
      km: Math.round((route.distance / 1000) * 10) / 10,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

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
  if (!DRY_RUN) requireKey();
  else if (!API_KEY) {
    console.error("--dry-run still needs AIRTABLE_API_KEY to READ the Days/Day Stops tables.");
    process.exit(1);
  }

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
  let requests = 0;

  for (const day of days) {
    const name = day.fields.Name;
    if (!name) continue; // blank placeholder row
    const mode = day.fields["Travel Mode"] === "Walk" ? "walk" : "drive";

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

      if (requests > 0) await sleep(REQUEST_SPACING_MS);
      requests++;
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
    `\n${updates.length} leg(s) routed, ${firstStops} first stop(s) left blank, ${skipped.length} skipped.`
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
