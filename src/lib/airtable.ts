// ─────────────────────────────────────────────────────────────────────────
// AIRTABLE CLIENT — thin fetch wrapper around the Airtable REST API.
// Used exclusively by src/lib/data/index.ts, per the locked data
// architecture (Distilleries, Local Features, Events -> Airtable).
//
// Required environment variables (set in Vercel -> Settings -> Environment
// Variables, and in .env.local for local dev):
//   AIRTABLE_API_KEY  - a Personal Access Token from airtable.com/create/tokens
//                        scoped to this base with data.records:read
//   AIRTABLE_BASE_ID  - the base ID, starts with "app" (found in the base's
//                        API docs / URL, e.g. app14n7N50HZGglqV)
// ─────────────────────────────────────────────────────────────────────────

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface AirtableRecord<T> {
  id: string;
  fields: T;
}

interface AirtableListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

/**
 * Fetches every record from a table, paginating automatically.
 * Table name should match the Airtable table name exactly (e.g. "Distilleries").
 */
export async function airtableFetchAll<T>(table: string): Promise<AirtableRecord<T>[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error(
      "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables. " +
        "Set these in Vercel -> Settings -> Environment Variables."
    );
  }

  const allRecords: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      // ISR, shortened 21 July 2026 (was 3600/1hr) - real incident: Port
      // Ellen and Isle of Jura were added to the Distilleries table on 9
      // and 11 July but stayed invisible on the live /distilleries page
      // for 10+ days. Root cause per docs/technical-notes.md: this Data
      // Cache entry can persist across deployments, so redeploying alone
      // didn't force a refresh, and low pre-launch traffic meant nothing
      // triggered the background revalidation either. 60s means any
      // content-editing session self-heals on the live site within a
      // minute, at the cost of one extra Airtable API call per table per
      // minute under real traffic - fine given the Team plan headroom
      // (see technical-notes.md, "Airtable API quota (historical,
      // resolved)"). Worth raising again once content stabilises post-MVP,
      // or replacing with proper on-demand revalidation (revalidateTag)
      // tied to an Airtable webhook if this keeps needing manual chasing.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable request failed for table "${table}": ${res.status} ${body}`);
    }

    const data: AirtableListResponse<T> = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}
