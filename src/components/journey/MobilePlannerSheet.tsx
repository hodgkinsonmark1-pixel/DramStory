"use client";

import { useState, useRef } from "react";
import type { Distillery, ItineraryDay, ItineraryStop, LocalFeature, TripAccommodation } from "@/lib/types";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";
import { stopCoords, stopId, stopName } from "@/lib/itinerary-stop";
import { nearbyFeaturesForDay } from "@/lib/day-derivations";
import { useTrip } from "@/lib/trip-context";
import MapCanvas from "./MapCanvas";

/**
 * Mobile planner bottom sheet (Days/Trip flow Phase 6, docs/days-trip-
 * flow-handoff.md §3.5 "Mobile shape of the planner" + §6 "Map"). Reached
 * from Workspace.tsx below its own mobile breakpoint (see MOBILE_BREAKPOINT
 * there) INSTEAD of the desktop rail - same trip data and MapCanvas, a
 * different container, per the task brief ("This is a CSS/conditional-
 * render split, not two separate routes").
 *
 * Ported from the reference prototype (docs/prototypes/days-trip-flow.html
 * - see its S.sheet/drawSheet()/fitMap()/.sheet/.grab/.recentre) rather
 * than designed fresh: the sheet has exactly three fixed pixel heights -
 * peek/half/full - and the grab handle / header row CYCLES between them
 * on tap, same as every other button in this app. It does NOT implement
 * real touch-drag resize gestures - that was explicitly called out as
 * over-engineering relative to what the prototype actually tested (task
 * brief: "replicate this click-to-cycle approach, don't build real
 * drag-to-resize gesture handling").
 *
 * JUDGEMENT CALL on the three pixel heights (the task brief flagged the
 * prototype's own two sets of numbers - 150/380/520 in fitMap() vs
 * 150/420/620 in drawSheet() - as inconsistent and asked for fresh,
 * sensible real values instead of copying either verbatim):
 *   - PEEK (150px): tall enough for the header (kicker + "Xh Ym total
 *     journey") plus roughly the top third of the first stop row peeking
 *     in underneath - a literal "hint of the first stop", not a
 *     separately-written summary line. The prototype's own drawSheet()
 *     renders the SAME body (header + full stop list [+ nearby at full])
 *     at every height and lets the container's height alone decide how
 *     much of it is visible/scrollable - this keeps that behaviour
 *     rather than writing three different bodies.
 *   - HALF (420px): comfortably fits the header plus 3-4 stop rows (each
 *     with its leg-time line, move-up and remove controls) before the
 *     list itself needs to scroll - "the stop list with reorder controls
 *     fitting comfortably" per the design doc.
 *   - FULL (640px): list plus the "NEARBY, NOT YET IN YOUR DAY" section,
 *     capped by `max-height: calc(100vh - 220px)` in the CSS (see
 *     mobile-planner-sheet.css) so a short viewport (e.g. iPhone SE) never
 *     has the sheet claim the entire screen and hide the map above it
 *     entirely - the map padding below uses this SAME 640 constant
 *     regardless, which is a deliberately safe direction to be wrong in
 *     (slightly over-padding the map's fitBounds on a short phone reads
 *     as "a bit more zoomed out than strictly necessary", never as "a pin
 *     hidden under the sheet").
 *   - PIN card (220px): name, one meta line, one action button - measured
 *     against the actual card markup below, with a little headroom.
 *
 * These three(-plus-one) numbers are the SINGLE source of truth for both
 * the sheet's own inline `height` style AND the `sheetPaddingBottom` fed
 * to MapCanvas's fitBounds - not two separately-maintained constants like
 * the prototype's - so they can never drift apart the way the prototype's
 * own two number-sets did.
 */

type SheetStage = "peek" | "half" | "full";

const SHEET_HEIGHTS: Record<SheetStage, number> = { peek: 150, half: 420, full: 640 };
const PIN_CARD_HEIGHT = 220;

