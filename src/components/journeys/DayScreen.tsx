"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Distillery, HubDay, ItineraryStop, LocalFeature, Tour } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import { stopCoords, stopId, stopName } from "@/lib/itinerary-stop";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";
import {
  dayTitle,
  dateForDayIndex,
  formatDayDate,
  driveMinutesForItineraryDay,
  itineraryDayPriceLabel,
  isFerryDayItinerary,
  paceForItineraryDay,
  isDayEdited,
  resetDayToHub,
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

/**
 * Day screen (Days/Trip flow Phase 4, docs/days-trip-flow-handoff.md
 * §3.4/§10 "Day"). Reached from TripReview.tsx's day title link
 * (/trip/day/[index]). Client-rendered - trip state lives in
 * trip-context.tsx's localStorage-backed context, same reasoning as
 * TripReview.tsx/Workspace.tsx.
 *
 * hubDays/localFeatures are fetched server-side by the route
 * (src/app/trip/day/[index]/page.tsx) and passed down:
 *  - hubDays: resolves this day's sourceHubDaySlug back to its original
 *    HubDay, for the narrative (§3.4 item 2) and the pace/edited-state
 *    logic TripReview.tsx already established.
 *  - localFeatures: swap suggestions (§3.4 item 4 / §8 open question 7 -
 *    "currently the five nearest non-distillery stops").
 */

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same pattern as DistilleryPageClient.tsx/
 *  FeaturedStayClient.tsx/ExploreFeatureClient.tsx (each file keeps its
 *  own copy of this small helper rather than importing a shared one -
 *  following that existing convention here). */
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    return (
      <Link href={href} key={i} className="dist-inline-link">
        {label}
      </Link>
    );
  });
}

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
  dayIndex,
  hubDays,
  localFeatures,
}: {
  dayIndex: number;
  hubDays: HubDay[];
  localFeatures: LocalFeature[];
}) {
  const trip = useTrip();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [tourSheetDistillery, setTourSheetDistillery] = useState<Distillery | null>(null);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const [ghost, setGhost] = useState<GhostStop | null>(null);
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hubDaysBySlug = useMemo(() => new Map(hubDays.map((d) => [d.slug, d])), [hubDays]);

  // Mirrors TripReview.tsx/Workspace.tsx's own "!trip.ready" gate - avoids
  // a flash of "day not found" before localStorage hydration catches up
  // (server always renders zero days, since there's no localStorage
  // there).
  if (!trip.ready) {
    return <div className="day-screen" style={{ minHeight: "50vh" }} />;
  }

  const day = trip.days[dayIndex];

  if (!day) {
    return (
      <div className="day-screen">
        <div className="day-not-found">
          <div className="trip-empty-kicker">Your trip</div>
          <h1 className="trip-empty-title">That day isn&apos;t there</h1>
          <p className="trip-empty-body">
            It may have been removed, or the link is out of date. Head back to your trip to find it.
          </p>
          <Link href="/trip" className="trip-btn trip-btn-primary">
            Back to my trip
          </Link>
        </div>
      </div>
    );
  }

  const hub = day.sourceHubDaySlug ? hubDaysBySlug.get(day.sourceHubDaySlug) : undefined;
  const title = dayTitle(day, hub);
  const pace = paceForItineraryDay(day, hubDaysBySlug);
  const ferry = isFerryDayItinerary(day);
  const drive = driveMinutesForItineraryDay(day);
  const priceLabel = itineraryDayPriceLabel(day);
  const edited = hub ? isDayEdited(day, hub) : false;
  const totalDays = trip.days.length;

  const date = dateForDayIndex(trip.tripDates, dayIndex);
  const dateLabel = date ? formatDayDate(date) : null;

  const schedule = scheduleForItineraryDay(day);

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

  function moveUp(index: number) {
    trip.moveStop(dayIndex, index, -1);
  }

  function handleDrop(stop: ItineraryStop, index: number) {
    // Only one ghost/undo slot at a time - dropping a second stop while
    // the first's undo window is still open finalises the first
    // immediately (its removal already happened; this just clears the
    // now-stale undo affordance) rather than trying to juggle several
    // ghost rows at once.
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    trip.removeStop(dayIndex, stopId(stop));
    setGhost({ stop, index });
    ghostTimer.current = setTimeout(() => setGhost(null), 6000);
  }

  function handleUndoDrop() {
    if (!ghost) return;
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    const { stop, index } = ghost;
    if (stop.kind === "distillery") {
      trip.addStop(dayIndex, stop.distillery, stop.anchor);
      if (stop.tour) trip.setTourForStop(dayIndex, stop.distillery, stop.tour);
    } else {
      trip.addFeatureStop(dayIndex, stop.feature);
    }
    // The re-added stop lands at the end (day.stops.length, i.e. the
    // current - already-shrunk-by-the-drop - length) - bubble it back up
    // to where it was via the same adjacent-swap moveStop already used
    // for day/stop reordering elsewhere. Safe to call these back-to-back
    // without waiting for a re-render: every trip-context mutator uses a
    // functional setDays update, so calls made together in one handler
    // still compose correctly against the same accumulating array (same
    // assumption DaysHubGrid's own multi-call handleAddToTrip already
    // relies on).
    const landedAt = day.stops.length;
    for (let i = landedAt; i > index; i--) {
      trip.moveStop(dayIndex, i, -1);
    }
    setGhost(null);
  }

  function openSwap(stop: ItineraryStop, index: number) {
    setSwapTarget({ id: stopId(stop), index, name: stopName(stop), coords: stopCoords(stop) });
  }

  function performSwap(feature: LocalFeature) {
    if (!swapTarget) return;
    const { id, index } = swapTarget;
    trip.removeStop(dayIndex, id);
    trip.addFeatureStop(dayIndex, feature);
    // Same "keeps its place in the day" bubble-back as handleUndoDrop
    // above (§10 copy deck: "Nearby, and it keeps its place in the day.").
    const landedAt = day.stops.length - 1; // length unchanged: removed 1, added 1
    for (let i = landedAt; i > index; i--) {
      trip.moveStop(dayIndex, i, -1);
    }
    setSwapTarget(null);
  }

  function resetDay() {
    if (!hub) return;
    resetDayToHub(dayIndex, trip.days[dayIndex]?.stops ?? [], hub, trip);
  }

  function openInPlanner() {
    // Identical hand-off to TripReview.tsx's own openInPlanner - reused,
    // not reimplemented, per the task brief.
    trip.setCurrentDayIndex(dayIndex);
    router.push("/journey?resume=1");
  }

  // §3.4 item 5 swap suggestions - "currently the five nearest
  // non-distillery stops" (§8 open question 7, still unresolved in the
  // design doc itself). Matches the reference prototype's own swap sheet
  // exactly: candidates are Local Features only (never other
  // distilleries), nearest-first by the same haversine drive-time
  // estimate used everywhere else, excluding whatever's already in this
  // day. JUDGEMENT CALL: open question 7 explicitly leaves "should
  // distilleries be swappable too" unresolved - this doesn't attempt to
  // answer that, it just implements the one suggestion mechanism the
  // design doc actually specifies.
  const swapAlternatives = swapTarget
    ? localFeatures
        .filter((f) => !day.stops.some((s) => stopId(s) === f.id))
        .map((f) => ({ feature: f, mins: estimatedDriveMinutes(swapTarget.coords, { lat: f.lat, lng: f.lng }) }))
        .sort((a, b) => a.mins - b.mins)
        .slice(0, 5)
    : [];

  return (
    <div className="day-screen">
      <div className="day-header">
        <div className="day-header-top">
          {/* §7: back links state their destination, not just "Back". */}
          <Link href="/trip" className="day-back" aria-label="Back to my trip">
            ‹ My trip
          </Link>
          <span className="day-header-orient">
            Day {dayIndex + 1} of {totalDays}
          </span>
        </div>
        <h1 className="day-title">{title}</h1>
        {edited && (
          <div className="trip-day-version" style={{ marginBottom: 6 }}>
            <span className="trip-day-version-tag">YOUR VERSION</span>
            <button type="button" className="trip-day-version-reset" onClick={resetDay}>
              Reset to the original
            </button>
          </div>
        )}
        <div className="day-meta">
          {dateLabel && <span>{dateLabel}</span>}
          <PacingTag pacing={pace} />
          {ferry && <span>Needs a ferry</span>}
          {drive > 0 && <span>≈{formatDuration(drive)} on the road</span>}
          {priceLabel && <span>{priceLabel}</span>}
        </div>
      </div>

      <div className="day-body">
        {/* §3.4 item 2 - narrative, two lines visible, "Read on" unfolds
            in place (no navigation/modal). No sourceHubDaySlug means no
            narrative to show - skipped rather than fabricated, per the
            task brief. */}
        {hub && hub.narrative && (
          <div className="day-narrative-block">
            <p className={`day-narrative${expanded ? "" : " day-narrative-clamped"}`}>
              {renderWithLinks(hub.narrative)}
            </p>
            <button
              type="button"
              className="day-narrative-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Show less of the write-up" : "Read the full write-up"}
            >
              {expanded ? "Show less" : "Read on"}
            </button>
          </div>
        )}

        {/* §3.4 item 3 - the day's shape */}
        {day.stops.length > 0 && (
          <div className="day-shape">
            <div className="trip-kicker">The day&apos;s shape</div>
            <div className="day-shape-line">
              Starting {formatClockTime(9 * 60 + 30)}, back by {formatClockTime(schedule.home)} — reorder, swap or
              drop anything
            </div>
          </div>
        )}

        {/* §3.4 item 4 - stops grouped MORNING/AFTERNOON/EVENING */}
        {day.stops.length === 0 ? (
          <p className="day-empty-stops">No stops in this day yet.</p>
        ) : (
          <div className="day-stops">
            {groups.map((group) => (
              <div key={group.part}>
                <div className="day-group-header">{group.part.toUpperCase()}</div>
                {group.rows.map((row) => {
                  const stop = row.stop;
                  const anchor = stop.anchor === true;
                  const distillery = stop.kind === "distillery" ? stop.distillery : undefined;
                  const tour: Tour | undefined = stop.kind === "distillery" ? stop.tour : undefined;
                  const hasTours = !!distillery && distillery.tours.length > 0;

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
                        {distillery && hasTours ? (
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
                            {closed && (
                              <div className="day-stop-closed-note">Closed on {DAY_NAMES[date!.getDay()]}s</div>
                            )}
                            {appointmentOnly && (
                              <div className="day-stop-appointment-note">
                                By appointment only — no drop-in hours
                              </div>
                            )}
                          </button>
                        ) : stop.kind === "feature" && stop.feature.slug ? (
                          <Link href={`/explore/${stop.feature.slug}`} className="day-stop-main">
                            <span className="day-stop-name">{stopName(stop)}</span>
                            <div className="day-stop-sub">{subLine}</div>
                          </Link>
                        ) : (
                          <div className="day-stop-main" style={{ cursor: "default" }}>
                            <span className="day-stop-name">{stopName(stop)}</span>
                            <div className="day-stop-sub">{subLine}</div>
                            {closed && (
                              <div className="day-stop-closed-note">Closed on {DAY_NAMES[date!.getDay()]}s</div>
                            )}
                            {appointmentOnly && (
                              <div className="day-stop-appointment-note">
                                By appointment only — no drop-in hours
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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

        {/* §3.4 item 6 - footer hand-off into /journey, reusing Phase 5's
            exact mechanism. */}
        <div className="day-footer">
          <p className="day-footer-prompt">Want to reshape it properly?</p>
          <button type="button" className="trip-btn trip-btn-primary" onClick={openInPlanner}>
            Make this day my own →
          </button>
        </div>
      </div>

      {/* Tour sheet - reuses the exact .tour-picker-backdrop/.tour-picker-
          modal pattern Workspace.tsx already uses for the planner's own
          tour picker (and that TripReview.tsx's date sheet also reuses),
          rather than building a second bespoke sheet mechanism. */}
      {tourSheetDistillery && (
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
                      trip.setTourForStop(dayIndex, tourSheetDistillery, tour);
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
      {swapTarget && (
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
            <p style={{ fontSize: 13, color: "var(--slate)", margin: "4px 0 14px" }}>
              Nearby, and it keeps its place in the day.
            </p>
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
