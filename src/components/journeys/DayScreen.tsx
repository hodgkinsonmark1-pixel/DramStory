"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Distillery, HubDay, ItineraryDay, ItineraryStop, LocalFeature, Tour } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import { stopCoords, stopId, stopName } from "@/lib/itinerary-stop";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";
import { renderWithLinks } from "@/lib/render-links";
import {
  dateForDayIndex,
  formatDayDate,
  driveMinutesForItineraryDay,
  itineraryDayPriceLabel,
  isFerryDayItinerary,
  isDayEdited,
  resetDayToHub,
  itineraryDayFromHubDay,
  parseStartTimeMinutes,
  scheduleForItineraryDay,
  formatClockTime,
  partOfDay,
  isDistilleryClosedOn,
  isAppointmentOnly,
  DAY_NAMES,
  type ScheduleRow,
  type PartOfDay,
} from "@/lib/day-derivations";
import { PacingTag } from "@/components/PacingTag";
import JourneyDayMap from "@/components/journeys/JourneyDayMap";

/**
 * THE day screen. One component, one route (/days/[slug]).
 *
 * MERGED 16 Aug 2026 from the two components that both used to render a
 * Day and disagreed with each other:
 *  - DayScreen (this file, /trip/day/[index]) had the computed schedule,
 *    MORNING/AFTERNOON/EVENING grouping, tour picker, swap/drop/reorder -
 *    and no map, no "Other features visited", and nothing at all to show
 *    if the day wasn't in the visitor's trip.
 *  - JourneyDayDetail (/days/[slug]) had the narrative with real links,
 *    the two visited lists, the transport note, the map and "add to
 *    trip" - and no times and no controls.
 * A visitor could read the same Day twice and be shown two different
 * things. Now the BODY is identical in both cases; only the editing
 * affordances are gated on whether this Day is in the visitor's trip.
 * JourneyDayDetail.tsx and AddDayToTripButton.tsx are deleted, not left
 * sitting as a second copy.
 *
 * `day` is the published Airtable record, fetched server-side by
 * src/app/days/[slug]/page.tsx - so the page renders in full before (and
 * regardless of whether) localStorage hydrates. `tripParam` is the
 * ?trip=N disambiguator: the same Day can be added to a trip more than
 * once, and a positional index is the only thing that tells two
 * instances apart. Without it, the first instance of this slug wins.
 *
 * localFeatures supplies the swap sheet's nearest-non-distillery
 * suggestions (§3.4 item 4 / §8 open question 7).
 */

/** Below this width the map is a flat preview with a link out, not a
 *  live Leaflet canvas - see the map block below for why. 768px is the
 *  breakpoint this whole flow already switches at (Workspace.tsx's own
 *  MOBILE_BREAKPOINT, day-screen.css, days-hub.css, trip-review.css). */
const MOBILE_BREAKPOINT = 768;

interface GhostStop {
  stop: ItineraryStop;
  /** The stop's position in day.stops at the moment it was dropped -
   *  used so "undo" can bubble it back to where it was (moveStop calls),
   *  not just tack it onto the end. */
  index: number;
}

interface SwapTarget {
  id: string;
  index: number;
  name: string;
  coords: { lat: number; lng: number };
}

