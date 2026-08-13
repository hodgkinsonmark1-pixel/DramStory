import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getJourneyBySlug, getJourneys, getAreas } from "@/lib/data";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { PacingTag } from "@/components/PacingTag";
import AddJourneyToTripButton from "@/components/journeys/AddJourneyToTripButton";
import AddJourneyDaysButton from "@/components/journeys/AddJourneyDaysButton";
import { formatMoney } from "@/lib/day-derivations";
import {
  journeyDistilleryCount,
  journeyFullyWalkable,
  journeyThirdStat,
  journeyTourTotal,
  dayChips,
  nightNoteFor,
  nightSlotsForDay,
} from "@/lib/journey-derivations";
import type { HubDay, Journey } from "@/lib/types";

/**
 * REBUILT 13 Aug 2026 to the new hero -> claim band -> day-by-day spine
 * (with night connectors) -> sidebar layout (design doc verified against
 * Mark's mockup). Replaces the 12 Aug 2026 version (narrative day cards +
 * a single "Add this tour" button at the bottom) - that version's
 * JourneyDayDetail-per-day rendering has moved to the new /days/[slug]
 * page instead (see that file), reached from each spine card's
 * "Open the day →" link, since the full Narrative/map/transport-note
 * content no longer belongs directly on this page per the task brief.
 *
 * JUDGEMENT CALLS made this pass (flagged, none fully specified in the
 * brief):
 *  - Still renders regardless of Journey/Day Status (every real Journey
 *    is Draft as of 13 Aug 2026) - same pre-launch-review reasoning as
 *    the previous version's own doc comment, unchanged here.
 *  - Card Description is now the hero standfirst (per this pass's own
 *    spec) - Intro is no longer shown at all on this page. That's a
 *    reversal of the previous version's explicit "no duplication" call
 *    (which showed Intro, not Card Description) - this pass's brief is
 *    specific enough ("Card Description as standfirst") to treat as a
 *    deliberate replacement, not an oversight.
 *  - Getting There Note is kept (a small box under the claim band) even
 *    though the new design doc doesn't mention it - it's real logistics
 *    content with nowhere else to live, and nothing in the brief said to
 *    drop it.
 *  - Night connector placement: see nightSlotsForDay's own doc comment
 *    in journey-derivations.ts for why nights don't map 1:1 to gaps
 *    between day cards.
 *  - "Where to stay →" links to /areas/[slug] only when a real Area
 *    record's Name matches the Journey's Base (case-insensitive) - e.g.
 *    Bridgend has no Area record yet (confirmed against Airtable), so
 *    Hidden Coast/Rhinns Trail's connectors omit the link entirely
 *    rather than guessing a slug that 404s.
 *  - Chip tags: see dayChips' own doc comment in journey-derivations.ts -
 *    the specific example copy in the brief ("Driver keeps N drams" etc)
 *    doesn't exist anywhere in this codebase; built honest equivalents
 *    from real per-day fields instead.
 *  - Sidebar "Add just the days" is a new component
 *    (AddJourneyDaysButton) - neither existing Add button already drew
 *    that additive-not-destructive distinction, see its own doc comment.
 *  - Out of scope, left out entirely per the brief: per-day mini-
 *    timeline, the combined whole-route map, "Make it yours" variations.
 */

/** Same [label](url) markdown-link parsing as PhotoCredit in
 *  ExploreFeatureClient.tsx/FeaturedStayClient.tsx/AreaClient.tsx (each
 *  keeps its own copy rather than importing a shared one - following
 *  that convention here), styled to sit in the existing
 *  .journey-hero-credit slot (bottom-right of the hero). */
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

/** Renders the Claim field's markdown `**bold**` emphasis - deliberately
 *  a small local parser (bold only, not the full [label](url) link
 *  syntax used elsewhere) since Claim is a plain editorial sentence, not
 *  a narrative with internal links. */
function renderClaim(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{part}</span>;
  });
}

function DaySpineCard({ day }: { day: HubDay }) {
  const image = day.stops[0]?.distillery.image;
  const distanceOrDuration = day.distanceOnFoot || day.durationPortEllen;
  const chips = dayChips(day);

  return (
    <Link href={`/days/${day.slug}`} className="journey-day-card">
      <div className="journey-day-card-media">
        {image ? (
          <Image src={image} alt={day.stops[0].distillery.name} fill sizes="120px" style={{ objectFit: "cover" }} unoptimized />
        ) : null}
      </div>
      <div className="journey-day-card-body">
        <div className="journey-day-card-meta">
          <PacingTag pacing={day.pacing} />
          {distanceOrDuration && <span className="journey-day-card-meta-text">{distanceOrDuration}</span>}
          {day.cost && <span className="journey-day-card-meta-text">{day.cost}</span>}
        </div>
        <h3 className="journey-day-card-title">{day.name}</h3>
        {day.hook && <p className="journey-day-card-hook">{day.hook}</p>}
        {chips.length > 0 && (
          <div className="journey-day-card-chips">
            {chips.map((c) => (
              <span key={c} className="journey-chip">
                {c}
              </span>
            ))}
          </div>
        )}
        <span className="journey-day-card-link">Open the day &rarr;</span>
      </div>
    </Link>
  );
}

