import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import { getAreaBySlug, getAreas, getVisitableDistilleries, getLocalFeatures } from "@/lib/data";
import BuildAreaPageClient from "./BuildAreaPageClient";

/** Mobile's dedicated map+shortlist destination for an Area page's
 *  "Everything in {region} on the map" link - see BuildAreaPageClient's
 *  own header comment for the full story. Same shape as /dreaming/build
 *  and /today/build (11 Aug 2026). Forced dynamic for the same reason
 *  the parent /areas/[slug] page is - an Airtable edit should never wait
 *  for the next deploy to show up here either. */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const areas = await getAreas();
  return areas.map((a) => ({ slug: a.slug }));
}

export default async function BuildAreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [area, distilleries, localFeatures] = await Promise.all([
    getAreaBySlug(slug),
    getVisitableDistilleries(),
    getLocalFeatures(),
  ]);

  if (!area) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />
      <BuildAreaPageClient area={area} distilleries={distilleries} localFeatures={localFeatures} />
      <Footer />
    </div>
  );
}
