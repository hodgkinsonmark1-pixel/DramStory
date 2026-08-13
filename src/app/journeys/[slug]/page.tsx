import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getJourneyBySlug, getJourneys, getAreas, getAllDaysAnyStatus } from "@/lib/data";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { PacingTag } from "@/components/PacingTag";
import AddJourneyToTripButton from "@/components/journeys/AddJourneyToTripButton";
import AddJourneyDaysButton from "@/components/journeys/AddJourneyDaysButton";
import JourneyRouteMap, { type RouteMapStop } from "@/components/journeys/JourneyRouteMap";
import { formatMoney } from "@/lib/day-derivations";
import {
  dayChips,
  dayTourTotal,
  journeyDistilleryCount,
  journeyDistilleryStatLabel,
  journeyFullyWalkable,
  journeyNightsStatLabel,
  journeyThirdStat,
  journeyTourTotal,
  nightNoteFor,
  nightSlotsForDay,
  ordinalWord,
  splitFinalSentence,
} from "@/lib/journey-derivations";
import type { HubDay, Journey } from "@/lib/types";

/**
 * REBUILT AGAIN 13 Aug 2026, to Mark's own design mockup this time: hero
 * -> flush claim band -> two columns (day-by-day spine with night
 * connectors | route map + CTA box) -> "Make it yours" -> "Getting here
 * and away" / "Before you book".
 *
 * The pass before this one had the right DATA but the wrong LAYOUT (a
 * plain stacked list of cards, stats as three equal pills, sidebar with
 * no map, no timeline strip, no variation cards, a stray "Getting there:"
 * paragraph at the top). Everything structural here is rebuilt to the
 * mockup; the derivations, night-slot placement, chip logic and the
 * /days/[slug] target of "Open the day" are all kept from that pass.
 *
 * All colour/radii/shadow come from the :root tokens in
 * dramstory-legacy.css (docs/hero-handoff.md section 5) - the page's own
 * classes live in journey-extra.css under the `jr-` prefix, and this file
 * carries no literal hexes and (unlike the previous version) almost no
 * inline styling.
 *
 * JUDGEMENT CALLS made this pass (flagged):
 *  - Still ungated on Status: every Journey and several of their Days are
 *    Draft, and this page exists for Mark's pre-launch review. Unchanged
 *    from the previous pass's reasoning.
 *  - Hero Image is empty on all four Journeys, so the hero renders its
 *    navy/gradient treatment with no photo rather than a placeholder.
 *  - The base pin on the route map is drawn only when the Journey's Base
 *    has a real Area record with real coordinates. Bridgend does not, so
 *    Rhinns Trail/Hidden Coast get no white pin and their map caption
 *    drops the "bed marked white" half rather than pointing at a pin
 *    that isn't there. Same rule already governs "Where to stay ->".
 *  - "Car hire: Not needed" is rendered in --green-light on the CTA box's
 *    --green-deep background - the one sanctioned green pairing in this
 *    system (docs/hero-handoff.md section 5 is explicit that no other
 *    green may be introduced, and --green-deep is the navy the box is
 *    already painted in).
 *  - The old "Getting there:" paragraph is gone, replaced by the Getting
 *    Here Rows panel at the foot, per the brief.
 *  - The hero standfirst is Intro (the short single-sentence standfirst),
 *    falling back to Card Description when Intro is empty. Card
 *    Description is the homepage teaser and was duplicating the opening
 *    of the Claim band directly below the hero.
 */

/** Same [label](url) markdown-link parsing as PhotoCredit in
 *  ExploreFeatureClient.tsx/FeaturedStayClient.tsx/AreaClient.tsx (each
 *  keeps its own copy rather than importing a shared one - following that
 *  convention here). */
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

/** Renders the Claim field's markdown `**bold**` emphasis. Deliberately a
 *  small local parser (bold only, not the [label](url) syntax used
 *  elsewhere) since Claim is a single editorial sentence. The emphasised
 *  run is coloured copper/amber by CSS rather than bolded - that's the
 *  design's own reading of "emphasis" in a band of thin serif type. */
