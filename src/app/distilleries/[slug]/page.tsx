import { notFound } from "next/navigation";
import { getDistilleries, getDistilleryBySlug } from "@/lib/data";
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
  const [distillery, allDistilleries] = await Promise.all([
    getDistilleryBySlug(slug),
    getDistilleries(),
  ]);

  if (!distillery) notFound();

  const nextStops = distillery.nextStops
    .map((s) => allDistilleries.find((d) => d.slug === s))
    .filter((d): d is NonNullable<typeof d> => !!d);

  return <DistilleryPageClient distillery={distillery} nextStops={nextStops} />;
}
