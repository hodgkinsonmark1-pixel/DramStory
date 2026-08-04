import { notFound } from "next/navigation";
import { getFeaturedStayBySlug, getFeaturedStays } from "@/lib/data";
import FeaturedStayClient from "./FeaturedStayClient";

// Forced dynamic - same fix (and same reasoning) already applied to
// /distilleries/[slug], /explore/[slug], /journal/[slug] and /days (see
// docs/technical-notes.md): generateStaticParams below would otherwise
// make this page fully static (built once, frozen until the next deploy),
// so an Airtable edit - the Machrie's Status flipping to Live, a photo
// added, copy corrected - would stay invisible on its own page until the
// next deploy even though the index/list pages pick it up immediately.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const stays = await getFeaturedStays();
  return stays.map((s) => ({ slug: s.slug }));
}

export default async function FeaturedStayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stay = await getFeaturedStayBySlug(slug);

  if (!stay) notFound();

  return <FeaturedStayClient stay={stay} />;
}
