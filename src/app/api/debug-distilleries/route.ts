import { NextResponse } from "next/server";
import { airtableFetchAll } from "@/lib/airtable";

// TEMPORARY diagnostic route - 21 July 2026. Added while investigating why
// /distilleries (a static page, prerendered once at build time) keeps
// showing 9 distilleries instead of the 11 real, populated records
// confirmed directly in Airtable (Port Ellen, Isle of Jura missing).
// Two attempted fixes (shortening next.revalidate, then cache: "no-store")
// on the underlying fetch made no difference, which rules out the Data
// Cache as the cause - a static page's data fetch only ever runs once, at
// build time, regardless of the fetch's own cache option. This route is a
// dynamic (always-live, never statically rendered) way to see exactly what
// Vercel's configured Airtable credentials return RIGHT NOW, independent
// of any static generation timing. Delete once the root cause is found and
// fixed - not meant to stay in the codebase long-term.
export async function GET() {
  try {
    const records = await airtableFetchAll<{ Name?: string; Slug?: string; Status?: { name: string } }>(
      "Distilleries"
    );
    const populated = records.filter((r) => r.fields.Name && r.fields.Slug);
    return NextResponse.json({
      totalRecordsReturned: records.length,
      populatedCount: populated.length,
      populatedNames: populated.map((r) => r.fields.Name),
      hasPortEllen: populated.some((r) => r.fields.Name === "Port Ellen"),
      hasIsleOfJura: populated.some((r) => r.fields.Name === "Isle of Jura"),
      envBaseIdSuffix: (process.env.AIRTABLE_BASE_ID ?? "").slice(-6),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
