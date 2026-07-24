import { notFound } from "next/navigation";
import { getLocalFeatureBySlug, getLocalFeatures } from "@/lib/data";
import ExploreFeatureClient from "./ExploreFeatureClient";

// Forced dynamic 24 July 2026 - generateStaticParams below means this
// page was silently prerendered as fully static (built once, frozen
// until the next deploy), same root cause already found and fixed on
// /distilleries, /local-features, /journal and /days (see
// docs/technical-notes.md) but never extended to this per-record detail
// route. A static page's data fetch only runs at build time regardless
// of the underlying fetch's own cache option - so any Airtable edit to
// a Local Feature record (new photos, corrected copy, reordered
// gallery, anything) stayed invisible on its live page until the next
// deploy. Caught 24 July 2026 when a Kildalton Cross gallery reorder
// didn't show up on a preview deploy built before the Airtable edit.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const features = await getLocalFeatures();
  return features.map((f) => ({ slug: f.slug }));
}

export default async function ExploreFeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = await getLocalFeatureBySlug(slug);

  if (!feature) notFound();

  return <ExploreFeatureClient feature={feature} />;
}