function NightConnector({
  journey,
  nightNumber,
  areaSlug,
}: {
  journey: Journey;
  nightNumber: number;
  areaSlug?: string;
}) {
  const note = nightNoteFor(journey, nightNumber);
  return (
    <div className="journey-night-connector">
      <span className="journey-night-connector-label">Night {nightNumber}</span>
      <span className="journey-night-connector-base">{journey.base}</span>
      {note && <span className="journey-night-connector-note">{note}</span>}
      {areaSlug && (
        <Link href={`/areas/${areaSlug}`} className="journey-night-connector-link">
          Where to stay &rarr;
        </Link>
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
    description: journey.cardDescription || journey.intro,
  };
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [journey, areas] = await Promise.all([getJourneyBySlug(slug), getAreas()]);
  if (!journey) notFound();

  const distilleryCount = journeyDistilleryCount(journey);
  const thirdStat = journeyThirdStat(journey);
  const tourTotal = journeyTourTotal(journey);
  const carHireNeeded = !journeyFullyWalkable(journey);
  const baseArea = journey.base
    ? areas.find((a) => a.name.toLowerCase() === journey.base.toLowerCase())
    : undefined;

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
            {journey.regionLabel && (
              <div style={{ fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--amber-light)", marginBottom: 10, fontWeight: 600 }}>
                {journey.regionLabel}
              </div>
            )}
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
            {journey.cardDescription && (
              <p style={{ maxWidth: 560, margin: "0 auto", opacity: 0.9, lineHeight: 1.7, color: "white" }}>
                {journey.cardDescription}
              </p>
            )}
          </div>
          {journey.heroImageCredit && <JourneyHeroCredit credit={journey.heroImageCredit} />}
        </div>
      ) : (
        // No Hero Image set in Airtable yet (true for all four Journeys as
        // of 13 Aug 2026) - graceful plain-navy fallback rather than a
        // broken/placeholder/fabricated image.
        <div style={{ background: "var(--navy)", color: "white", padding: "56px 24px", textAlign: "center" }}>
          {journey.regionLabel && (
            <div style={{ fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--amber-light)", marginBottom: 10, fontWeight: 600 }}>
              {journey.regionLabel}
            </div>
          )}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, marginBottom: 16 }}>
            {journey.name}
          </h1>
          {journey.cardDescription && (
            <p style={{ maxWidth: 560, margin: "0 auto", opacity: 0.85, lineHeight: 1.7 }}>{journey.cardDescription}</p>
          )}
        </div>
      )}

      {journey.claim && (
        <div className="journey-claim-band">
          <div className="journey-claim-inner">
            <div className="journey-claim-text">{renderClaim(journey.claim)}</div>
            <div className="journey-claim-stats">
              <div className="journey-claim-stat">
                <div className="journey-claim-stat-value">{journey.nights}</div>
                <div className="journey-claim-stat-label">{journey.nights === 1 ? "Night" : "Nights"}</div>
              </div>
              <div className="journey-claim-stat">
                <div className="journey-claim-stat-value">{distilleryCount}</div>
                <div className="journey-claim-stat-label">{distilleryCount === 1 ? "Distillery" : "Distilleries"}</div>
              </div>
              <div className="journey-claim-stat">
                <div className="journey-claim-stat-value">{thirdStat.value}</div>
                <div className="journey-claim-stat-label">{thirdStat.label}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="journey-page-layout">
        <div>
          {journey.gettingThereNote && (
            <div
              style={{
                padding: "16px 20px",
                background: "var(--cream)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--stone)",
                marginBottom: 28,
                fontSize: 14,
                color: "var(--peat)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--dark)" }}>Getting there: </strong>
              {journey.gettingThereNote}
            </div>
          )}

          {journey.days.length > 0 ? (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, marginBottom: 16 }}>
                Day by day
              </h2>
              <div className="journey-spine">
                {journey.days.map((day, i) => {
                  const nightNumbers = nightSlotsForDay(i, journey.days.length, journey.nights);
                  return (
                    <div key={day.id} style={{ marginBottom: 14 }}>
                      <DaySpineCard day={day} />
                      {nightNumbers.map((n) => (
                        <NightConnector key={n} journey={journey} nightNumber={n} areaSlug={baseArea?.slug} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
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

        {journey.days.length > 0 && (
          <div className="journey-sidebar-box">
            <div className="journey-sidebar-title">Take this Journey</div>
            <div className="journey-sidebar-row">
              <span className="journey-sidebar-row-label">Tours, total</span>
              <span className="journey-sidebar-row-value">
                {tourTotal > 0 ? `${formatMoney(tourTotal)}pp` : "Not yet priced"}
              </span>
            </div>
            <div className="journey-sidebar-row">
              <span className="journey-sidebar-row-label">Car hire</span>
              <span className="journey-sidebar-row-value">{carHireNeeded ? "Recommended" : "Not needed"}</span>
            </div>
            <div className="journey-sidebar-row">
              <span className="journey-sidebar-row-label">Nights</span>
              <span className="journey-sidebar-row-value">
                {journey.nights} in {journey.base || "your base"}
              </span>
            </div>
            <div className="journey-sidebar-actions">
              <AddJourneyToTripButton journey={journey} />
              <AddJourneyDaysButton journey={journey} />
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
