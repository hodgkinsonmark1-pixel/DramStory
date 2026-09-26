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
import { baseLegsSummary, type DayBase } from "@/lib/day-derivations";
import { formatPrice } from "@/lib/pricing";
import { stopName } from "@/lib/itinerary-stop";
import {
  dayMoneyDetail,
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
 *    SUPERSEDED 26 Sep 2026: the night connectors are gone - each evening
 *    is now the "Tonight" band at the foot of the day it follows, night
 *    one is an Arrival row, and the base row moved into the rail as
 *    "Where you sleep". See DayCard.
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

/** "All four days" / "Both days" / "The day" - "All two days" is not
 *  English, and it was on the Kildalton Road's rail until 26 Sep 2026.
 *  Same branch dayMoneyNote already makes for "at both". */
function allDaysPhrase(n: number): string {
  if (n === 1) return "The day";
  if (n === 2) return "Both days";
  return `All ${spellCount(n)} days`;
}

/** The same for nights, lower-case: it sits under the base's name in the
 *  rail ("Port Ellen · all five nights"). */
function allNightsPhrase(n: number): string {
  // A blank Nights cell arrives as 0 - say nothing rather than "all zero".
  if (n < 1) return "";
  if (n === 1) return "one night";
  if (n === 2) return "both nights";
  return `all ${spellCount(n)} nights`;
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

/** A day card (redesigned 26 Sep 2026 - Option A of the day-by-day
 *  review, with the stay moved into the rail).
 *
 *  WHAT CHANGED, and why:
 *  - THE EVENING NOW BELONGS TO THE DAY IT FOLLOWS. Nights used to be
 *    slim rows BETWEEN cards, and "Night two" sat directly above Day TWO
 *    while its note described the evening after Day ONE. The night that
 *    follows a day is now the navy "Tonight" band at the foot of that
 *    day's card - so the band cannot be read as belonging to the wrong
 *    day. Night one, which comes before any day, is the Arrival row.
 *  - THE HEADER IS CHIPS. Pace, the day's tour spend, how you get about
 *    and the travel to and from the base, each in its own chip, instead
 *    of five facts in one dotted line - so day can be scanned against
 *    day.
 *  - THE PRICE IS SAID ONCE. The money note lost its lead sentence
 *    ("Today's tours cost £56pp."), which restated the chip. See
 *    dayMoneyDetail.
 *  - THE TRAVEL CHIP is new: the routed legs to and from the base were
 *    passed in as `base` and never rendered. See baseLegsSummary. */
function DayCard({
  day,
  dayNumber,
  journey,
  base,
  nights,
  nightTotal,
}: {
  day: HubDay;
  dayNumber: number;
  journey: Journey;
  base?: DayBase;
  /** The nights that follow this day - normally one, none after the last
   *  day of a journey that ends with the boat home, and more than one
   *  only where a journey offers optional extra nights at the end. */
  nights: NightSlot[];
  nightTotal: number;
}) {
  const tours = dayTourTotal(day);
  const singleTour = day.stops.filter((s) => s.tour).length === 1;
  const money = dayMoneyDetail(day, journey.standardTourFloor);
  const pace = paceKey(day.pacing);
  const legs = baseLegsSummary(base);

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
          <div className="jr-day-head-where">
            <span className="jr-day-ord">Day {ordinalWord(dayNumber).toLowerCase()}</span>
            {day.areaNote && <span className="jr-day-area">{day.areaNote}</span>}
          </div>
          <ul className="jr-day-chips" aria-label="Day at a glance">
            {day.pacing && (
              <li className={`jr-chip jr-chip-pace jr-pace-ink-${pace}`}>{day.pacing}</li>
            )}
            {tours > 0 && (
              // "pp" matters: it was in the money note's lead sentence, which
              // this chip replaced, and without it a couple can read £56 as
              // the price for both of them.
              <li className="jr-chip">
                {singleTour ? "Tour" : "Tours"} <span className="jr-num-inline">{formatPrice(tours)}</span>pp
              </li>
            )}
            {day.transportClause && <li className="jr-chip">{day.transportClause}</li>}
            {legs && (
              <li className="jr-chip">
                <svg
                  className="jr-chip-icon"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span className="sr-only">{legs.title}: </span>
                {legs.text}
              </li>
            )}
          </ul>
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

      {nights.map((slot) => (
        <TonightBand
          key={`night-${slot.night}`}
          journey={journey}
          nightNumber={slot.night}
          pricedNights={nightTotal}
          optional={slot.optional}
        />
      ))}
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

function MoonIcon() {
  return (
    <svg
      className="jr-tonight-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

/** The evening after a day, as the foot of that day's card (26 Sep
 *  2026). It says the night, where the bed is, and the line the Journey
 *  authored for it - set in the serif, because the evening is the part
 *  of the day people picture, and it used to be the smallest grey text on
 *  the page.
 *
 *  An optional night (the extra night a journey may offer instead of the
 *  boat home) keeps its note but says it is optional, rather than
 *  reading as a step. */
function TonightBand({
  journey,
  nightNumber,
  pricedNights,
  optional,
}: {
  journey: Journey;
  nightNumber: number;
  /** The denominator is the PRICED nights, the same count the rail's
   *  "all five nights" states - an optional extra night is labelled as
   *  one rather than stretching "of five" to "of six". */
  pricedNights: number;
  optional: boolean;
}) {
  const note = nightNoteFor(journey, nightNumber);
  return (
    <div className={optional ? "jr-tonight jr-tonight-optional" : "jr-tonight"}>
      <MoonIcon />
      <div className="jr-tonight-body">
        <p className="jr-tonight-head">
          <span className="jr-tonight-label">{optional ? "If you stay on" : "Tonight"}</span>
          <span className="jr-tonight-meta">
            {journey.base ? `${journey.base} · ` : ""}
            {optional ? "an optional extra night" : `night ${nightNumber} of ${pricedNights}`}
          </span>
        </p>
        {note && <p className="jr-tonight-note">{note}</p>}
      </div>
    </div>
  );
}

/** Night one - the night before any day - as a quiet row above day one.
 *  Dashed rather than a card, because nothing is planned in it. */
function ArrivalRow({
  journey,
  pricedNights,
  optional,
}: {
  journey: Journey;
  pricedNights: number;
  optional: boolean;
}) {
  const note = nightNoteFor(journey, 1);
  return (
    <div className={optional ? "jr-arrival jr-tonight-optional" : "jr-arrival"}>
      <span className="jr-arrival-label">Arrival</span>
      <span className="jr-arrival-meta">
        {optional ? "an optional night" : `night 1 of ${pricedNights}`}
      </span>
      {note && <p className="jr-arrival-note">{note}</p>}
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

          {/* THE BASE ROW that used to sit here moved into the rail on 26
              Sep 2026, as the "Where you sleep" card at its top - the rail
              is sticky, so the bed stays in view for the whole list rather
              than being said once and scrolled past. Everything the row
              carried goes with it: the Accommodation Note in full (both
              halves - see firstSentence/restAfterFirstSentence) and the
              link to the area guide or base hotel. */}

          <div className="jr-spine">
            {journey.days.map((day, i) => (
              <div key={day.id}>
                {nightsBeforeDay(i, journey.days.length, nightCounts).map((slot) => (
                  <ArrivalRow
                    key={`night-${slot.night}`}
                    journey={journey}
                    pricedNights={nightCounts.priced}
                    optional={slot.optional}
                  />
                ))}
                <DayCard
                  day={day}
                  dayNumber={i + 1}
                  journey={journey}
                  base={journeyBaseFor(journey, i, baseCoords)}
                  nights={nightsAfterDay(i, journey.days.length, nightCounts)}
                  nightTotal={nightCounts.priced}
                />
              </div>
            ))}
          </div>
        </div>

        {/* The rail's ask does the thing now rather than pointing at it
            (12 Sep 2026), so the label names the action. askHref stays
            the anchor: it is the no-JavaScript fallback, and the rail
            only intercepts the click once there is a handler to do so. */}
        <JourneyRail
          journey={journey}
          stops={routeStops}
          base={baseMarker}
          routeSummary={journey.routeSummary}
          dayAreas={journey.days.map((d) => d.areaNote)}
          askHref="#jr-ask"
          askLabel="Add this trip as is →"
          askNote={`${allDaysPhrase(journey.days.length)}, already planned. Nothing booked.`}
          stay={
            journey.base
              ? {
                  base: journey.base,
                  nightsPhrase: allNightsPhrase(journey.nights),
                  note: journey.accommodationNote ? firstSentence(journey.accommodationNote) : "",
                  noteRest: baseNoteRest,
                  guide: stayLink,
                  // Only a Base with a real Area record gets a Hotels.com
                  // search: that is the set the link builder has been
                  // checked against. A Bridgend journey keeps its link to
                  // the base hotel's own page instead.
                  searchable: !!baseArea,
                  // Where the day cards' travel times are measured from,
                  // when that is not the base itself - said once, visibly,
                  // here beside the bed (The Kildalton Road times its walks
                  // from the pathway start).
                  transferOrigin: journey.transferOriginLabel,
                }
              : undefined
          }
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
        {/* TWO COLUMNS SINCE 26 SEP 2026 (Mark). The block spans the full
            content width but its writing only reached about halfway, so
            the right half was empty navy - the largest expanse of nothing
            on the page, directly beneath the thing it is asking you to
            do. The ticks move into that space rather than the box
            shrinking: they are a list of reassurances, and a column of
            them beside the ask reads as a set of conditions rather than
            a sentence you skim past. */}
        <div className="jr-ask" id="jr-ask">
          <div className="jr-ask-main">
          <h2 className="jr-ask-title">Take {inSentence(journey.name)}</h2>
          {/* Rewritten 16 Sep 2026. The old line said it "goes into your
              planner as a working trip", which stopped being true of
              either button: taking it as it stands does not open the
              planner at all, and the alternative does. So the sentence
              now describes what you are getting rather than where it
              lands, and the two routes are named in the order the
              buttons offer them. */}
          <p className="jr-ask-body">
            Every tour and every drive already worked out, across {spellCount(journey.days.length)}{" "}
            days and {spellCount(journey.nights)} nights. Take it exactly as it stands, or open it up
            and make it yours.
          </p>
          <AddJourneyToTrips journey={journey} note="Free, and you can edit it after." />
          </div>

          <ul className="jr-ask-ticks">
            <li>Use it exactly as it is</li>
            <li>Or change any part of it</li>
            <li>Nothing is booked, and nothing is paid</li>
          </ul>

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

          {/* The key sits with the bar, not with "Day by day" hundreds of
              pixels above it (25 Sep 2026, Mark). Only the pacings this
              journey actually uses are listed - a legend showing three
              when the trip only has two is a legend that has to be
              discounted while being read. */}
          {/* Explanation left, swatches right (26 Sep 2026, Mark). Also
              the better reading order: the sentence tells you the colours
              mean something before you meet the colours. */}
          <div className="jr-cost-key">
            <span className="jr-cost-key-note">
              Colour is how hard the day works you. Width is what it costs.
            </span>
            <span className="jr-cost-key-swatches">
              {(["relaxed", "moderate", "packed"] as const)
                .filter((p) => costRows.some((row) => paceKey(row.pacing) === p))
                .map((p) => (
                  <span key={p} className="jr-cost-key-item">
                    <span className={`jr-cost-key-swatch jr-pace-fill-${p}`} aria-hidden />
                    {p}
                  </span>
                ))}
            </span>
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
