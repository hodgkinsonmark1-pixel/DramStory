import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getJourneyBySlug, getJourneys, getAreas, getAllDaysAnyStatus, getFeaturedStays } from "@/lib/data";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { PacingTag } from "@/components/PacingTag";
import AddJourneyToTripButton from "@/components/journeys/AddJourneyToTripButton";
import AddJourneyDaysButton from "@/components/journeys/AddJourneyDaysButton";
import JourneyRouteMap, { type RouteMapStop } from "@/components/journeys/JourneyRouteMap";
import {
  formatClockTime,
  formatMoney,
  MEANINGFUL_GAP_MINUTES,
  paceTone,
  scheduleForHubDay,
  scheduleWarningLine,
  spellGapMinutes,
  walkingLineFor,
  walkingOriginNote,
  type DayBase,
} from "@/lib/day-derivations";
import { stopName } from "@/lib/itinerary-stop";
import {
  dayChips,
  dayTourTotal,
  journeyAccommodationRange,
  journeyBaseFor,
  journeyCarHire,
  journeyDistilleryCount,
  journeyDistilleryStatLabel,
  journeyNightCounts,
  journeyNightsStatLabel,
  journeyThirdStat,
  journeyTourTotal,
  nightNoteFor,
  nightsAfterDay,
  nightsBeforeDay,
  ordinalWord,
  splitFinalSentence,
  splitTileCaption,
  type NightSlot,
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
 *  - Hero Image was empty on all four Journeys when this was written, so
 *    the hero renders its navy/gradient treatment with no photo rather
 *    than a placeholder. It is no longer empty (17 Aug 2026) - and the
 *    branch that had never once run turned out to be the one thing on
 *    this page that could throw. See the <Image> itself.
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
 *  - NIGHT PLACEMENT is the structure Mark defined: night one before
 *    day one (the arrival night), a night after every day but the last,
 *    and any night past that after the last day. A night beyond the
 *    Journey's `Nights` - the count of PRICED nights - renders as
 *    optional and is left out of both the sidebar's accommodation range
 *    and the claim band's stat. The Grand Tour offers six nights and
 *    prices five. See journeyNightCounts/nightsAfterDay.
 *  - DAY CARD IMAGERY is gone (17 Aug 2026). The card's left column is
 *    the pace tile, always - not a fallback for a missing photograph.
 *    The first linked distillery's Hero Image used to fill it, which
 *    said only which distillery came first and repeated across days
 *    that share one. See DayPaceTile.
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

/** The compact "THE DAY" strip - one horizontal run of this Day's stops
 *  with their arrival times, arrows between them. Wraps rather than
 *  scrolls on narrow widths.
 *
 *  REWIRED 16 Aug 2026: these times used to come from a hand-written
 *  `Day Timeline` field in Airtable, entirely independent of the
 *  schedule the day screen computed - so the same Day could (and did)
 *  advertise 09:30 here and 10:05 on /days/[slug]. Both now read the one
 *  computed schedule, started from the Day's own `Start Time`. The field
 *  is retired and deleted; nothing reads it any more.
 *
 *  EXTENDED 17 Aug 2026: inside a Journey the visitor's bed is known, so
 *  the strip now opens with leaving it and closes with getting back to
 *  it - the two legs the day's travel total used to silently drop. Both
 *  ends appear only when the schedule could establish both (see
 *  DaySchedule.base); a day whose base legs were never routed and whose
 *  Base has no coordinates keeps the old stop-to-stop strip rather than
 *  showing half a round trip.
 *
 *  NAMED, not assumed (17 Aug 2026): where the journey authors a
 *  `Transfer Origin Label` the two end segments say that instead of the
 *  Base, because that is the point these clock times were actually
 *  measured to and from. The South Coast Walk leaves the pathway start by
 *  Port Ellen Primary School, not the middle of Port Ellen, and the
 *  strip would otherwise imply the wrong one. */
function DayTimelineStrip({ day, base }: { day: HubDay; base?: DayBase }) {
  const schedule = scheduleForHubDay(day, base);
  if (schedule.rows.length === 0) return null;

  const segments: { key: string; time: number; label: string }[] = [];
  if (schedule.base) {
    segments.push({
      key: "leave-base",
      // The schedule's own departure, not the Day's Start Time: where the
      // first stop runs to a published clock time, setting off is
      // whenever you'd have to set off to make it. See DaySchedule.depart.
      time: schedule.depart,
      label: `Leave ${schedule.base.originLabel ?? schedule.base.name}`,
    });
  }
  for (const row of schedule.rows) {
    // A meaningful hole in front of a stop pinned to a published time
    // gets its own segment, so the strip doesn't jump from one clock
    // time to another with nothing said about the hour in between.
    const gap = row.free + row.travel;
    if (row.free >= MEANINGFUL_GAP_MINUTES) {
      segments.push({
        key: `gap-${row.index}`,
        time: row.arrive - gap,
        label: `${spellGapMinutes(gap)} free`,
      });
    }
    segments.push({ key: `stop-${row.index}`, time: row.arrive, label: stopName(row.stop) });
  }
  if (schedule.base) {
    // "Back at" for an authored origin, "Back in" for a village - you are
    // back IN Port Ellen but back AT a pathway start, and the label is a
    // place-thing rather than a settlement.
    segments.push({
      key: "back-base",
      time: schedule.home,
      label: schedule.base.originLabel
        ? `Back at ${schedule.base.originLabel}`
        : `Back in ${schedule.base.name}`,
    });
  }

  return (
    <div className="jr-day-timeline">
      <span className="jr-eyebrow jr-day-timeline-label">The day</span>
      <div className="jr-day-timeline-row">
        {segments.map((segment, i) => (
          <span key={segment.key} className="jr-timeline-seg-wrap">
            {i > 0 && <span className="jr-timeline-arrow">&rarr;</span>}
            <span className="jr-timeline-seg">
              <span className="jr-timeline-time">{formatClockTime(segment.time)}</span>
              <span className="jr-timeline-label"> {segment.label}</span>
            </span>
          </span>
        ))}
      </div>
      {/* Same content warning the day screen shows, in the same words -
          one schedule, one sentence about what is wrong with it. */}
      {schedule.warnings.map((warning, i) => (
        <div key={`${warning.kind}-${i}`} className="jr-day-timeline-warning">
          {scheduleWarningLine(warning)}
        </div>
      ))}
    </div>
  );
}

/** The pace tile - the solid colour block down the left of every day
 *  card (17 Aug 2026, to Mark's mockup). This is the card's PRIMARY
 *  treatment, not a fallback: the photograph that used to sit here (the
 *  first linked distillery's Hero Image) is gone, along with the two
 *  problems it had - it said only which distillery happened to be first,
 *  and two days that share one showed the same picture.
 *
 *  What it says is only ever what the record already knows: which day of
 *  the journey this is, how many distilleries are on it, and the Day's
 *  own authored `Tile Caption` beneath - noun and phrase together
 *  ("distilleries one road"), broken across two lines by
 *  splitTileCaption. Nothing here, including the singular/plural, is
 *  composed in code. A day with no caption shows the numeral alone
 *  rather than a phrase invented to fill the space, and a day with no
 *  distilleries at all (none today, but Days can be built that way)
 *  drops the numeral rather than printing a large "0".
 *
 *  COLOUR is PacingTag's own pair, inverted: the tile is painted in the
 *  pace's dark tone and lettered in its light one - Relaxed
 *  --green-deep/--green-light, Moderate --copper/--amber-pale, Packed
 *  the sanctioned #B5502E/#F7E6E0 pair that paceTone already carries as
 *  this system's one hardcoded exception (see days-hub.css's own note).
 *  Taken from paceTone rather than restated, so the tiles and the pace
 *  pill beside them can never disagree.
 *
 *  JUDGEMENT CALL, flagged: light-on-copper is the weakest of the three
 *  for contrast (roughly 2.8:1 for the Moderate tile's small text). It
 *  is the pairing Mark specified, so it stands - but the tile carries no
 *  dimmed type at all as a result: hierarchy here is size and weight
 *  only, where an earlier version faded the "DAY 4" kicker to 72%. */
function DayPaceTile({ day, dayNumber }: { day: HubDay; dayNumber: number }) {
  // `stops` is the day's DISTILLERY stops - its beaches, cafes and ruins
  // are featureStops and deliberately uncounted here, since the numeral
  // is the distillery count the caption's noun agrees with.
  const count = day.stops.length;
  const tone = paceTone(day.pacing);
  const caption = day.tileCaption ? splitTileCaption(day.tileCaption) : undefined;
  return (
    <div className="jr-pace-tile" style={{ background: tone.fg, color: tone.bg }}>
      <span className="jr-pace-tile-day">Day {dayNumber}</span>
      <div className="jr-pace-tile-body">
        {count > 0 && <span className="jr-pace-tile-count">{count}</span>}
        {caption && (
          <span className="jr-pace-tile-caption">
            <span>{caption.head}</span>
            {caption.tail && <span>{caption.tail}</span>}
          </span>
        )}
      </div>
    </div>
  );
}

function DaySpineCard({
  day,
  dayNumber,
  journeySlug,
  base,
}: {
  day: HubDay;
  dayNumber: number;
  journeySlug: string;
  base?: DayBase;
}) {
  const distanceOrDuration = day.distanceOnFoot || day.durationPortEllen;
  const tours = dayTourTotal(day);
  const chips = dayChips(day);
  // A day with real walking in it says so in minutes, not just miles -
  // a driving day included, where the figure is what you walk once you
  // have parked. On a journey whose transfers are walked too, it covers
  // getting there and back. Undefined (and so nothing rendered) whenever
  // the stored legs can't answer it, or the total is under the
  // threshold; see walkingLineFor.
  const walking = walkingLineFor(day, base);

  return (
    // The tile is a sibling of the whole right-hand column, not a cell
    // inside the top row - that is what lets it run the FULL height of
    // the card, past the timeline strip, the way the mockup draws it.
    <article className="jr-day-card">
      <DayPaceTile day={day} dayNumber={dayNumber} />
      <div className="jr-day-card-body">
        <div className="jr-day-card-content">
          <div className="jr-day-card-meta">
            <PacingTag pacing={day.pacing} />
            {distanceOrDuration && <span className="jr-day-card-meta-text">&middot; {distanceOrDuration}</span>}
            {tours > 0 && <span className="jr-day-card-meta-text">&middot; {formatMoney(tours)}pp in tours</span>}
          </div>
          <h3 className="jr-day-card-title">{day.name}</h3>
          {day.hook && <p className="jr-day-card-hook">{day.hook}</p>}
          {walking && <p className="jr-day-card-walk">{walking}</p>}
          <div className="jr-day-card-foot">
            <div className="jr-chips">
              {chips.map((c) => (
                <span key={c} className="jr-chip">
                  {c}
                </span>
              ))}
            </div>
            {/* ?journey= carries the base through to the day's own page,
                the same way ?trip=N carries the trip instance - without
                it the day page has no honest bed to start the clock from
                and quietly drops the legs shown right here. */}
            <Link href={`/days/${day.slug}?journey=${journeySlug}`} className="jr-day-open">
              Open the day &rarr;
            </Link>
          </div>
        </div>
        <DayTimelineStrip day={day} base={base} />
      </div>
    </article>
  );
}

/** `optional` is the trailing night a journey offers instead of the boat
 *  home - see nightsAfterDay. It renders as an unfilled, dashed card
 *  rather than the solid --stone one every planned night gets, because
 *  it is a choice and not a step, and it drops the final-sentence
 *  emphasis every other night carries: the bold there is the night's
 *  one actionable beat ("Book it when you book the room."), and on a
 *  night nobody has to take there is nothing to instruct.
 *
 *  The card says nothing the note doesn't - the same way an `Optional`
 *  Day Stop is stated in the day's own copy and nowhere else in the
 *  markup (see walkingLineFor). The Grand Tour's sixth note opens
 *  "Optional.", and it is left exactly as written rather than moved
 *  into a label, so a reader who never sees the styling still reads the
 *  word. */
function NightConnector({
  journey,
  nightNumber,
  optional,
  areaSlug,
}: {
  journey: Journey;
  nightNumber: number;
  optional: boolean;
  areaSlug?: string;
}) {
  const note = nightNoteFor(journey, nightNumber);
  const { lead, last } = splitFinalSentence(note);
  // One label, one case: the whole string ("night one" ... "night six")
  // enters the DOM lower-case and .jr-night-label uppercases it, so the
  // word and its ordinal can never render in clashing cases.
  const nightLabel = `Night ${ordinalWord(nightNumber)}`.toLowerCase();
  return (
    <div className={optional ? "jr-night-card jr-night-card-optional" : "jr-night-card"}>
      <div className="jr-night-when">
        <span className="jr-eyebrow jr-night-label">{nightLabel}</span>
        {journey.base && <span className="jr-night-base">{journey.base}</span>}
      </div>
      {note && (
        <p className="jr-night-note">
          {optional ? note : lead}
          {!optional && last && <strong>{last}</strong>}
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
  const [journey, areas, stays, allJourneys, allDays] = await Promise.all([
    getJourneyBySlug(slug),
    getAreas(),
    getFeaturedStays(),
    getJourneys(),
    getAllDaysAnyStatus(),
  ]);
  if (!journey) notFound();

  const distilleryCount = journeyDistilleryCount(journey);
  const thirdStat = journeyThirdStat(journey);
  const tourTotal = journeyTourTotal(journey);

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

  // Coordinates to fall back on for a base leg that was never routed -
  // the Journey's own Base Stay first, then Areas, then a Featured Stay
  // matched on the Base text. Same order scripts/compute-journey-base-
  // legs.mjs resolves a Base in (17 Aug 2026), so an estimated leg starts
  // from the same door a routed one did rather than from a village
  // centroid a few hundred metres away.
  // Deliberately SEPARATE from baseMarker above: the white map pin and
  // the "Where to stay ->" link still require a real Area record, which
  // is a pre-existing, deliberate rule this change doesn't touch. A base
  // with none of the three still gets no estimated leg - only routed ones.
  const baseStay =
    (journey.baseStayId ? stays.find((stay) => stay.id === journey.baseStayId) : undefined) ??
    (journey.base
      ? stays.find(
          (stay) =>
            (stay.nearestArea ?? "").toLowerCase().startsWith(journey.base.toLowerCase()) ||
            stay.name.toLowerCase().startsWith(journey.base.toLowerCase())
        )
      : undefined);
  // An authored transfer origin outranks all of the above, exactly as it
  // does in scripts/compute-journey-base-legs.mjs - so an ESTIMATED leg
  // (one that was never routed) starts from the same point the routed
  // ones did, instead of quietly reverting to the village centroid the
  // override exists to replace.
  const baseCoords =
    journey.transferOriginLat !== undefined && journey.transferOriginLng !== undefined
      ? { lat: journey.transferOriginLat, lng: journey.transferOriginLng }
      : baseStay
        ? { lat: baseStay.lat, lng: baseStay.lng }
        : baseMarker
          ? { lat: baseMarker.lat, lng: baseMarker.lng }
          : undefined;

  // Where this journey's transfers are measured from, said ONCE for the
  // whole spine rather than inside every day card's walking line - those
  // are written to fit a phone and the authored origin does not fit in
  // them. One journey has one base and one origin, so the first day that
  // has something to say says it for all of them. See walkingOriginNote.
  const walkingOrigin = journey.days
    .map((day, i) => walkingOriginNote(day, journeyBaseFor(journey, i, baseCoords)))
    .find((note) => note !== undefined);

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

  const accommodation = journeyAccommodationRange(journey);
  const carHire = journeyCarHire(journey);
  // How many nights this journey SHOWS, and how many of them it CHARGES
  // for. The two differ by the optional night at the end - see
  // journeyNightCounts.
  const nightCounts = journeyNightCounts(journey);
  const optionalNights = nightCounts.total - nightCounts.priced;

  return (
    <>
      <section className="jr-hero">
        {journey.heroImage ? (
          /* `unoptimized`, as every other /api/attachment image on the
             site already is (21 of them, this was the only one that
             wasn't). That proxy's src carries a query string, and a LOCAL
             src with a query string is only a legal input to next/image's
             optimiser if it is declared in images.localPatterns - which
             this project deliberately doesn't configure, because these
             images are a redirect to a short-lived signed Airtable URL and
             are meant to be served straight through rather than
             re-fetched and transformed. Without it next/image throws
             during render and the whole page 500s with an empty body,
             which is exactly what all four Journeys did the moment a Hero
             Image was first put on the records (see the note above). */
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
          {walkingOrigin && <p className="jr-walk-origin">{walkingOrigin}</p>}

          <div className="jr-spine">
            {journey.days.map((day, i) => {
              // Night one sits BEFORE day one - it is the night you
              // arrive, and every journey's first Night Notes line is
              // written as one. Any night past the journey's PRICED
              // count comes back marked optional. See
              // nightsBeforeDay/nightsAfterDay/journeyNightCounts.
              const renderNight = (slot: NightSlot) => (
                <div key={slot.night} className="jr-spine-item">
                  <span
                    className={
                      slot.optional
                        ? "jr-spine-marker jr-spine-marker-night jr-spine-marker-night-optional"
                        : "jr-spine-marker jr-spine-marker-night"
                    }
                    aria-hidden
                  >
                    &#9790;
                  </span>
                  <NightConnector
                    journey={journey}
                    nightNumber={slot.night}
                    optional={slot.optional}
                    areaSlug={baseArea?.slug}
                  />
                </div>
              );
              return (
                <div key={day.id}>
                  {nightsBeforeDay(i, journey.days.length, nightCounts).map(renderNight)}
                  <div className="jr-spine-item">
                    <span className="jr-spine-marker jr-spine-marker-day">{i + 1}</span>
                    <DaySpineCard
                      day={day}
                      dayNumber={i + 1}
                      journeySlug={journey.slug}
                      base={journeyBaseFor(journey, i, baseCoords)}
                    />
                  </div>
                  {nightsAfterDay(i, journey.days.length, nightCounts).map(renderNight)}
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
            {/* A RANGE, never a single number: the same room genuinely
                doubles between February and festival week, and quoting
                only the low end would be the kind of teaser price this
                site doesn't do. Both ends must be real - a journey with
                one rate sourced and not the other stays pending, and no
                journey ever borrows another's figures. */}
            <div className="jr-cta-row">
              <span className="jr-cta-label">
                Accommodation
                <span className="jr-cta-sub">
                  {journey.nights} {journey.nights === 1 ? "night" : "nights"}
                  {accommodation ? ", off-season to peak" : ""}
                </span>
              </span>
              <span className={accommodation ? "jr-cta-value" : "jr-cta-value jr-cta-pending"}>
                {accommodation
                  ? `${formatMoney(accommodation.low)} – ${formatMoney(accommodation.high)}`
                  : "Not yet confirmed"}
              </span>
            </div>
            {/* Three states, not two - "Not needed" is a real, earned
                claim (every day walkable end to end) and must never be
                what an unpriced journey falls back to saying. */}
            <div className="jr-cta-row">
              <span className="jr-cta-label">
                Car hire
                {carHire.kind === "priced" && (
                  <span className="jr-cta-sub">
                    {journey.days.length} {journey.days.length === 1 ? "day" : "days"}
                  </span>
                )}
                {/* The value says only what we know about the PRICE. This
                    keeps the thing the box used to say about the CAR -
                    these routes genuinely need one - which "Not yet
                    confirmed" on its own would have quietly dropped. */}
                {carHire.kind === "pending" && <span className="jr-cta-sub">needed for this route</span>}
              </span>
              {carHire.kind === "priced" && <span className="jr-cta-value">{formatMoney(carHire.total)}</span>}
              {carHire.kind === "not-needed" && (
                <span className="jr-cta-value jr-cta-value-good">Not needed</span>
              )}
              {carHire.kind === "pending" && (
                <span className="jr-cta-value jr-cta-pending">Not yet confirmed</span>
              )}
            </div>
            {/* JUDGEMENT CALL, flagged: no combined total is shown, even
                though every row above may be priced. Tours are per
                PERSON (the site says "pp" everywhere) while a room and a
                car are per PARTY - adding them produces a number that is
                neither, and readers would take it as a per-head price.
                Two travellers and one traveller get very different
                answers from the same three rows, and this data doesn't
                know which. The rows are honest on their own; a total
                would need an occupancy assumption nobody has made. */}
            <p className="jr-cta-excludes">
              Indicative, not a quote. Tours are per person; room and car are for the party. Ferry, food and
              fuel aren&apos;t in these figures.
              {/* Said out loud rather than left to be inferred from a row
                  that reads "5 nights" beside a spine showing six: the
                  last one is a choice, and it is not in this total. */}
              {optionalNights === 1 &&
                ` Night ${ordinalWord(nightCounts.total).toLowerCase()} is optional and isn't priced in.`}
              {optionalNights > 1 &&
                ` The last ${optionalNights} nights are optional and aren't priced in.`}
            </p>
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
