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
      // UPDATE 21 July 2026 (same day, later): shortening revalidate to 60s
      // (previous comment/attempt, still visible in git history) did NOT
      // fix the real incident it was meant to - Port Ellen and Isle of
      // Jura stayed invisible on the live /distilleries page even 3+
      // minutes and a fresh deploy after that change shipped. Confirmed
      // this is the Vercel Data Cache "persists across deployments" gotcha
      // biting harder than expected: an already-stale cached entry doesn't
      // get bypassed just because the code now asks for a shorter window -
      // whatever created that entry is what governs it until something
      // actually forces a bypass. No CLI/API access available in this
      // session to directly purge the Vercel Data Cache by tag (would need
      // `vercel cache invalidate`, which needs an interactive login, or a
      // revalidateTag route gated by a new secret env var).
      //
      // Switched to cache: "no-store" instead - every request hits
      // Airtable live, no Data Cache involved at all, so this class of bug
      // can't recur. Fine for now: low pre-launch traffic, and Airtable
      // quota headroom is already resolved (Team plan - see "Airtable API
      // quota (historical, resolved)" further down this file). Worth
      // reintroducing real caching (with proper on-demand revalidation via
      // revalidateTag tied to an Airtable webhook, rather than a bare
      // time-based window) once traffic actually makes the extra Airtable
      // calls worth optimising away.
      cache: "no-store",
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
