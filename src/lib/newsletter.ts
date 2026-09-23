import type { AirtableRecord } from "@/lib/airtable";

/**
 * The Subscribers table, and the rules that make it a consent record
 * rather than a mailing list (21 Sep 2026).
 *
 * WHY THIS IS NOT IN src/lib/airtable.ts. That module reads content -
 * distilleries, days, journeys - and is called at render time from server
 * components. This writes personal data on a visitor's instruction, from
 * API routes only. Different job, different blast radius, kept apart on
 * purpose: nothing that renders a page should be able to reach these
 * functions by accident.
 *
 * THE ONE RULE THAT MATTERS. A row is created the instant somebody types
 * an address into the footer, and that row is NOT consent. Anyone can
 * type anyone's address. Consent is the click on the link in the
 * confirmation email, and the only evidence of it is `Confirmed At`.
 * A Pending row must never be sent anything except that one confirmation.
 *
 * WHY UNSUBSCRIBED ROWS ARE KEPT. Deleting the row would mean a later
 * accidental re-add looks like a fresh signup and gets mailed again. The
 * row stays, its status changes, and re-subscribing has to go through the
 * confirmation email like anyone else.
 */

const TABLE = "Subscribers";

/** Field names, not IDs. Names are what the Airtable UI shows Mark, so a
 *  rename there breaks loudly here rather than silently writing nothing. */
export interface SubscriberFields {
  Email?: string;
  Status?: "Pending" | "Confirmed" | "Unsubscribed";
  Token?: string;
  "Requested At"?: string;
  "Confirmed At"?: string;
  "Unsubscribed At"?: string;
  Source?: string;
}

export type SubscriberRecord = AirtableRecord<SubscriberFields>;

function config() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) return null;
  return { key, base };
}

async function airtable(path: string, init?: RequestInit) {
  const cfg = config();
  if (!cfg) throw new Error("newsletter: AIRTABLE_API_KEY or AIRTABLE_BASE_ID is not set");

  const res = await fetch(`https://api.airtable.com/v0/${cfg.base}/${encodeURIComponent(TABLE)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    /* 403 here almost always means one thing, and it is worth saying so
       rather than making the next person read Airtable's docs: the rest
       of this site only ever READS Airtable, so the personal access
       token was very likely scoped to data.records:read alone. The
       newsletter is the first thing that writes. */
    const hint =
      res.status === 403
        ? " - if this is a 403, check the Airtable token has data.records:write on this base, not just read"
        : "";
    throw new Error(`newsletter: Airtable ${res.status} on ${path}${hint} ${body}`);
  }

  return res.json();
}

/** Unguessable, URL-safe, and the only thing standing between a stranger
 *  and someone else's subscription. 32 bytes from the platform CSPRNG -
 *  never Math.random, which is seeded predictably and is not a secret. */
export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Airtable's filterByFormula is a string language, so anything
 *  interpolated into it has to be escaped or it is an injection hole.
 *  Single quotes are the only metacharacter that matters inside a quoted
 *  literal; backslash escapes it. */
function quote(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export async function findByEmail(email: string): Promise<SubscriberRecord | null> {
  const formula = `LOWER({Email}) = ${quote(email.toLowerCase())}`;
  const data = await airtable(`?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`);
  return (data.records?.[0] as SubscriberRecord) ?? null;
}

export async function findByToken(token: string): Promise<SubscriberRecord | null> {
  /* An empty token must never match. Confirmed rows have their token
     rotated and unsubscribed rows have it cleared, so without this guard
     a request with no token at all would match the first such row and
     unsubscribe a stranger. */
  if (!token) return null;
  const formula = `{Token} = ${quote(token)}`;
  const data = await airtable(`?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`);
  return (data.records?.[0] as SubscriberRecord) ?? null;
}

export async function createPending(email: string, token: string, source: string) {
  return airtable("", {
    method: "POST",
    body: JSON.stringify({
      records: [
        {
          fields: {
            Email: email.toLowerCase(),
            Status: "Pending",
            Token: token,
            "Requested At": new Date().toISOString(),
            Source: source,
          } satisfies SubscriberFields,
        },
      ],
    }),
  });
}

export async function updateSubscriber(id: string, fields: SubscriberFields) {
  return airtable("", {
    method: "PATCH",
    body: JSON.stringify({ records: [{ id, fields }] }),
  });
}

/** Deliberately permissive. The confirmation email is the real check - an
 *  address that does not exist never confirms, so it never becomes a
 *  subscriber. This only catches obvious nonsense before we spend an
 *  Airtable write and a Resend send on it. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}
