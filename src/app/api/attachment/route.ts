// ─────────────────────────────────────────────────────────────────────────
// ATTACHMENT PROXY — resolves a fresh Airtable attachment URL at request
// time and redirects to it.
//
// WHY THIS EXISTS: Airtable's attachment URLs (airtableusercontent.com) are
// signed and expire after a few hours. Every image on the site used to be
// baked directly into ISR-cached HTML as one of these URLs, which broke
// once the signature expired - and because ISR only regenerates a page on
// the next real visit after its revalidate window, a page nobody happens
// to visit right after expiry can sit broken indefinitely. Routing every
// image through this proxy instead means the *page* can be stale, but the
// image URL it points at (this route) always resolves the current, valid
// Airtable URL on every request.
//
// COST NOTE: this route calls the Airtable REST API, which is subject to
// Airtable's metered API call quota. This is safe on the Team plan
// (100,000 calls/month) - it was previously reverted on the Free plan
// (1,000 calls/month) because it was contributing meaningfully to
// exhausting that quota. Do not reintroduce this pattern if the workspace
// ever drops back to Free without first replacing it with the static
// /public/images/... approach discussed for the post-buildout period.
//
// Usage: /api/attachment?t=<tableId>&r=<recordId>&f=<fieldId>&i=<index>
// ─────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("t");
  const record = searchParams.get("r");
  const field = searchParams.get("f");
  const index = Number(searchParams.get("i") ?? "0");

  if (!table || !record || !field) {
    return new Response("Missing required params (t, r, f)", { status: 400 });
  }
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return new Response("Server misconfigured: missing Airtable credentials", { status: 500 });
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}/${record}?returnFieldsByFieldId=true`;
  const fetchOpts = { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } };

  // Short-lived cache on our side - Airtable's signed URLs are typically
  // valid for a couple of hours, so re-resolving every 30 min keeps us
  // comfortably inside that window without hitting the Airtable API on
  // every single image load.
  let res = await fetch(url, { ...fetchOpts, next: { revalidate: 1800 } });

  // A transient Airtable hiccup (rate limit, timeout) on the FIRST call to
  // resolve a given attachment gets cached by the line above just like a
  // success would be - so without this, one bad moment could serve a
  // broken image for up to 30 minutes to everyone, not just the one
  // unlucky request. Retry once with caching bypassed entirely so a
  // transient failure never gets stuck in the cache.
  if (!res.ok) {
    res = await fetch(url, { ...fetchOpts, cache: "no-store" });
  }

  if (!res.ok) {
    return new Response(`Airtable lookup failed: ${res.status}`, { status: 502 });
  }

  const data = await res.json();
  const attachments = data.fields?.[field];
  const attachment = Array.isArray(attachments) ? attachments[index] : undefined;

  if (!attachment?.url) {
    return new Response("Attachment not found", { status: 404 });
  }

  // 302, not 301/308 - the target URL is temporary and will change again
  // in a few hours, so this redirect itself must never be cached as
  // permanent by the browser.
  return Response.redirect(attachment.url, 302);
}
