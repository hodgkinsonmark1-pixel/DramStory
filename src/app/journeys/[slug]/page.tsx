import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getJourneyBySlug,
  getJourneys,
  getAreas,
  getAllDaysAnyStatus,
  getDays,
  getFeaturedStays,
  getVisitableDistilleries,
} from "@/lib/data";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import JourneyRail from "@/components/journeys/JourneyRail";
import AddJourneyToTrips from "@/components/journeys/AddJourneyToTrips";
import SeasonalNotice from "@/components/journeys/SeasonalNotice";
import { type RouteMapStop } from "@/components/journeys/JourneyRouteMap";
import { type DayBase } from "@/lib/day-derivations";
import { formatPrice } from "@/lib/pricing";
import { stopName } from "@/lib/itinerary-stop";
import {
  dayMoneyNote,
  dayTourTotal,
  firstSentence,
  restAfterFirstSentence,
  assertNothingDropped,
  journeyAccommodationRange,
  journeyBaseFor,
  journeyCarHire,
  journeyClaimStats,
  journeyCostRows,
  journeyNightCounts,
  journeyTourFloor,
  journeyTourTotal,
  nightNoteFor,
  nightsAfterDay,
  nightsBeforeDay,
  ordinalWord,
  paceKey,
  spellCount,
  type NightSlot,
} from "@/lib/journey-derivations";
import type { HubDay, ItineraryStop, Journey, SeasonalWindow } from "@/lib/types";

/**
 * REBUILT 18 Aug 2026 to the site owner's own written build spec, which
 * supersedes the 13/17 Aug mockup this page was previously built to.
 * What changed, and why, section by section:
 *
 *  1 HERO. 330px, not 58vh. The breadcrumb is now a REAL LINK
 *    ("JOURNEYS / THE COMPLETE ISLAY") - before this the logo was the
 *    only way off the page. The standfirst has moved out of the hero and
 *    onto the page below it, which is also what pushes the claim band
 *    under the laptop fold: the band informs, it is not a hero element,
 *    and it used to sit flush against the photo pretending to be one.
 *
 *  2 DAY BY DAY. The PACE TILE IS GONE - it was built the day before
 *    this spec landed and the spec removes it explicitly. Pace is now a
 *    5px coloured strip down the card's left edge: not a tile, not a
 *    photograph, and not competing with the day's own title. Night
 *    connectors are slim text rows between cards rather than cards of
 *    their own, with a base row above night one saying once where you
 *    sleep for the whole journey. The sidebar has become a sticky rail
 *    that ends with the day list.
 *
 *  3 PRACTICAL / THE ASK / THE COST. "Before you book" is replaced by
 *    "When to come" (seasonality decides whether the journey works at
 *    all; per-tour booking facts belong on the day that needs them).
 *    ONE button, not two - two equal buttons forced a choice before
 *    anyone knew what either did - with the two alternatives demoted to
 *    text links beneath it. And a new cost block, whose whole reason for
 *    existing is that one stop can dominate a journey's tour spend and a
 *    column of stacked numbers never shows it. (The case that proved it
 *    was Port Ellen at 47% of the Grand Tour - unlinked from the journey
 *    on 30 Aug 2026, so the block's sharpest example is now Bowmore's
 *    £100 tasting at 36% of £277.50.)
 *
 *  4 WAYS OUT. "Make it yours" is now "Not quite right?" - same three
 *    Airtable cards, read as three honest reasons this journey might not
 *    suit you rather than three upsells. The heading and its count are
 *    hardcoded here and cannot be overridden from Airtable, so a row
 *    authored as an upsell ("Add X") reads against the frame it sits in.
 *    Rows belong phrased as limitations of THIS journey.
 *
 * NO MONEY FIGURE ON THIS PAGE IS TYPED. The claim band's floor, every
 * day's "starts at", every row of the proportion bar and all four
 * summary figures come from journey-derivations.ts, which sums real Tour
 * prices and real per-distillery floors. See journeyTourFloor.
 *
 * JUDGEMENT CALLS made this pass (flagged):
 *  - THE FLOOR IS COMPUTED, NOT TYPED, and it moves. When this pass
 *    landed it came out at £435.50 for The Islay Grand Tour against the
 *    £395 the spec quoted, over ten distilleries including Port Ellen at
 *    £250. Since that day was unlinked (30 Aug 2026) the same function
 *    sums nine - Ardnahoe £15, Kilchoman £18, Bunnahabhain £20, Bowmore
 *    £20, Caol Ila £21, Laphroaig £22, Lagavulin £22, Ardbeg £22.50,
 *    Bruichladdich £25 - and the page prints whatever that is today.
 *    Reporting the difference rather than reconciling it with a constant
 *    is the whole point: a typed figure would still say £435.50.
 *  - PLACEHOLDER TOURS are skipped when finding the cheapest, per the
 *    spec - and so is any tour priced at zero, which is a blank Price
 *    cell rather than a free tour (Port Ellen Open Days). See
 *    isPublishableTour.
 *  - "IT IS THE ONLY TOUR PORT ELLEN RUNS" is not what the day-five
 *    money note says. Port Ellen has four Tour records; what is true,
 *    and what it says, is that none of them is cheaper.
 *  - EVERY STOP ON THESE JOURNEYS HAS A REAL PAGE. The spec names the
 *    pool, Machir Bay, the round church and the Kildalton Cross as stops
 *    without pages that should render as plain text; all four are Local
 *    Feature records with slugs and live /explore pages (the Kildalton
 *    Cross one has a photo gallery). The RULE is implemented - a stop
 *    only links where a page really exists - but on today's data nothing
 *    exercises the plain-text branch. Worth the owner's eye.
 *  - SPECTRAL WAS NEVER LOADED. The spec asked this be checked first. It
 *    wasn't loading at all: every heading on this page was rendering in
 *    Cormorant Garamond. Spectral and Instrument Sans are now loaded in
 *    layout.tsx and scoped to this page's own classes - the brand sheet
 *    still governs the rest of the site.
 *  - Still ungated on Status, unchanged from previous passes: every
 *    Journey record is Draft and this page exists for pre-launch review.
 *  - The base pin on the map is still only drawn where the Base has a
 *    real Area record with real coordinates (Bridgend has neither).
 */

