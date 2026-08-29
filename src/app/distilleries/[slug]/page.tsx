import { notFound } from "next/navigation";
import { getDistilleries, getVisitableDistilleries, getDistilleryBySlug } from "@/lib/data";
import DistilleryPageClient from "./DistilleryPageClient";

// Forced dynamic 24 July 2026 - same fix as /explore/[slug], same day:
// generateStaticParams below made this page fully static (built once,
// frozen until the next deploy), the same root cause already found and
// fixed on /distilleries, /local-features, /journal and /days (see
// docs/technical-notes.md) but never extended to this per-record detail
// route. Any Airtable edit to a Distillery record (Silent Season notice,
// tour changes, corrected copy) stayed invisible on its own live page
// until the next deploy, even though the index page picked it up
// immediately.
export const dynamic = "force-dynamic";

// Every PUBLISHED distillery gets a page, visitable or not - a
// producing distillery with no visitor centre still has a story, a status
// notice and a map position, and the not-yet-open variant of this
// template exists precisely so it can have one. getDistilleries(), not
// getVisitableDistilleries().
export async function generateStaticParams() {
  const distilleries = await getDistilleries();
  return distilleries.map((d) => ({ slug: d.slug }));
}

export default async function DistilleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [distillery, visitableDistilleries] = await Promise.all([
    getDistilleryBySlug(slug),
    // Resolved against the VISITABLE list on purpose: nextStops is
    // already derived from visitable candidates only (see
    // fetchDistilleriesFromAirtable), and looking the slugs back up in
    // the same set means a stale or hand-edited slug still cannot surface
    // a distillery nobody can walk into under "Suggested next stops".
    getVisitableDistilleries(),
  ]);

  if (!distillery) notFound();

  const nextStops = distillery.nextStops
    .map((s) => visitableDistilleries.find((d) => d.slug === s))
    .filter((d): d is NonNullable<typeof d> => !!d);

  return <DistilleryPageClient distillery={distillery} nextStops={nextStops} />;
}
