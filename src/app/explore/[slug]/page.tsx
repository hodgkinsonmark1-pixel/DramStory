import { notFound } from "next/navigation";
import { getLocalFeatureBySlug, getLocalFeatures } from "@/lib/data";
import ExploreFeatureClient from "./ExploreFeatureClient";

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
