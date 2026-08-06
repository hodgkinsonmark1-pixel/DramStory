import { notFound } from "next/navigation";
import { getAreaBySlug, getAreas } from "@/lib/data";
import AreaClient from "./AreaClient";

// Forced dynamic - same fix (and same reasoning) already applied to
// /distilleries/[slug], /explore/[slug], /journal/[slug], /stays/[slug]
// and /days (see docs/technical-notes.md): generateStaticParams below
// would otherwise make this page fully static (built once, frozen until
// the next deploy), so an Airtable edit - Port Ellen's Status flipping to
// Live, a photo added, copy corrected - would stay invisible on its own
// page until the next deploy even though the index/list pages pick it up
// immediately.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const areas = await getAreas();
  return areas.map((a) => ({ slug: a.slug }));
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = await getAreaBySlug(slug);

  if (!area) notFound();

  return <AreaClient area={area} />;
}
