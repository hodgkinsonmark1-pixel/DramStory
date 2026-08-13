import Link from "next/link";
import { notFound } from "next/navigation";
import { getDays, getDayBySlug } from "@/lib/data";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import JourneyDayDetail from "@/components/journeys/JourneyDayDetail";
import { PacingTag } from "@/components/PacingTag";

/**
 * NEW 13 Aug 2026 - the per-day detail page. Didn't exist anywhere before
 * this (confirmed directly: /days was always only the Hub grid, "Read
 * more" only expanded the hook text inline, and there was no per-day
 * route). Built as part of the /journeys/[slug] rebuild so the spine's
 * "Open the day →" link has somewhere real to go - reuses
 * JourneyDayDetail (the same narrative/stops/transport-note/map template
 * /journeys/[slug] already uses per day) rather than a second hand-built
 * template, per the task brief's explicit "don't rebuild it" instruction.
 *
 * JUDGEMENT CALL: reads through getDayBySlug() (new, ungated - see its
 * own doc comment in src/lib/data/index.ts) rather than getDays()'
 * Status: Live-gated list, because a Day reachable from inside a Journey
 * can itself be Status: Draft (e.g. "The South Coast Walk"'s Day 1) -
 * gating this page the same way /days' index gates its grid would 404 a
 * day a Journey page just linked to. generateStaticParams still only
 * pre-builds the Live set (the common case); a Draft day's page still
 * renders correctly on request thanks to `dynamic = "force-dynamic"`.
 */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const days = await getDays();
  return days.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const day = await getDayBySlug(slug);
  if (!day) return {};
  return {
    title: `${day.name} | DramStory`,
    description: day.hook || day.narrative.slice(0, 150),
  };
}

export default async function DayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const day = await getDayBySlug(slug);
  if (!day) notFound();

  return (
    <>
      <PageHeader />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 12px" }}>
        <Link
          href="/days"
          style={{ fontSize: 13, color: "var(--slate)", textDecoration: "none", display: "inline-block", marginBottom: 18 }}
        >
          &larr; Back to Pre-Designed Days
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <PacingTag pacing={day.pacing} />
          {(day.distanceOnFoot || day.durationPortEllen) && (
            <span style={{ fontSize: 13, color: "var(--slate)" }}>
              {day.distanceOnFoot || day.durationPortEllen}
            </span>
          )}
        </div>

        {day.hook && (
          <p style={{ fontSize: 16, color: "var(--peat)", lineHeight: 1.6, marginBottom: 24, maxWidth: 620 }}>
            {day.hook}
          </p>
        )}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 56px" }}>
        <JourneyDayDetail day={day} />
      </div>

      <Footer />
    </>
  );
}
