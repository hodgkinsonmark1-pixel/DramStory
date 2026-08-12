import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getJourneyBySlug, getJourneys } from "@/lib/data";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import JourneyDayDetail from "@/components/journeys/JourneyDayDetail";
import AddJourneyToTripButton from "@/components/journeys/AddJourneyToTripButton";

/**
 * REBUILT 12 Aug 2026 - now backed by Airtable's Journeys + Journey Days
 * tables (docs/technical-notes.md's dynamic + React cache() pattern,
 * same as every other Airtable-backed page) instead of the hardcoded
 * CLASSIC_JOURNEYS array in journeys-data.ts. Each day is rendered by
 * JourneyDayDetail - the shared Classic Journey day-by-day template
 * (docs/content-structure-conventions.md) - fed a real HubDay resolved
 * through Journey Days -> Days -> Day Stops, rather than a second,
 * parallel template built for this page alone.
 *
 * JUDGEMENT CALLS made building this (none were fully specified in the
 * brief - flagged here rather than buried in the diff):
 *  - Renders a Journey regardless of its own Status (every real Journey
 *    is Draft as of 12 Aug 2026) AND regardless of its linked Days'
 *    Status - "The South Coast Walk"'s Day 1 ("Two Miles Apart") is
 *    itself Status: Draft, so gating on Day Status too would silently
 *    break that journey's page. This is explicitly for Mark's own
 *    pre-launch review on a preview deployment - a real Status: Live
 *    gate belongs here once these are ready to go public, not yet.
 *  - The old page's per-day "Overnight: Port Ellen" line came from a
 *    hardcoded per-day village + lat/lng that has no equivalent in the
 *    new Days data model (no per-day accommodation coordinates exist).
 *    Rather than fabricate coordinates, that line is dropped and the
 *    Journey's own Accommodation Note is shown once, above the day
 *    list - the note that explains WHERE and WHY, without a specific
 *    coordinate. The per-day map also has no "home" pin as a result
 *    (JourneyDayMap's `base` prop is now optional) - same reasoning
 *    HubDayMap already uses on /days for the same underlying gap.
 *  - Card Description is deliberately NOT shown on this page (only
 *    Intro is) - it's the homepage card teaser, and showing both here
 *    would duplicate the same fact per this project's own "no
 *    duplication" content rule (project-conventions.md).
 *  - Dropped "needs booking" tags/notes on stops - Day Stops/Tours have
 *    no such field in the current data model (same gap flagged
 *    elsewhere for TripReview's "Still to sort" list).
 */

/** Same [label](url) markdown-link parsing as PhotoCredit in
 *  ExploreFeatureClient.tsx/FeaturedStayClient.tsx/AreaClient.tsx (each
 *  keeps its own copy rather than importing a shared one - following
 *  that convention here), styled to sit in the existing
 *  .journey-hero-credit slot (bottom-right of the hero) rather than
 *  those files' own top-right overlay treatment. */
function JourneyHeroCredit({ credit }: { credit: string }) {
  const match = credit.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const label = match ? match[1] : credit;
  const href = match ? match[2] : null;
  return (
    <div className="journey-hero-credit">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        label
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const journeys = await getJourneys();
  return journeys.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const journey = await getJourneyBySlug(slug);
  if (!journey) return {};
  return {
    title: `${journey.name} | DramStory`,
    description: journey.intro || journey.cardDescription,
  };
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = await getJourneyBySlug(slug);
  if (!journey) notFound();

  return (
    <>
      <PageHeader />

      {journey.heroImage ? (
        <div className="journey-hero">
          <Image
            className="journey-hero-img"
            src={journey.heroImage}
            alt={journey.name}
            fill
            priority
            style={{ objectFit: "cover" }}
          />
          <div className="journey-hero-overlay" />
          <div className="journey-hero-content">
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px,5vw,52px)",
                fontWeight: 300,
                marginBottom: 16,
                color: "white",
              }}
            >
              {journey.name}
            </h1>
            {journey.intro && (
              <p style={{ maxWidth: 560, margin: "0 auto", opacity: 0.9, lineHeight: 1.7, color: "white" }}>
                {journey.intro}
              </p>
            )}
          </div>
          {journey.heroImageCredit && <JourneyHeroCredit credit={journey.heroImageCredit} />}
        </div>
      ) : (
        // No Hero Image set in Airtable yet (true for all four Journeys
        // as of 12 Aug 2026) - graceful plain-navy fallback rather than a
        // broken/placeholder image, same fallback the old hardcoded page
        // already used for a journey with no heroImage.
        <div style={{ background: "var(--navy)", color: "white", padding: "56px 24px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, marginBottom: 16 }}>
            {journey.name}
          </h1>
          {journey.intro && (
            <p style={{ maxWidth: 560, margin: "0 auto", opacity: 0.85, lineHeight: 1.7 }}>{journey.intro}</p>
          )}
        </div>
      )}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {journey.gettingThereNote && (
          <div
            style={{
              padding: "16px 20px",
              background: "var(--cream)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--stone)",
              marginBottom: 24,
              fontSize: 14,
              color: "var(--peat)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--dark)" }}>Getting there: </strong>
            {journey.gettingThereNote}
          </div>
        )}

        {journey.days.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, marginBottom: 8 }}>
              Day by day
            </h2>
            {journey.accommodationNote && (
              <p style={{ fontSize: 14, color: "var(--peat)", lineHeight: 1.6, marginBottom: 24 }}>
                {journey.accommodationNote}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {journey.days.map((day, i) => (
                <JourneyDayDetail key={day.id} day={day} dayNumber={i + 1} />
              ))}
            </div>
          </>
        )}

        {journey.days.length > 0 ? (
          <AddJourneyToTripButton journey={journey} />
        ) : (
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: "var(--navy)",
              color: "white",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Start planning this route &rarr;
          </Link>
        )}
      </div>

      <Footer />
    </>
  );
}