/** Same [label](url) markdown-link parsing as every other Hero Image
 *  Credit on the site (each page keeps its own copy - following that
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

/** Renders the Claim field's markdown `**bold**` emphasis. The emphasised
 *  run is coloured rather than bolded - the design's own reading of
 *  "emphasis" in a band of thin serif type. */
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

/** "Take The Islay Grand Tour" reads like a typo; "Take the Islay Grand
 *  Tour" reads like a sentence. Lower-cases a leading definite article
 *  and nothing else - the rest of the name is the record's, including
 *  its capitals. */
function inSentence(name: string): string {
  return name.replace(/^The /, "the ");
}

/** Where a stop's own page lives, or undefined when it has none.
 *
 *  A distillery always has one. A feature stop has one wherever the Day
 *  Stop resolved to a real Local Feature record - which, on the four
 *  journeys as they stand, is every single one. The undefined branch is
 *  not decoration: a Day Stop whose linked record is deleted, or a stop
 *  shape this site later adds a page for, both land there and render as
 *  plain text rather than as an underline that goes nowhere. A dead link
 *  teaches people the underlines can't be trusted. */
function stopHref(stop: ItineraryStop): string | undefined {
  if (stop.kind === "distillery") return `/distilleries/${stop.distillery.slug}`;
  return stop.feature.slug ? `/explore/${stop.feature.slug}` : undefined;
}

/** The stops row at the foot of a day card - names in visiting order,
 *  arrows between them. Reads `orderedStops`, the one list that holds
 *  distilleries and features in the single order the Day Stops table
 *  states, so the row matches the day rather than listing distilleries
 *  first and everything else after. */