export default function DayScreen({
  day,
  localFeatures,
  tripParam,
}: {
  day: HubDay;
  localFeatures: LocalFeature[];
  tripParam: number | null;
}) {
  const trip = useTrip();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [tourSheetDistillery, setTourSheetDistillery] = useState<Distillery | null>(null);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const [ghost, setGhost] = useState<GhostStop | null>(null);
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same matchMedia-in-an-effect pattern as Workspace.tsx's own
  // isMobileViewport (and Hero/AreaClient/HeroTodayColumn) - starts false
  // so the server render and the first client render agree, then flips.
  // NOTE for the record: MapCanvas.tsx itself has no interactive/mobile
  // split to be consistent with - the split lives one level up in
  // Workspace.tsx, which conditionally renders MobilePlannerSheet vs the
  // desktop rail and passes the same MapCanvas into both. This mirrors
  // that: the decision is made here, JourneyDayMap just takes a flag.
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Which trip day, if any, IS this Day. ?trip=N wins when it really
  // points at an instance of this Day; otherwise the first instance of
  // this slug in the trip. Null = not in the trip, which is a perfectly
  // good state, not an error - the page just renders read-only.
  const tripIndex = useMemo(() => {
    if (!trip.ready) return null;
    if (tripParam != null && trip.days[tripParam]?.sourceHubDaySlug === day.slug) return tripParam;
    const first = trip.days.findIndex((d) => d.sourceHubDaySlug === day.slug);
    return first === -1 ? null : first;
  }, [trip.ready, trip.days, tripParam, day.slug]);

  const inTrip = tripIndex != null;

  // The day being rendered. In the trip: the visitor's real, editable
  // copy. Not in the trip: the published record in the same shape, so
  // every derivation below (schedule, drive, price, grouping) is the one
  // implementation rather than two that can drift.
  const hubAsItinerary = useMemo(() => itineraryDayFromHubDay(day), [day]);
  const itineraryDay: ItineraryDay = inTrip ? trip.days[tripIndex] : hubAsItinerary;

  const edited = inTrip ? isDayEdited(itineraryDay, day) : false;
  const ferry = isFerryDayItinerary(itineraryDay);
  const drive = driveMinutesForItineraryDay(itineraryDay);
  const priceLabel = itineraryDayPriceLabel(itineraryDay);
  const date = inTrip ? dateForDayIndex(trip.tripDates, tripIndex) : null;
  const dateLabel = date ? formatDayDate(date) : null;

  // ONE schedule, started from this Day's own Airtable Start Time
  // (blank = the documented 09:30). The same call, via scheduleForHubDay,
  // drives the "THE DAY" strip on /journeys/[slug] - that shared source
  // is the point: the two pages used to read a hand-written Day Timeline
  // field on one and compute on the other, and showed different times
  // for the same day.
  const schedule = scheduleForItineraryDay(itineraryDay, parseStartTimeMinutes(day.startTime));

  // Group schedule rows under MORNING/AFTERNOON/EVENING (§3.4 item 4) -
  // rows already arrive in visiting order with non-decreasing arrival
  // times, so a running "does this row start a new part" check produces
  // the same grouping as a full sort/bucket would, without needing one.
  const groups: { part: PartOfDay; rows: ScheduleRow[] }[] = [];
  for (const row of schedule.rows) {
    const p = partOfDay(row.arrive);
    const last = groups[groups.length - 1];
    if (last && last.part === p) last.rows.push(row);
    else groups.push({ part: p, rows: [row] });
  }

  const distilleryStops = itineraryDay.stops.filter((s) => s.kind === "distillery");
  const featureStops = itineraryDay.stops.filter((s) => s.kind === "feature");
  // JUDGEMENT CALL: the brief asks for the two visited lists "where that
  // grouping adds something". A day that is all distilleries (or all
  // features) learns nothing from being split in two - the timed list
  // above already names every stop in order. So the pair renders only
  // when there is genuinely something on both sides of the line.
  const showVisitedLists = distilleryStops.length > 0 && featureStops.length > 0;

  function moveUp(index: number) {
    if (!inTrip) return;
    trip.moveStop(tripIndex, index, -1);
  }

  function handleDrop(stop: ItineraryStop, index: number) {
    if (!inTrip) return;
    // Only one ghost/undo slot at a time - dropping a second stop while
    // the first's undo window is still open finalises the first
    // immediately (its removal already happened; this just clears the
    // now-stale undo affordance) rather than trying to juggle several
    // ghost rows at once.
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    trip.removeStop(tripIndex, stopId(stop));
    setGhost({ stop, index });
    ghostTimer.current = setTimeout(() => setGhost(null), 6000);
  }

  function handleUndoDrop() {
    if (!ghost || !inTrip) return;
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    const { stop, index } = ghost;
    if (stop.kind === "distillery") {
      trip.addStop(tripIndex, stop.distillery, stop.anchor);
      if (stop.tour) trip.setTourForStop(tripIndex, stop.distillery, stop.tour);
    } else {
      trip.addFeatureStop(tripIndex, stop.feature);
    }
    // The re-added stop lands at the end (stops.length, i.e. the current
    // - already-shrunk-by-the-drop - length) - bubble it back up to where
    // it was via the same adjacent-swap moveStop already used for
    // day/stop reordering elsewhere. Safe to call these back-to-back
    // without waiting for a re-render: every trip-context mutator uses a
    // functional setDays update, so calls made together in one handler
    // still compose correctly against the same accumulating array.
    const landedAt = itineraryDay.stops.length;
    for (let i = landedAt; i > index; i--) {
      trip.moveStop(tripIndex, i, -1);
    }
    setGhost(null);
  }

  function openSwap(stop: ItineraryStop, index: number) {
    setSwapTarget({ id: stopId(stop), index, name: stopName(stop), coords: stopCoords(stop) });
  }

  function performSwap(feature: LocalFeature) {
    if (!swapTarget || !inTrip) return;
    const { id, index } = swapTarget;
    trip.removeStop(tripIndex, id);
    trip.addFeatureStop(tripIndex, feature);
    // Same "keeps its place in the day" bubble-back as handleUndoDrop
    // above (§10 copy deck: "Nearby, and it keeps its place in the day.").
    const landedAt = itineraryDay.stops.length - 1; // length unchanged: removed 1, added 1
    for (let i = landedAt; i > index; i--) {
      trip.moveStop(tripIndex, i, -1);
    }
    setSwapTarget(null);
  }

  function resetDay() {
    if (!inTrip) return;
    resetDayToHub(tripIndex, trip.days[tripIndex]?.stops ?? [], day, trip);
  }

  function openInPlanner() {
    if (!inTrip) return;
    // Identical hand-off to TripReview.tsx's own openInPlanner - reused,
    // not reimplemented.
    trip.setCurrentDayIndex(tripIndex);
    router.push("/journey?resume=1");
  }

  /** "+ Add this day to my trip". Full fidelity - anchors, chosen tours
   *  AND the Local Feature stops the narrative actually describes - i.e.
   *  exactly what DaysHubGrid's "+ Add as a day" does. (The deleted
   *  AddDayToTripButton, which this replaces, silently added only the
   *  distilleries: no tours, no anchors, no features, so a day added
   *  from /days/[slug] arrived in the trip as a different day from the
   *  same one added from /days. That is fixed here.) Stays on the page
   *  and rewrites the URL with ?trip=N, so the controls simply appear
   *  around the day already being read. */
  function addThisDay() {
    if (!trip.intake) {
      trip.completeIntake({
        timing: "planning",
        location: { kind: "region", region: "islay" },
        interests: ["distilleries"],
      });
    }
    const newIndex = trip.addDay(day.slug);
    for (const stop of day.stops) {
      trip.addStop(newIndex, stop.distillery, stop.anchor);
      if (stop.tour) trip.setTourForStop(newIndex, stop.distillery, stop.tour);
    }
    for (const feature of day.featureStops) {
      trip.addFeatureStop(newIndex, feature);
    }
    trip.setCurrentDayIndex(newIndex);
    router.replace(`/days/${day.slug}?trip=${newIndex}`);
  }

  // §3.4 item 5 swap suggestions - "currently the five nearest
  // non-distillery stops" (§8 open question 7, still unresolved in the
  // design doc itself). Candidates are Local Features only (never other
  // distilleries), nearest-first by the same haversine drive-time
  // estimate used everywhere else, excluding whatever's already in this
  // day.
  const swapAlternatives = swapTarget
    ? localFeatures
        .filter((f) => !itineraryDay.stops.some((s) => stopId(s) === f.id))
        .map((f) => ({ feature: f, mins: estimatedDriveMinutes(swapTarget.coords, { lat: f.lat, lng: f.lng }) }))
        .sort((a, b) => a.mins - b.mins)
        .slice(0, 5)
    : [];

  const mapDistilleries = distilleryStops.map((s) => (s as { distillery: Distillery }).distillery);
  const mapFeatures = featureStops.map((s) => {
    const f = (s as { feature: LocalFeature }).feature;
    return { name: f.name, slug: f.slug, lat: f.lat, lng: f.lng };
  });
  const hasMap = mapDistilleries.length + mapFeatures.length > 0;

  return (
    <div className="day-screen">
      <div className="day-header">
        <div className="day-header-top">
          {/* §7: back links state their destination, not just "Back". */}
          {inTrip ? (
            <>
              <Link href="/trip" className="day-back" aria-label="Back to my trip">
                &lsaquo; My trip
              </Link>
              <span className="day-header-orient">
                Day {tripIndex + 1} of {trip.days.length}
              </span>
            </>
          ) : (
            <Link href="/days" className="day-back" aria-label="Back to Pre-Designed Days">
              &lsaquo; Pre-Designed Days
            </Link>
          )}
        </div>
        <h1 className="day-title">{day.name}</h1>
        {inTrip && edited && (
          <div className="trip-day-version" style={{ marginBottom: 6 }}>
            <span className="trip-day-version-tag">YOUR VERSION</span>
            <button type="button" className="trip-day-version-reset" onClick={resetDay}>
              Reset to the original
            </button>
          </div>
        )}
        <div className="day-meta">
          {dateLabel && <span>{dateLabel}</span>}
          <PacingTag pacing={day.pacing} />
          {ferry && <span>Needs a ferry</span>}
          {drive > 0 && (
            // In the trip a day has a real base, so this is the whole
            // round trip from the door. Not in the trip there is no
            // honest base to measure from (the same reason the schedule
            // below starts at the first stop), so this counts only the
            // driving between the stops themselves and says so, rather
            // than quietly printing a smaller number under the same
            // words the /days card uses.
            <span>
              &asymp;{formatDuration(drive)} {inTrip ? "on the road" : "driving between stops"}
            </span>
          )}
          {priceLabel && <span>{priceLabel}</span>}
          {(day.distanceOnFoot || day.durationPortEllen) && (
            <span>{day.distanceOnFoot || day.durationPortEllen}</span>
          )}
        </div>
      </div>

      <div className="day-body">
        {/* §3.4 item 2 - the narrative, two lines visible, "Read on"
            unfolds in place. It is the emotional payload and must not be
            behind a navigation, so it is here in both states, links
            live, never a bare truncated string. */}
        {day.narrative && (
          <div className="day-narrative-block">
            <p className={`day-narrative${expanded ? "" : " day-narrative-clamped"}`}>
              {renderWithLinks(day.narrative)}
            </p>
            <button
              type="button"
              className="day-narrative-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "Show less of the write-up" : "Read the full write-up"}
            >
              {expanded ? "Show less" : "Read on"}
            </button>
          </div>
        )}

        {/* §3.4 item 3 - the day's shape. The reorder/swap/drop half of
            the sentence is only true when the visitor can actually do
            those things, so it is only said then. */}
        {itineraryDay.stops.length > 0 && (
          <div className="day-shape">
            <div className="trip-kicker">The day&apos;s shape</div>
            <div className="day-shape-line">
              Starting {formatClockTime(parseStartTimeMinutes(day.startTime))}, back by{" "}
              {formatClockTime(schedule.home)}
              {inTrip ? " — reorder, swap or drop anything" : ""}
            </div>
          </div>
        )}

        {hasMap && (
          <div className="day-map-block">
            {isMobileViewport ? (
              // A live Leaflet canvas mid-article eats the scroll
              // gesture on a touch screen: the thumb pans the map and
              // the page stops moving. Below 768px this is a flat
              // preview with every handler off, and the way into a real
              // map is an explicit tap target - the planner, which is
              // built for a full-screen map on mobile (§6).
              <div className="day-map-preview">
                <JourneyDayMap stops={mapDistilleries} featureStops={mapFeatures} interactive={false} />
                <Link href="/journey" className="day-map-open">
                  Open the map &rarr;
                </Link>
              </div>
            ) : (
              <JourneyDayMap stops={mapDistilleries} featureStops={mapFeatures} />
            )}
          </div>
        )}

        {/* §3.4 item 4 - stops grouped MORNING/AFTERNOON/EVENING, each
            with its computed arrival time, duration, chosen tour and
            price. Shown in both states; the controls are not. */}
        {itineraryDay.stops.length === 0 ? (
          <p className="day-empty-stops">No stops in this day yet.</p>
        ) : (
          <div className="day-stops">
            {groups.map((group) => (
              <div key={group.part}>
                <div className="day-group-header">{group.part.toUpperCase()}</div>
                {group.rows.map((row) => {
                  const stop = row.stop;
                  // Droppability, extended 16 Aug 2026: it was already
                  // `anchor !== true` rather than "is it a distillery",
                  // so Local Feature stops were never actually excluded
                  // from Swap/Drop by kind - the brief's assumption that
                  // they were is not what the code did. What HAS changed
                  // is that this now applies to the un-added case too
                  // (there is simply nothing to edit there) and that
                  // itineraryDayFromHubDay carries Airtable's Anchor
                  // checkbox through, so the same stops are protected
                  // either way. Anchors stay undroppable per §2.2.
                  const anchor = stop.anchor === true;
                  const distillery = stop.kind === "distillery" ? stop.distillery : undefined;
                  const tour: Tour | undefined = stop.kind === "distillery" ? stop.tour : undefined;
                  const hasTours = !!distillery && distillery.tours.length > 0;
                  const showTourPicker = inTrip && hasTours;

                  const appointmentOnly = !!distillery && isAppointmentOnly(distillery);
                  const closed =
                    !!distillery && !!date && !appointmentOnly && isDistilleryClosedOn(distillery, date);

                  const subLine = distillery
                    ? tour
                      ? `${tour.name} · ${tour.price ? `£${tour.price}` : "free"}`
                      : distillery.priceFrom || "Tours available on site"
                    : stop.kind === "feature"
                    ? stop.feature.pinSummary || stop.feature.whyVisit || stop.feature.description
                    : "";

                  const notes = (
                    <>
                      {closed && (
                        <div className="day-stop-closed-note">Closed on {DAY_NAMES[date!.getDay()]}s</div>
                      )}
                      {appointmentOnly && (
                        <div className="day-stop-appointment-note">
                          By appointment only — no drop-in hours
                        </div>
                      )}
                    </>
                  );

                  return (
                    <div
                      key={stopId(stop)}
                      className={`day-stop-card${closed ? " day-stop-closed" : ""}`}
                    >
                      <div className="day-stop-top">
                        <div className="day-stop-time">
                          <div className="day-stop-time-value">{formatClockTime(row.arrive)}</div>
                          <div className="day-stop-time-dur">{row.dur}m</div>
                        </div>
                        <span className={`day-stop-dot${stop.kind === "feature" ? " feature" : ""}`} />
                        {showTourPicker && distillery ? (
                          <button
                            type="button"
                            className="day-stop-main"
                            onClick={() => setTourSheetDistillery(distillery)}
                            aria-label={`Change tour at ${distillery.name}`}
                          >
                            <span className="day-stop-name">
                              {distillery.name}
                              <span className="day-stop-name-tours">tours ▾</span>
                            </span>
                            <div className="day-stop-sub">{subLine}</div>
                            {notes}
                          </button>
                        ) : distillery ? (
                          <Link href={`/distilleries/${distillery.slug}`} className="day-stop-main">
                            <span className="day-stop-name">{distillery.name}</span>
                            <div className="day-stop-sub">{subLine}</div>
                            {notes}
                          </Link>
                        ) : stop.kind === "feature" && stop.feature.slug ? (
                          <Link href={`/explore/${stop.feature.slug}`} className="day-stop-main">
                            <span className="day-stop-name">{stopName(stop)}</span>
                            <div className="day-stop-sub">{subLine}</div>
                          </Link>
                        ) : (
                          <div className="day-stop-main" style={{ cursor: "default" }}>
                            <span className="day-stop-name">{stopName(stop)}</span>
                            <div className="day-stop-sub">{subLine}</div>
                            {notes}
                          </div>
                        )}
                      </div>
                      {/* Editing affordances, and only these, are gated
                          on the day being in the trip. */}
                      {inTrip && (
                        <div className="day-stop-controls">
                          {anchor ? (
                            <span className="day-stop-anchor-label">ANCHOR · THE REASON FOR THIS DAY</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="day-stop-btn day-stop-btn-up"
                                onClick={() => moveUp(row.index)}
                                disabled={row.index === 0}
                                aria-label={`Move ${stopName(stop)} earlier`}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="day-stop-btn day-stop-btn-swap"
                                onClick={() => openSwap(stop, row.index)}
                                aria-label={`Swap ${stopName(stop)} for somewhere else`}
                              >
                                Swap
                              </button>
                              <button
                                type="button"
                                className="day-stop-btn day-stop-btn-drop"
                                onClick={() => handleDrop(stop, row.index)}
                                aria-label={`Remove ${stopName(stop)} from this day`}
                              >
                                Drop
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* §5 interaction table: "Drop a stop → Ghost row with undo
                — never silent removal." role="status" per §7. */}
            {ghost && (
              <div className="day-ghost-row" role="status">
                {stopName(ghost.stop)} dropped
                <button
                  type="button"
                  className="day-ghost-undo"
                  onClick={handleUndoDrop}
                  aria-label={`Undo removing ${stopName(ghost.stop)} from this day`}
                >
                  undo
                </button>
              </div>
            )}
          </div>
        )}

        {showVisitedLists && (
          <div className="day-visited">
            <div className="day-visited-group">
              <div className="day-visited-label">Distilleries visited</div>
              {distilleryStops.map((s) => {
                const d = (s as { distillery: Distillery }).distillery;
                return (
                  <Link key={d.slug} href={`/distilleries/${d.slug}`} className="day-visited-link">
                    {d.name}
                  </Link>
                );
              })}
            </div>
            <div className="day-visited-group">
              <div className="day-visited-label">Other features visited</div>
              {featureStops.map((s) => {
                const f = (s as { feature: LocalFeature }).feature;
                return (
                  <Link key={f.id} href={`/explore/${f.slug}`} className="day-visited-link">
                    {f.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {day.transportNote && <div className="day-transport-note">{day.transportNote}</div>}

        <div className="day-footer">
          {inTrip ? (
            <>
              <p className="day-footer-prompt">Want to reshape it properly?</p>
              <button type="button" className="trip-btn trip-btn-primary" onClick={openInPlanner}>
                Make this day my own &rarr;
              </button>
            </>
          ) : (
            (day.stops.length > 0 || day.featureStops.length > 0) && (
              <button type="button" className="trip-btn trip-btn-primary" onClick={addThisDay}>
                + Add this day to my trip
              </button>
            )
          )}
        </div>
      </div>

      {/* Tour sheet - reuses the exact .tour-picker-backdrop/.tour-picker-
          modal pattern Workspace.tsx already uses for the planner's own
          tour picker (and that TripReview.tsx's date sheet also reuses),
          rather than building a second bespoke sheet mechanism. */}
      {tourSheetDistillery && inTrip && (
        <div className="tour-picker-backdrop" onClick={() => setTourSheetDistillery(null)}>
          <div
            className="tour-picker-modal"
            role="dialog"
            aria-label={`Choose a tour at ${tourSheetDistillery.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="tour-picker-close" onClick={() => setTourSheetDistillery(null)} aria-label="Close">
              &times;
            </button>
            <div className="tour-picker-heading">Choose a tour at {tourSheetDistillery.name}</div>
            <div className="tour-picker-list">
              {tourSheetDistillery.tours.map((tour) => (
                <div className="tour-picker-option" key={tour.name}>
                  <div className="tour-picker-option-top">
                    <span className="tour-picker-option-name">{tour.name}</span>
                    <span className="tour-picker-option-price">£{tour.price}</span>
                  </div>
                  <div className="tour-picker-option-duration">{tour.duration}</div>
                  {tour.description && <p className="tour-picker-option-desc">{tour.description}</p>}
                  <button
                    className="tour-picker-option-btn"
                    onClick={() => {
                      trip.setTourForStop(tripIndex, tourSheetDistillery, tour);
                      setTourSheetDistillery(null);
                    }}
                  >
                    Use this tour
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Swap sheet - §10 copy deck: "SWAP {NAME} FOR" / "Nearby, and it
          keeps its place in the day." / "Keep {name}". Same modal shell
          as the tour sheet above. */}
      {swapTarget && inTrip && (
        <div className="tour-picker-backdrop" onClick={() => setSwapTarget(null)}>
          <div
            className="tour-picker-modal"
            role="dialog"
            aria-label={`Swap ${swapTarget.name} for somewhere else`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="tour-picker-close" onClick={() => setSwapTarget(null)} aria-label="Close">
              &times;
            </button>
            <div className="tour-picker-heading">Swap {swapTarget.name} for</div>
            <p className="day-swap-intro">Nearby, and it keeps its place in the day.</p>
            {swapAlternatives.length === 0 ? (
              <p className="day-swap-empty">Nothing nearby left to suggest right now.</p>
            ) : (
              <div className="day-swap-list">
                {swapAlternatives.map(({ feature, mins }) => (
                  <button
                    type="button"
                    key={feature.id}
                    className="day-swap-option"
                    onClick={() => performSwap(feature)}
                  >
                    <span className="day-swap-option-dot" />
                    <span className="day-swap-option-body">
                      <span className="day-swap-option-name">{feature.name}</span>
                      <span className="day-swap-option-meta">
                        {mins}m away · {feature.pinSummary || feature.whyVisit || feature.category}
                      </span>
                    </span>
                    <span className="day-swap-option-use">Use</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="trip-btn trip-btn-ghost day-swap-keep"
              onClick={() => setSwapTarget(null)}
            >
              Keep {swapTarget.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
