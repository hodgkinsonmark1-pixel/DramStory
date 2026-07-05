import { notFound } from "next/navigation";
import { getDistilleries, getDistilleryBySlug } from "@/lib/data";
import DistilleryPageClient from "./DistilleryPageClient";

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
