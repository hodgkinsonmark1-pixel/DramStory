// ─────────────────────────────────────────────────────────────────────────
// airtable.mjs — the minimal Airtable REST client the precompute scripts
// share. Extracted 17 Aug 2026 from compute-day-stop-legs.mjs when
// compute-journey-base-legs.mjs needed the identical read/patch pair.
//
// Deliberately NOT the site's own src/lib/data layer: these are one-off
// Node scripts that need raw records and WRITE access, which the site
// itself never has.
// ─────────────────────────────────────────────────────────────────────────

export const API_KEY = process.env.AIRTABLE_API_KEY;
export const BASE_ID = process.env.AIRTABLE_BASE_ID ?? "app14n7N50HZGglqV";

/** `--dry-run` routes everything and prints the table it would write,
 *  without touching Airtable. Also the way to run any of these with a
 *  read-only token — reading still needs a key either way. */
export function requireKey({ dryRun }) {
  if (API_KEY) return;
  console.error(
    dryRun
      ? "--dry-run still needs AIRTABLE_API_KEY to READ the tables."
      : "Missing AIRTABLE_API_KEY. Set it, or pass --dry-run to route without writing."
  );
  process.exit(1);
}

export async function airtableFetchAll(table) {
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

export async function airtableUpdate(table, records) {
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