function DayStopsRow({ day, journeySlug }: { day: HubDay; journeySlug: string }) {
  const stops = day.orderedStops.length > 0 ? day.orderedStops : [];
  return (
    <div className="jr-day-stops">
      <p className="jr-day-stops-list">
        {stops.map((stop, i) => {
          const href = stopHref(stop);
          const name = stopName(stop);
          return (
            <span key={`${name}-${i}`}>
              {i > 0 && <span className="jr-day-stops-arrow"> &rarr; </span>}
              {href ? (
                <Link href={href} className="jr-link">
                  {name}
                </Link>
              ) : (
                <span>{name}</span>
              )}
            </span>
          );
        })}
      </p>
      {/* ?journey= carries the base through to the day's own page - without
          it that page has no honest bed to start the clock from. */}
      <Link href={`/days/${day.slug}?journey=${journeySlug}`} className="jr-link jr-day-open">
        Open the day &rarr;
      </Link>
    </div>
  );
}

function DayCard({
  day,
  dayNumber,
  journey,
}: {
  day: HubDay;
  dayNumber: number;
  journey: Journey;
  base?: DayBase;
}) {
  const tours = dayTourTotal(day);
  const money = dayMoneyNote(day, journey.standardTourFloor);
  const pace = paceKey(day.pacing);

  return (
    // data-jr-day is what the rail's observer watches - the day number
    // and nothing else, so the rail never needs to know the day's shape.
    <article
      id={`day-${dayNumber}`}
      data-jr-day={dayNumber}
      className={`jr-day jr-day-${pace}`}
    >
      <div className="jr-day-inner">
        <div className="jr-day-head">
          <span className="jr-day-ord">{ordinalWord(dayNumber)}</span>
          {day.areaNote && <span className="jr-day-meta">{day.areaNote}</span>}
          {day.pacing && <span className={`jr-day-pace jr-pace-ink-${pace}`}>{day.pacing}</span>}
          {tours > 0 && (
            <span className="jr-day-meta">
              Today&apos;s tours <span className="jr-num-inline">{formatPrice(tours)}</span>
            </span>
          )}
          {day.transportClause && <span className="jr-day-meta">{day.transportClause}</span>}
        </div>

        <h3 className="jr-day-title">
          <Link href={`/days/${day.slug}?journey=${journey.slug}`} className="jr-link">
            {day.name}
          </Link>
        </h3>

        {day.hook && <p className="jr-day-hook">{day.hook}</p>}
        {money && <p className="jr-day-money">{money}</p>}

        <DayStopsRow day={day} journeySlug={journey.slug} />

        {/* A journey day shows its stops, so it inherits their seasonal
            notices - under the same rule as the day page (the visitor's
            own dates first, today only if they haven't given any,
            otherwise nothing at all: see seasonalNoticeFor). Under the
            stops row rather than above it, so it reads as a footnote to
            one of those names and not as a warning about the day. */}
        {seasonalStops(day).map(({ label, seasonal }, i) => (
          <SeasonalNotice key={`${label}-${i}`} seasonal={seasonal} label={label} className="jr-day-seasonal" />
        ))}
      </div>
    </article>
  );
}

/** The tours on this day that carry a seasonal window, each labelled
 *  with enough to find it in the stops row above. Whether it is actually
 *  SHOWN is not decided here - that is the visitor's own dates, in
 *  SeasonalNotice.
 *
 *  The label repeats the distillery name only when the tour's own name
 *  doesn't already carry it: "Laphroaig Experience" says where it is,
 *  "Grain to Glass Experience" does not. */
function seasonalStops(day: HubDay): { label: string; seasonal: SeasonalWindow }[] {
  return day.orderedStops.flatMap((stop) => {
    if (stop.kind !== "distillery" || !stop.tour?.seasonal) return [];
    const tourName = stop.tour.name;
    const distilleryName = stop.distillery.name;
    const label = tourName.startsWith(distilleryName) ? tourName : `${distilleryName} — ${tourName}`;
    return [{ label, seasonal: stop.tour.seasonal }];
  });
}

/** A night is a slim text row between day cards, not a card. It says the
 *  night, then the line the Journey authored for it, and nothing else -
 *  where you sleep is stated ONCE, in the base row above night one. */