interface SelectedPin {
  kind: "distillery" | "feature";
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface GhostDrop {
  stop: ItineraryStop;
  index: number;
}

export default function MobilePlannerSheet({
  distilleries,
  localFeatures,
  isLive,
  regionLabel,
  activeDay,
  activeDayIndex,
  totalDays,
  dayLabel,
  accommodation,
  routeStops,
  driveSegments,
  stopDriveOffset,
  totalDriveMinutes,
  totalVisitMinutes,
  activeDayFeatures,
  highlightedDistillerySlugs,
  initialView,
  onViewChange,
  onAddDistillery,
  onAddFeature,
  mapToolbar,
}: {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  isLive: boolean;
  regionLabel: string;
  activeDay: ItineraryDay;
  activeDayIndex: number;
  totalDays: number;
  dayLabel: string;
  accommodation?: TripAccommodation;
  routeStops: { lat: number; lng: number }[];
  driveSegments: number[];
  stopDriveOffset: number;
  totalDriveMinutes: number;
  totalVisitMinutes: number;
  activeDayFeatures: LocalFeature[];
  highlightedDistillerySlugs: string[];
  initialView?: { lat: number; lng: number; zoom: number };
  onViewChange: (view: { lat: number; lng: number; zoom: number }) => void;
  onAddDistillery: (slug: string) => void;
  onAddFeature: (id: string) => void;
  mapToolbar: React.ReactNode;
}) {
  const trip = useTrip();
  const [stage, setStage] = useState<SheetStage>("peek");
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [ghost, setGhost] = useState<GhostDrop | null>(null);
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sheetHeight = selectedPin ? PIN_CARD_HEIGHT : SHEET_HEIGHTS[stage];

  function cycleSheet() {
    setSelectedPin(null);
    setStage((prev) => (prev === "peek" ? "half" : prev === "half" ? "full" : "peek"));
  }

  // §5 "Drop a stop: Ghost row with 'undo' - never silent removal", same
  // pattern as DayScreen.tsx's handleDrop/handleUndoDrop (Phase 4) -
  // re-implemented here rather than imported, since DayScreen.tsx is
  // explicitly out of scope for this phase and its version is a
  // component-local closure, not an exported helper.
  function dropStop(stop: ItineraryStop, index: number) {
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    trip.removeStop(activeDayIndex, stopId(stop));
    setGhost({ stop, index });
    ghostTimer.current = setTimeout(() => setGhost(null), 6000);
  }

  function undoDrop() {
    if (!ghost) return;
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    const { stop, index } = ghost;
    if (stop.kind === "distillery") {
      trip.addStop(activeDayIndex, stop.distillery, stop.anchor);
      if (stop.tour) trip.setTourForStop(activeDayIndex, stop.distillery, stop.tour);
    } else {
      trip.addFeatureStop(activeDayIndex, stop.feature);
    }
    const landedAt = activeDay.stops.length;
    for (let i = landedAt; i > index; i--) {
      trip.moveStop(activeDayIndex, i, -1);
    }
    setGhost(null);
  }

  const totalLabel = formatDuration(totalDriveMinutes + totalVisitMinutes);
  const nearby = stage === "full" ? nearbyFeaturesForDay(activeDay, localFeatures, 4) : [];

  // "+ Add after {name}" (§6: "a button naming the position - + Add
  // after Ardbeg, not 'Add'") - the last stop already in the day, or the
  // accommodation if the day's still empty, or the plain fallback below
  // if neither is set yet.
  const lastStopName = activeDay.stops.length > 0 ? stopName(activeDay.stops[activeDay.stops.length - 1]) : undefined;
  const afterName = lastStopName ?? accommodation?.name;
  const lastPoint =
    activeDay.stops.length > 0
      ? stopCoords(activeDay.stops[activeDay.stops.length - 1])
      : accommodation
        ? { lat: accommodation.lat, lng: accommodation.lng }
        : null;

  const pinInDay = selectedPin ? activeDay.stops.some((s) => stopId(s) === selectedPin.id) : false;
  const pinDistanceMins = selectedPin && lastPoint ? estimatedDriveMinutes(lastPoint, selectedPin) : null;

  function handlePinAdd() {
    if (!selectedPin) return;
    if (selectedPin.kind === "distillery") onAddDistillery(selectedPin.id);
    else onAddFeature(selectedPin.id);
    setSelectedPin(null);
    setStage("half");
  }

  function handlePinRemove() {
    if (!selectedPin) return;
    const index = activeDay.stops.findIndex((s) => stopId(s) === selectedPin.id);
    const stop = activeDay.stops[index];
    if (!stop) return;
    setSelectedPin(null);
    dropStop(stop, index);
  }

  // JUDGEMENT CALL, flagged per the task brief: neither the design doc's
  // section 3.5 nor the reference prototype's planner screen show any
  // day-switching control on mobile - both only ever describe/prototype
  // the sheet for ONE already-chosen day (reached via "Make this day my
  // own"). But Workspace.tsx is also the general planning/dreaming
  // workspace, where a visitor can be building several days from
  // scratch - without SOME way to move between days, every day past
  // whichever one was active when the viewport dropped below the mobile
  // breakpoint would become permanently unreachable on a phone, which is
  // a dead end, not a faithful reading of "peek/half/full, same
  // MapCanvas logic, different container." Kept deliberately minimal
  // (prev/next + the day label only, no add/remove/reorder-day chrome)
  // rather than porting the desktop rail's full .day-nav block, which is
  // real UI surface the actual design brief never asked for here.
  const canPrevDay = activeDayIndex > 0;
  const canNextDay = activeDayIndex < totalDays - 1;

  return (
    <div className="mobile-planner">
      <div className="mobile-day-switch">
        <button
          type="button"
          className="mobile-day-switch-arrow tap"
          onClick={() => trip.setCurrentDayIndex(activeDayIndex - 1)}
          disabled={!canPrevDay}
          aria-label="Previous day"
        >
          &#8249;
        </button>
        <span className="mobile-day-switch-label">{dayLabel}</span>
        <button
          type="button"
          className="mobile-day-switch-arrow tap"
          onClick={() => trip.setCurrentDayIndex(activeDayIndex + 1)}
          disabled={!canNextDay}
          aria-label="Next day"
        >
          &#8250;
        </button>
        <button type="button" className="mobile-day-switch-add tap" onClick={() => trip.addDay()}>
          + Add day
        </button>
      </div>
      {mapToolbar}
      <div className="mobile-planner-stage">
        <MapCanvas
          distilleries={distilleries}
          localFeatures={localFeatures}
          isLive={isLive}
          highlightedDistillerySlugs={highlightedDistillerySlugs}
          activeDayId={activeDay.id}
          activeDayFeatures={activeDayFeatures}
          accommodation={accommodation}
          initialView={initialView}
          onViewChange={onViewChange}
          routeStops={routeStops}
          sheetPaddingBottom={sheetHeight}
          recenterSignal={recenterSignal}
          onPinTap={(target) => setSelectedPin(target)}
          onAddDistillery={onAddDistillery}
          onAddFeature={onAddFeature}
        />

        {!isLive && (
          <div className="mobile-planner-offline">{regionLabel} is on the roadmap — Islay is the only region loaded so far.</div>
        )}

        <button
          type="button"
          className="mobile-recentre tap"
          onClick={() => setRecenterSignal((n) => n + 1)}
          aria-label="Show my whole day"
        >
          <span aria-hidden="true">⌖</span> Whole day
        </button>

        <div className="mobile-sheet" style={{ height: sheetHeight }}>
          <div className="mobile-sheet-body">
            {selectedPin ? (
              <div className="mobile-pin-card">
                <div className="mobile-pin-card-top">
                  <span className={"mobile-pin-dot" + (selectedPin.kind === "distillery" ? " mobile-pin-dot-dist" : "")} aria-hidden="true" />
                  <div className="mobile-pin-card-body">
                    <div className="mobile-pin-card-name">{selectedPin.name}</div>
                    <div className="mobile-pin-card-meta">
                      {pinDistanceMins !== null && `${pinDistanceMins}m from your last stop`}
                      {selectedPin.kind === "distillery" && !pinInDay && " · adds a distillery to this day"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mobile-pin-card-close tap"
                    onClick={() => setSelectedPin(null)}
                    aria-label={`Close ${selectedPin.name}`}
                  >
                    &times;
                  </button>
                </div>
                {pinInDay ? (
                  <button
                    type="button"
                    className="mobile-pin-card-btn mobile-pin-card-btn-ghost"
                    onClick={handlePinRemove}
                    aria-label={`Remove ${selectedPin.name} from this day`}
                  >
                    Remove from day
                  </button>
                ) : (
                  <button type="button" className="mobile-pin-card-btn" onClick={handlePinAdd} aria-label={`Add ${selectedPin.name}${afterName ? ` after ${afterName}` : ""}`}>
                    {afterName ? `+ Add after ${afterName}` : "+ Add to your day"}
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="mobile-sheet-header"
                  onClick={cycleSheet}
                  aria-label={stage === "full" ? "Collapse the itinerary and show the map" : "Expand the itinerary"}
                >
                  <span className="mobile-sheet-grab" aria-hidden="true" />
                  <span className="mobile-sheet-header-row">
                    <span className="mobile-sheet-header-text">
                      <span className="mobile-sheet-kicker">
                        YOUR ITINERARY · DAY {activeDayIndex + 1} OF {totalDays} · {dayLabel}
                      </span>
                      <span className="mobile-sheet-total">{totalLabel} total journey</span>
                    </span>
                    <span className="mobile-sheet-cycle-hint">{stage === "full" ? "Show the map ▼" : "Pull up ▲"}</span>
                  </span>
                </button>

                {ghost && (
                  <div className="mobile-sheet-ghost" role="status">
                    {stopName(ghost.stop)} dropped
                    <button type="button" className="mobile-sheet-ghost-undo" onClick={undoDrop}>
                      undo
                    </button>
                  </div>
                )}

                <div className="mobile-sheet-stops">
                  {activeDay.stops.length === 0 ? (
                    <p className="mobile-sheet-empty">Nothing added to this day yet — tap a pin on the map to start.</p>
                  ) : (
                    activeDay.stops.map((stop, i) => {
                      const id = stopId(stop);
                      const anchor = stop.anchor === true;
                      const legMinutes = i === 0 ? driveSegments[0] : driveSegments[i - 1 + stopDriveOffset];
                      const legLabel =
                        i === 0
                          ? accommodation
                            ? `${formatDuration(legMinutes)} drive from ${accommodation.name}`
                            : null
                          : `${formatDuration(legMinutes)} drive`;
                      return (
                        <div key={id} className="mobile-stop-row">
                          {legLabel && <div className="mobile-stop-leg">{legLabel}</div>}
                          <div className="mobile-stop-main">
                            <span className={"mobile-stop-num" + (stop.kind === "distillery" ? " mobile-stop-num-dist" : "")}>{i + 1}</span>
                            <span className="mobile-stop-name">{stopName(stop)}</span>
                            {anchor ? (
                              <span className="mobile-stop-anchor">ANCHOR</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="mobile-stop-btn tap"
                                  onClick={() => trip.moveStop(activeDayIndex, i, -1)}
                                  disabled={i === 0}
                                  aria-label={`Move ${stopName(stop)} earlier in the day`}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className="mobile-stop-btn mobile-stop-btn-remove tap"
                                  onClick={() => dropStop(stop, i)}
                                  aria-label={`Remove ${stopName(stop)} from this day`}
                                >
                                  &times;
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {stage === "full" && (
                  <div className="mobile-sheet-nearby">
                    <div className="mobile-sheet-kicker mobile-sheet-nearby-kicker">NEARBY, NOT YET IN YOUR DAY</div>
                    {nearby.length === 0 ? (
                      <p className="mobile-sheet-empty">Nothing nearby left to suggest right now.</p>
                    ) : (
                      nearby.map(({ feature, mins }) => (
                        <div className="mobile-nearby-card" key={feature.id}>
                          <span className="mobile-pin-dot" aria-hidden="true">
                            {feature.icon}
                          </span>
                          <div className="mobile-nearby-body">
                            <div className="mobile-nearby-name">{feature.name}</div>
                            <div className="mobile-nearby-meta">{mins}m on</div>
                          </div>
                          <button
                            type="button"
                            className="mobile-nearby-add"
                            onClick={() => onAddFeature(feature.id)}
                            aria-label={`Add ${feature.name} to this day`}
                          >
                            + Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