function renderClaim(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return m ? (
      <em key={i} className="jr-claim-em">
        {m[1]}
      </em>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

/** The compact "THE DAY" strip - one horizontal run of the Day Timeline
 *  segments, arrows between them. Timed segments show the time dark and
 *  its label grey; untimed connectors ("40 min walk") are muted
 *  throughout. Wraps rather than scrolls on narrow widths. */
function DayTimelineStrip({ day }: { day: HubDay }) {
  if (day.timeline.length === 0) return null;
  return (
    <div className="jr-day-timeline">
      <span className="jr-eyebrow jr-day-timeline-label">The day</span>
      <div className="jr-day-timeline-row">
        {day.timeline.map((seg, i) => (
          <span key={i} className="jr-timeline-seg-wrap">
            {i > 0 && <span className="jr-timeline-arrow">&rarr;</span>}
            {seg.time ? (
              <span className="jr-timeline-seg">
                <span className="jr-timeline-time">{seg.time}</span>
                {seg.label && <span className="jr-timeline-label"> {seg.label}</span>}
              </span>
            ) : (
              <span className="jr-timeline-connector">{seg.label}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function DaySpineCard({ day }: { day: HubDay }) {
  const image = day.stops[0]?.distillery.image;
  const distanceOrDuration = day.distanceOnFoot || day.durationPortEllen;
  const tours = dayTourTotal(day);
  const chips = dayChips(day);

  return (
    <article className="jr-day-card">
      <div className="jr-day-card-top">
        <div className="jr-day-card-media">
          {image ? (
            <Image
              src={image}
              alt={day.stops[0].distillery.name}
              fill
              sizes="180px"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          ) : null}
        </div>
        <div className="jr-day-card-content">
          <div className="jr-day-card-meta">
            <PacingTag pacing={day.pacing} />
            {distanceOrDuration && <span className="jr-day-card-meta-text">&middot; {distanceOrDuration}</span>}
            {tours > 0 && <span className="jr-day-card-meta-text">&middot; {formatMoney(tours)}pp in tours</span>}
          </div>
          <h3 className="jr-day-card-title">{day.name}</h3>
          {day.hook && <p className="jr-day-card-hook">{day.hook}</p>}
          <div className="jr-day-card-foot">
            <div className="jr-chips">
              {chips.map((c) => (
                <span key={c} className="jr-chip">
                  {c}
                </span>
              ))}
            </div>
            <Link href={`/days/${day.slug}`} className="jr-day-open">
              Open the day &rarr;
            </Link>
          </div>
        </div>
      </div>
      <DayTimelineStrip day={day} />
    </article>
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
  const { lead, last } = splitFinalSentence(note);
  // One label, one case: the whole string ("night one" ... "night six")
  // enters the DOM lower-case and .jr-night-label uppercases it, so the
  // word and its ordinal can never render in clashing cases.
  const nightLabel = `Night ${ordinalWord(nightNumber)}`.toLowerCase();
  return (
    <div className="jr-night-card">
      <div className="jr-night-when">
        <span className="jr-eyebrow jr-night-label">{nightLabel}</span>
        {journey.base && <span className="jr-night-base">{journey.base}</span>}
      </div>
      {note && (
        <p className="jr-night-note">
          {lead}
          {last && <strong>{last}</strong>}
        </p>
      )}
      {areaSlug && (
        <Link href={`/areas/${areaSlug}`} className="jr-night-link">
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
    description: journey.intro || journey.cardDescription,
  };
}

export default async function JourneyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [journey, areas, allJourneys, allDays] = await Promise.all([
    getJourneyBySlug(slug),
    getAreas(),
    getJourneys(),
    getAllDaysAnyStatus(),
  ]);
  if (!journey) notFound();

  const distilleryCount = journeyDistilleryCount(journey);
  const thirdStat = journeyThirdStat(journey);
  const tourTotal = journeyTourTotal(journey);
  const fullyWalkable = journeyFullyWalkable(journey);

  // Only a Base with a real Area record behind it gets a "Where to stay"
  // link or a white map pin - Bridgend has neither (confirmed against
  // Airtable), and neither a guessed slug nor estimated coordinates is
  // something this codebase does.
  const baseArea = journey.base
    ? areas.find((a) => a.name.toLowerCase() === journey.base.toLowerCase())
    : undefined;
  const baseMarker =
    baseArea && baseArea.lat && baseArea.lng
      ? { name: baseArea.name, lat: baseArea.lat, lng: baseArea.lng }
      : undefined;

  const routeStops: RouteMapStop[] = journey.days.flatMap((day, i) =>
    (day.mapDistilleries ?? []).map((d) => ({ ...d, dayNumber: i + 1 }))
  );

  // "Make it yours" link-slugs point at either a real Day or a real
  // Journey - resolved against both tables here (the parser can't know
  // which), and a card whose slug matches neither is dropped rather than
  // rendered with a link that 404s.
  const daySlugs = new Set(allDays.map((d) => d.slug));
  const journeySlugs = new Set(allJourneys.map((j) => j.slug));
  const variations = journey.makeItYours
    .map((card) => {
      if (daySlugs.has(card.linkSlug)) {
        return { ...card, href: `/days/${card.linkSlug}`, linkLabel: "See the day" };
      }
      if (journeySlugs.has(card.linkSlug)) {
        return { ...card, href: `/journeys/${card.linkSlug}`, linkLabel: "See the journey" };
      }
      return null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const accommodationTotal =
    journey.accommodationFromPerNight !== undefined && journey.nights > 0
      ? journey.accommodationFromPerNight * journey.nights
      : undefined;

  return (
    <>
      <section className="jr-hero">
        {journey.heroImage ? (
          <Image
            className="jr-hero-img"
            src={journey.heroImage}
            alt={journey.name}
            fill
            priority
            style={{ objectFit: "cover" }}
          />
        ) : null}
        <div className="jr-hero-overlay" />
        <SiteHeader transparent logoSize={38} />
        <div className="jr-hero-inner">
          <div className="jr-hero-kicker">
            Classic Journey{journey.regionLabel ? ` · ${journey.regionLabel}` : ""}
          </div>
          <h1 className="jr-hero-title">{journey.name}</h1>
          {(journey.intro || journey.cardDescription) && (
            <p className="jr-hero-standfirst">{journey.intro || journey.cardDescription}</p>
          )}
        </div>
        {journey.heroImageCredit && <JourneyHeroCredit credit={journey.heroImageCredit} />}
      </section>

      {journey.claim && (
        <section className="jr-claim">
          <div className="jr-claim-inner">
            <div className="jr-claim-text">{renderClaim(journey.claim)}</div>
            <div className="jr-claim-stats">
              <div className="jr-stat">
                <div className="jr-stat-value">{journey.nights}</div>
                <div className="jr-stat-label">{journeyNightsStatLabel(journey)}</div>
              </div>
              <div className="jr-stat">
                <div className="jr-stat-value">{distilleryCount}</div>
                <div className="jr-stat-label">{journeyDistilleryStatLabel(journey)}</div>
              </div>
              <div className="jr-stat">
                <div className="jr-stat-value">{thirdStat.value}</div>
                <div className="jr-stat-label">{thirdStat.label}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="jr-main">
        <div className="jr-col-main">
          <div className="jr-section-head">
            <h2 className="jr-section-title">Day by day</h2>
            <span className="jr-section-note">Each day has its own page &mdash; nothing here is journey-only</span>
          </div>

          <div className="jr-spine">
            {journey.days.map((day, i) => {
              const nightNumbers = nightSlotsForDay(i, journey.days.length, journey.nights);
              return (
                <div key={day.id}>
                  <div className="jr-spine-item">
                    <span className="jr-spine-marker jr-spine-marker-day">{i + 1}</span>
                    <DaySpineCard day={day} />
                  </div>
                  {nightNumbers.map((n) => (
                    <div key={n} className="jr-spine-item">
                      <span className="jr-spine-marker jr-spine-marker-night" aria-hidden>
                        &#9790;
                      </span>
                      <NightConnector journey={journey} nightNumber={n} areaSlug={baseArea?.slug} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="jr-col-side">
          <div className="jr-card jr-map-card">
            <div className="jr-map-holder">
              <JourneyRouteMap stops={routeStops} base={baseMarker} />
              <span className="jr-map-caption">the route{baseMarker ? " · bed marked white" : ""}</span>
            </div>
            {journey.routeSummary && (
              <div className="jr-map-body">
                <span className="jr-eyebrow">The whole route</span>
                <p className="jr-map-summary">{journey.routeSummary}</p>
              </div>
            )}
          </div>

          <div className="jr-cta">
            <span className="jr-cta-eyebrow">Take this journey</span>
            <div className="jr-cta-row">
              <span className="jr-cta-label">Tours</span>
              <span className="jr-cta-value">
                {tourTotal > 0 ? `${formatMoney(tourTotal)}pp` : "Not yet priced"}
              </span>
            </div>
            <div className="jr-cta-row">
              <span className="jr-cta-label">
                {journey.nights} {journey.nights === 1 ? "night" : "nights"}, from
              </span>
              {/* Accommodation From (per night) is deliberately blank on
                  every Journey - no real room rate has been sourced, so
                  this stays a pending state rather than a made-up total. */}
              <span className={accommodationTotal !== undefined ? "jr-cta-value" : "jr-cta-value jr-cta-pending"}>
                {accommodationTotal !== undefined ? formatMoney(accommodationTotal) : "Not yet confirmed"}
              </span>
            </div>
            <div className="jr-cta-row">
              <span className="jr-cta-label">Car hire</span>
              <span className={fullyWalkable ? "jr-cta-value jr-cta-value-good" : "jr-cta-value"}>
                {fullyWalkable ? "Not needed" : "Recommended"}
              </span>
            </div>
            <div className="jr-cta-actions">
              <AddJourneyToTripButton journey={journey} />
              <AddJourneyDaysButton journey={journey} />
            </div>
            <p className="jr-cta-help">
              Starting it as a trip copies every day and every night into your planner, where you can move things.
            </p>
          </div>
        </aside>
      </div>

      {variations.length > 0 && (
        <section className="jr-wide">
          <div className="jr-section-head">
            <h2 className="jr-section-title">Make it yours</h2>
            <span className="jr-section-note">
              Nobody takes a journey exactly as written &mdash; say so, and show the seams
            </span>
          </div>
          <div className="jr-variations">
            {variations.map((card) => (
              <div key={card.linkSlug} className="jr-card jr-variation">
                <span className="jr-eyebrow jr-eyebrow-copper">{card.eyebrow}</span>
                <h3 className="jr-variation-title">{card.title}</h3>
                <p className="jr-variation-body">{card.body}</p>
                <Link href={card.href} className="jr-variation-link">
                  {card.linkLabel} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {(journey.gettingHereRows.length > 0 || journey.beforeYouBookRows.length > 0) && (
        <section className="jr-wide jr-panels">
          {journey.gettingHereRows.length > 0 && (
            <div className="jr-card jr-panel jr-panel-a">
              <h2 className="jr-panel-title">Getting here and away</h2>
              {journey.gettingHereRows.map((row) => (
                <div key={row.key} className="jr-panel-row">
                  <span className="jr-panel-row-key">{row.key}</span>
                  <span className="jr-panel-row-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}
          {journey.beforeYouBookRows.length > 0 && (
            <div className="jr-card jr-panel jr-panel-b">
              <h2 className="jr-panel-title">Before you book</h2>
              {journey.beforeYouBookRows.map((row) => (
                <div key={row.key} className="jr-panel-row">
                  <span className="jr-panel-row-key">{row.key}</span>
                  <span className="jr-panel-row-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Footer />
    </>
  );
}