function NightRow({
  journey,
  nightNumber,
  optional,
}: {
  journey: Journey;
  nightNumber: number;
  optional: boolean;
}) {
  const note = nightNoteFor(journey, nightNumber);
  return (
    <div className={optional ? "jr-night jr-night-optional" : "jr-night"}>
      <span className="jr-night-label">Night {ordinalWord(nightNumber).toLowerCase()}</span>
      {note && <p className="jr-night-note">{note}</p>}
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
  const [journey, areas, stays, allJourneys, allDays, liveDays, distilleries] = await Promise.all([
    getJourneyBySlug(slug),
    getAreas(),
    getFeaturedStays(),
    getJourneys(),
    getAllDaysAnyStatus(),
    getDays(),
    getVisitableDistilleries(),
  ]);
  if (!journey) notFound();

  // "Every one you can visit" means on ISLAY, and it means VISITABLE.
  //
  // On Islay: the Distilleries table carries one record, Isle of Jura,
  // that sits across the sound on another island with its own ferry - a
  // journey that took every Islay distillery would be lying if that
  // record made the claim unreachable, and one that skipped Jura would be
  // lying if it didn't. Region already draws that line (every Islay
  // record is "<compass> Islay" or "Port Ellen"; Jura's is "Jura").
  //
  // Visitable: this reads getVisitableDistilleries(), which is gated on
  // Open To Visitors as well as Published. So this number is the count of
  // Islay distilleries a reader can walk into, not the count of Islay
  // distilleries, which is higher - Laggan Bay and Portintruan produce
  // spirit and take no visitors, and they are excluded here whether or
  // not the site owner has published their pages. The claim band's label
  // is worded to match. This used to lean on the Published gate alone,
  // which was only true for as long as the two closed records stayed
  // unpublished; publishing them would have silently turned "eleven you
  // can visit" into thirteen minus Jura.
  const visitableIslandDistilleryCount = distilleries.filter((d) => d.region !== "Jura").length;
  const claimStats = journeyClaimStats(journey, visitableIslandDistilleryCount);
  const tourTotal = journeyTourTotal(journey);
  const tourFloor = journeyTourFloor(journey);
  const costRows = journeyCostRows(journey);
  const accommodation = journeyAccommodationRange(journey);
  const carHire = journeyCarHire(journey);
  const nightCounts = journeyNightCounts(journey);
  const optionalNights = nightCounts.total - nightCounts.priced;

  // Only a Base with a real Area record behind it gets a white map pin -
  // Bridgend has none, and estimated coordinates are not something this
  // codebase does.
  const baseArea = journey.base
    ? areas.find((a) => a.name.toLowerCase() === journey.base.toLowerCase())
    : undefined;
  const baseMarker =
    baseArea && baseArea.lat && baseArea.lng
      ? { name: baseArea.name, lat: baseArea.lat, lng: baseArea.lng }
      : undefined;

  // The Base Stay AS AUTHORED - the Featured Stay actually linked on this
  // Journey, with no name-matching involved. The fuzzy fallback below is
  // good enough to place a pin, but only an explicit link is good enough
  // to send a reader to a hotel's page under this journey's name.
  const linkedBaseStay = journey.baseStayId
    ? stays.find((stay) => stay.id === journey.baseStayId)
    : undefined;

  // WHERE THE READER GOES TO FIND A BED (29 Aug 2026). Three cases, in
  // order, and the third is still a real answer:
  //   1. the Base has an Area record  -> that area guide, as before.
  //   2. it hasn't, but the journey links a Base Stay -> that hotel's own
  //      page. Bridgend is a road junction with a hotel rather than a
  //      village, so it is deliberately not getting an Areas record, and
  //      before this the two Bridgend journeys offered no route to
  //      accommodation at all.
  //   3. neither -> no link, rather than a guessed slug.
  // The label changes with the destination: an area guide answers "where
  // to stay", a hotel page is that one building, and naming it is what
  // stops the click being a surprise.
  const stayLink = baseArea
    ? { href: `/areas/${baseArea.slug}`, label: "Where to stay" }
    : linkedBaseStay
      ? { href: `/stays/${linkedBaseStay.slug}`, label: linkedBaseStay.name }
      : undefined;

  const baseStay =
    linkedBaseStay ??
    (journey.base
      ? stays.find(
          (stay) =>
            (stay.nearestArea ?? "").toLowerCase().startsWith(journey.base.toLowerCase()) ||
            stay.name.toLowerCase().startsWith(journey.base.toLowerCase())
        )
      : undefined);
  const baseCoords =
    journey.transferOriginLat !== undefined && journey.transferOriginLng !== undefined
      ? { lat: journey.transferOriginLat, lng: journey.transferOriginLng }
      : baseStay
        ? { lat: baseStay.lat, lng: baseStay.lng }
        : baseMarker
          ? { lat: baseMarker.lat, lng: baseMarker.lng }
          : undefined;

  const routeStops: RouteMapStop[] = journey.days.flatMap((day, i) =>
    (day.mapDistilleries ?? []).map((d) => ({ ...d, dayNumber: i + 1 }))
  );

  // "Not quite right?" link-slugs point at either a real Day or a real
  // Journey - resolved against both tables here, and a card whose slug
  // matches neither is dropped rather than rendered with a link that 404s.
  const daySlugs = new Set(allDays.map((d) => d.slug));
  const journeySlugs = new Set(allJourneys.map((j) => j.slug));
  const waysOut = journey.makeItYours
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

  // Dropping a row rather than rendering a 404 is right. Dropping it
  // WITHOUT SAYING SO is what cost us a card: on 30 Aug 2026 a journey
  // was renamed, this journey's first row went on pointing at the old
  // slug, and the section quietly rendered two cards where three were
  // authored - correctly, silently, and wrongly. The count in the
  // heading comes from waysOut.length too, so even that read "two" and
  // looked deliberate. Same failure as the Accommodation Note
  // truncation: authored copy discarded with nothing on the page or in
  // the log to show it.
  if (process.env.NODE_ENV !== "production" && waysOut.length < journey.makeItYours.length) {
    const dropped = journey.makeItYours
      .filter((card) => !daySlugs.has(card.linkSlug) && !journeySlugs.has(card.linkSlug))
      .map((card) => card.linkSlug);
    console.warn(
      `[authored content] Journey "${journey.slug}" Make It Yours: ${dropped.length} row(s) ` +
        `dropped because their slug matches no live Day or Journey - ${dropped.join(", ")}. ` +
        `Fix the slug or delete the row; the section is silently shorter until you do.`
    );
  }

  // Both halves of the Accommodation Note, and a development-only check
  // that between them they account for all of it. This is the pair that
  // replaced a silent truncation - see firstSentence in
  // journey-derivations.ts for what was being dropped and why it
  // mattered.
  const baseNoteRest = journey.accommodationNote
    ? restAfterFirstSentence(journey.accommodationNote)
    : "";
  assertNothingDropped(`Journey "${journey.slug}" Accommodation Note`, journey.accommodationNote, [
    firstSentence(journey.accommodationNote ?? ""),
    baseNoteRest,
  ]);

  const nightsWord = ordinalWord(journey.nights).toLowerCase();
  // Counted, not typed: "the fifteen days" is however many Days the hub
  // actually publishes today.
  const hubDayCount = liveDays.length;

  return (
    <>
      {/* ── 1 · HERO ─────────────────────────────────────────────────── */}
      <section className="jr-hero">
        {journey.heroImage ? (
          /* `unoptimized`, as every other /api/attachment image on the
             site is: that proxy's src carries a query string, which is
             only a legal input to next/image's optimiser if declared in
             images.localPatterns - deliberately not configured here,
             because these are a redirect to a short-lived signed Airtable
             URL. Without it the whole page 500s. */
          <Image
            className="jr-hero-img"
            src={journey.heroImage}
            alt={journey.name}
            fill
            priority
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : null}
        <div className="jr-hero-overlay" />
        <SiteHeader
          transparent
          logoSize={38}
          links={[
            { href: "/#classic-journeys", label: "Journeys" },
            { href: "/days", label: "Day plans" },
            { href: "/distilleries", label: "Distilleries" },
            { href: "/journal", label: "Journal" },
            { href: "/login", label: "Account" },
          ]}
        />
        <div className="jr-hero-inner">
          {/* The way out. Until 18 Aug 2026 the logo was the only one. */}
          <nav className="jr-crumb" aria-label="Breadcrumb">
            <Link href="/#classic-journeys" className="jr-crumb-link">
              Classic journeys
            </Link>
            {journey.regionLabel && (
              <>
                <span className="jr-crumb-sep">/</span>
                <span className="jr-crumb-here">{journey.regionLabel}</span>
              </>
            )}
          </nav>
          <h1 className="jr-hero-title">{journey.name}</h1>
        </div>
        {journey.heroImageCredit && <JourneyHeroCredit credit={journey.heroImageCredit} />}
      </section>

      {/* The standfirst is out of the hero as of 18 Aug 2026. It reads
          better on the page than over a photograph, and it is what puts
          the claim band below the fold - see .jr-standfirst's own note. */}
      {(journey.intro || journey.cardDescription) && (
        <section className="jr-standfirst">
          <p>{journey.intro || journey.cardDescription}</p>
        </section>
      )}

      {/* ── CLAIM BAND ───────────────────────────────────────────────── */}
      {(journey.claim || claimStats.length > 0) && (
        <section className="jr-claim">
          <div className="jr-claim-inner">
            {journey.claim && <div className="jr-claim-text">{renderClaim(journey.claim)}</div>}
            <div className="jr-claim-stats">
              {claimStats.map((stat) => (
                <div key={stat.label} className="jr-stat">
                  <div className="jr-stat-value">{stat.value}</div>
                  <div className="jr-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 2 · DAY BY DAY ───────────────────────────────────────────── */}
      <div className="jr-main">
        <div className="jr-days">
          <div className="jr-section-head">
            <h2 className="jr-section-title">Day by day</h2>
            <div className="jr-pace-legend">
              {(["relaxed", "moderate", "packed"] as const).map((pace) => (
                <span key={pace} className="jr-pace-legend-item">
                  <span className={`jr-pace-swatch jr-pace-swatch-${pace}`} aria-hidden />
                  {pace}
                </span>
              ))}
            </div>
          </div>

          {/* THE BASE ROW. Where you sleep, said once, above the first
              night - rather than repeated on every night connector the
              way it was until 18 Aug 2026.

              30 Aug 2026: the row itself is still one line, but the rest
              of the Accommodation Note now renders UNDER it instead of
              being thrown away by firstSentence. Those notes carry real
              logistics - on the Grand Tour, the fact that the boat home
              goes from Port Askaig rather than the closed terminal in
              Port Ellen - and until today none of it reached the page.
              See firstSentence/restAfterFirstSentence for the full
              account. */}
          {journey.base && (
            <div className="jr-base-block">
              <div className="jr-base-row">
                <span className="jr-base-label">Every night</span>
                <span className="jr-base-place">{journey.base}</span>
                {journey.accommodationNote && (
                  <span className="jr-base-note">{firstSentence(journey.accommodationNote)}</span>
                )}
                {stayLink && (
                  <Link href={stayLink.href} className="jr-link jr-base-link">
                    {stayLink.label} &rarr;
                  </Link>
                )}
              </div>
              {baseNoteRest && <p className="jr-base-more">{baseNoteRest}</p>}
            </div>
          )}

          <div className="jr-spine">
            {journey.days.map((day, i) => {
              const renderNight = (slot: NightSlot) => (
                <NightRow
                  key={`night-${slot.night}`}
                  journey={journey}
                  nightNumber={slot.night}
                  optional={slot.optional}
                />
              );
              return (
                <div key={day.id}>
                  {nightsBeforeDay(i, journey.days.length, nightCounts).map(renderNight)}
                  <DayCard
                    day={day}
                    dayNumber={i + 1}
                    journey={journey}
                    base={journeyBaseFor(journey, i, baseCoords)}
                  />
                  {nightsAfterDay(i, journey.days.length, nightCounts).map(renderNight)}
                </div>
              );
            })}
          </div>
        </div>

        <JourneyRail
          stops={routeStops}
          base={baseMarker}
          routeSummary={journey.routeSummary}
          dayAreas={journey.days.map((d) => d.areaNote)}
          askHref="#jr-ask"
          askLabel={`Take ${inSentence(journey.name)} →`}
          askNote="Five minutes to read. Nothing booked, nothing paid."
        />
      </div>

      {/* ── 3 · PRACTICAL ────────────────────────────────────────────── */}
      {(journey.gettingHereRows.length > 0 || journey.whenToComeRows.length > 0) && (
        <section className="jr-wide jr-panels">
          {journey.gettingHereRows.length > 0 && (
            <div className="jr-panel">
              <h2 className="jr-panel-title">Getting here and away</h2>
              {journey.gettingHereRows.map((row) => (
                <div key={row.key} className="jr-panel-row">
                  <span className="jr-panel-row-key">{row.key}</span>
                  <span className="jr-panel-row-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}
          {/* Replaces "Before you book" (18 Aug 2026). Seasonality decides
              whether this journey works at all; which tour to book, and
              how far ahead, is a fact about a day and now lives on it. */}
          {journey.whenToComeRows.length > 0 && (
            <div className="jr-panel">
              <h2 className="jr-panel-title">When to come</h2>
              {journey.whenToComeRows.map((row) => (
                <div key={row.key} className="jr-panel-row">
                  <span className="jr-panel-row-key">{row.key}</span>
                  <span className="jr-panel-row-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── THE ASK ──────────────────────────────────────────────────── */}
      <section className="jr-wide">
        <div className="jr-ask" id="jr-ask">
          <h2 className="jr-ask-title">Take {inSentence(journey.name)}</h2>
          <p className="jr-ask-body">
            It goes into your planner as a working trip &mdash; {spellCount(journey.days.length)} days,{" "}
            {spellCount(journey.nights)} nights, every tour and every drive already in place.
          </p>
          <ul className="jr-ask-ticks">
            <li>Use it exactly as it is</li>
            <li>Or change any part of it</li>
            <li>Nothing is booked, and nothing is paid</li>
          </ul>
          <AddJourneyToTrips
            journey={journey}
            note="Free, and you can edit it after."
            deviceNote="Right now it is kept in this browser."
          />
          {/* "Take the days, not the nights" used to sit here. It was
              removed on 5 Sep 2026 because the distinction it promised did
              not exist: Journey.accommodationNote is prose on this page,
              and TripAnswers' base/nights are only ever written by
              DaysAnswersBar, so NEITHER action ever carried accommodation.
              The only real difference was that it appended rather than
              replaced - bolting five curated days onto the end of whatever
              you had, which produces an itinerary that criss-crosses the
              island. Cherry-picking single days is served properly on
              /days and the day cards. */}
          <div className="jr-ask-or">
            <span className="jr-eyebrow">Or start differently</span>
            {/* One string, built in JS rather than assembled out of JSX
                text nodes: a text node that both follows an expression
                and carries an entity loses its leading space at compile
                time, which shipped a live "fifteendays". */}
            <Link href="/days" className="jr-ask-alt">
              {`Build your own from the ${spellCount(hubDayCount)} days \u2192`}
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHAT IT COSTS ────────────────────────────────────────────── */}
      {costRows.length > 0 && (
        <section className="jr-wide jr-cost">
          <div className="jr-section-head">
            <h2 className="jr-section-title">What it costs, and where</h2>
          </div>

          {/* One stacked bar. This block exists because the biggest single
              number on the whole trip happens on one morning, and five
              figures in day order never showed that. */}
          <div className="jr-cost-bar" aria-hidden>
            {costRows.map((row) => (
              <span
                key={row.dayNumber}
                className={`jr-cost-seg jr-pace-fill-${paceKey(row.pacing)}`}
                style={{ width: `${(row.share * 100).toFixed(2)}%` }}
              />
            ))}
          </div>

          <div className="jr-cost-rows">
            {costRows.map((row) => (
              <div key={row.dayNumber} className="jr-cost-row">
                <span className={`jr-cost-swatch jr-pace-fill-${paceKey(row.pacing)}`} aria-hidden />
                <span className="jr-cost-name">{row.label}</span>
                <span className="jr-cost-note">{row.note}</span>
                <span className="jr-cost-figure">{formatPrice(row.amount)}pp</span>
              </div>
            ))}
          </div>

          <div className="jr-figures">
            <div className="jr-figure">
              <span className="jr-eyebrow">Tours, as planned</span>
              <span className="jr-figure-value">
                {formatPrice(tourTotal)}
                <span className="jr-figure-unit">pp</span>
              </span>
              <span className="jr-figure-note">
                {tourFloor.complete
                  ? `${formatPrice(tourFloor.total)}pp on standard tours`
                  : "per person"}
              </span>
            </div>

            <div className="jr-figure">
              <span className="jr-eyebrow">
                {ordinalWord(journey.nights) === `${journey.nights}`
                  ? `${journey.nights} nights`
                  : `${nightsWord} ${journey.nights === 1 ? "night" : "nights"}`}
              </span>
              <span className={accommodation ? "jr-figure-value" : "jr-figure-value jr-figure-pending"}>
                {accommodation
                  ? `${formatPrice(accommodation.low)}–${formatPrice(accommodation.high)}`
                  : "Not yet confirmed"}
              </span>
              <span className="jr-figure-note">
                {accommodation ? "for the party, off-season to peak" : "no rate sourced for this base yet"}
              </span>
            </div>

            <div className="jr-figure">
              <span className="jr-eyebrow">
                Car, {spellCount(journey.days.length)} {journey.days.length === 1 ? "day" : "days"}
              </span>
              <span
                className={carHire.kind === "priced" ? "jr-figure-value" : "jr-figure-value jr-figure-pending"}
              >
                {carHire.kind === "priced"
                  ? formatPrice(carHire.total)
                  : carHire.kind === "not-needed"
                    ? "Not needed"
                    : "Not yet confirmed"}
              </span>
              <span className="jr-figure-note">
                {carHire.kind === "priced"
                  ? "for the party"
                  : carHire.kind === "not-needed"
                    ? "every day here is walkable"
                    : "needed for this route, not yet priced"}
              </span>
            </div>

            <div className="jr-figure">
              <span className="jr-eyebrow">Not included</span>
              <span className="jr-figure-value jr-figure-none">&mdash;</span>
              <span className="jr-figure-note">
                The ferry, food, fuel
                {optionalNights === 1
                  ? `, and the optional ${ordinalWord(nightCounts.total).toLowerCase()} night`
                  : optionalNights > 1
                    ? `, and the last ${spellCount(optionalNights)} optional nights`
                    : ""}
                .
              </span>
            </div>
          </div>

          <p className="jr-cost-foot">
            Nothing here is paid to DramStory &mdash; you book each of these yourself.
          </p>
        </section>
      )}

      {/* ── 4 · WAYS OUT ─────────────────────────────────────────────── */}
      {waysOut.length > 0 && (
        <section className="jr-wide">
          <div className="jr-section-head">
            <h2 className="jr-section-title">Not quite right?</h2>
            <span className="jr-section-note">
              {spellCount(waysOut.length)} honest reasons this one might not suit you
            </span>
          </div>
          <div className="jr-ways">
            {waysOut.map((card) => (
              <div key={card.linkSlug} className="jr-way">
                <span className="jr-eyebrow">{card.eyebrow}</span>
                <h3 className="jr-way-title">
                  <Link href={card.href} className="jr-link">
                    {card.title}
                  </Link>
                </h3>
                <p className="jr-way-body">{card.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
