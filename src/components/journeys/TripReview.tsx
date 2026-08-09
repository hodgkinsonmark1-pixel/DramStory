"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Distillery, HubDay, ItineraryDay, ItineraryStop } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { baseDisplayName } from "@/lib/trip-answers";
import { formatDuration } from "@/lib/drive-time";
import { stopId, stopName } from "@/lib/itinerary-stop";
import {
  formatMoney,
  driveMinutesForItineraryDay,
  itineraryDayCost,
  itineraryDayPriceLabel,
  isFerryDayItinerary,
  paceForItineraryDay,
  paceAccentColour,
  tripShapeNote,
  collectionNote,
  isDayEdited,
  resetDayToHub,
} from "@/lib/day-derivations";
import DateRangePicker from "@/components/journey/DateRangePicker";

/**
 * Trip review (Days/Trip flow Phase 3, docs/days-trip-flow-handoff.md
 * §3.3/§10 "Trip review"). DaysTripBar's "Review" button now points
 * here instead of the Phase 2 placeholder (/journey?resume=1).
 *
 * Client-rendered - trip state lives in trip-context.tsx's localStorage-
 * backed context (see /days' own DaysHubGrid for the same pattern), so
 * this can't be a server component. hubDays/distilleries are fetched
 * server-side by the page (same getDays()/getDistilleries() calls /days
 * already makes) and passed down, mainly so a day that traces back to a
 * real Hub Day (sourceHubDaySlug) can borrow its authored pacing and
 * detect whether it's been edited - see paceForItineraryDay and
 * isDayEdited below.
 */

// ─────────────────────────────────────────────────────────────────────────
// Small ISO-date helpers - deliberately plain string/Date arithmetic, no
// date library, same approach Workspace.tsx already uses for its own
// (separate, unexported) date helpers.
// ─────────────────────────────────────────────────────────────────────────
function addDaysIso(iso: string, days: number): Date | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function formatDayDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Best-effort honest title for a trip day. HubDay has an authored name
 *  ("Ardbeg, on Foot") - a day that still traces back to one uses it.
 *  A day with no source (built freehand in the planner, or whose Hub Day
 *  no longer resolves) has no editorial name in the current data model,
 *  so this falls back to the stop names themselves rather than
 *  fabricating one - consistent with the brand-voice "no fabricated
 *  specifics" rule. */
function dayTitle(day: ItineraryDay, hub: HubDay | undefined): string {
  if (hub) return hub.name;
  if (day.stops.length > 0) return day.stops.map(stopName).join(" → ");
  return day.label;
}

interface DayRow {
  day: ItineraryDay;
  index: number;
  hub: HubDay | undefined;
  pace: "Relaxed" | "Moderate" | "Packed";
  drive: number;
  cost: number;
  priceLabel: string;
  ferry: boolean;
  title: string;
  edited: boolean;
}

function EmptyTripState() {
  return (
    <div className="trip-empty">
      <div className="trip-empty-kicker">Your trip</div>
      <h1 className="trip-empty-title">Nothing added yet</h1>
      <p className="trip-empty-body">
        Add a day or two from the Days list and this page will show the shape of your trip, which
        distilleries you&apos;ve got, and what&apos;s still worth sorting.
      </p>
      <Link href="/days" className="trip-btn trip-btn-primary">
        Browse the days →
      </Link>
    </div>
  );
}

function ShapeStrip({ rows, dateLabels }: { rows: DayRow[]; dateLabels: (string | null)[] }) {
  const weights = rows.map((r) => Math.max(1, r.drive + r.day.stops.length * 20));
  const maxWeight = Math.max(...weights, 1);
  const note = tripShapeNote(
    rows.map((r) => r.pace),
    rows[0]?.ferry ?? false
  );

  return (
    <div className="trip-card">
      <div className="trip-kicker">The shape of your trip</div>
      <div className="trip-shape-strip">
        {rows.map((r, i) => {
          const pct = Math.max(10, Math.round((weights[i] / maxWeight) * 100));
          const label = dateLabels[i] ?? `Day ${r.index + 1}`;
          return (
            <div className="trip-shape-row" key={r.day.id}>
              <div className="trip-shape-row-label">{label}</div>
              <div className="trip-shape-row-track">
                <div
                  className="trip-shape-row-fill"
                  role="img"
                  aria-label={`Day ${r.index + 1}: ${r.ferry ? "ferry day, " : ""}${r.pace}`}
                  style={{
                    width: `${pct}%`,
                    background: paceAccentColour(r.pace),
                    opacity: r.pace === "Packed" ? 1 : r.pace === "Moderate" ? 0.78 : 0.55,
                  }}
                />
              </div>
              <div className="trip-shape-row-pace" style={{ color: paceAccentColour(r.pace) }}>
                {r.ferry ? "Ferry" : r.pace}
              </div>
            </div>
          );
        })}
      </div>
      <p className="trip-shape-note">{note}</p>
    </div>
  );
}

function CollectionStrip({ distilleries, inTrip }: { distilleries: Distillery[]; inTrip: Set<string> }) {
  const count = inTrip.size;
  const total = distilleries.length;
  const names = distilleries.filter((d) => inTrip.has(d.slug)).map((d) => d.name);

  return (
    <div className="trip-card">
      <div className="trip-card-head">
        <span className="trip-kicker trip-kicker-inline">Distilleries visited</span>
        <span className="trip-collection-count">
          {count}
          <span className="trip-collection-total"> / {total}</span>
        </span>
      </div>
      <div
        className="trip-collection-segments"
        role="img"
        aria-label={`${count} of ${total} distilleries on your trip: ${names.length ? names.join(", ") : "none yet"}`}
      >
        {distilleries.map((d) => (
          <div
            key={d.slug}
            title={d.name}
            className={`trip-collection-segment${inTrip.has(d.slug) ? " filled" : ""}`}
          />
        ))}
      </div>
      <p className="trip-collection-note">{collectionNote(count, total)}</p>
    </div>
  );
}

function DayReviewRow({
  row,
  totalDays,
  dateLabel,
  onMoveUp,
  onMoveDown,
  onRemoveStop,
  onOpenPlanner,
  onReset,
}: {
  row: DayRow;
  totalDays: number;
  dateLabel: string | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemoveStop: (id: string) => void;
  onOpenPlanner: () => void;
  onReset: () => void;
}) {
  const { day, index, pace, drive, priceLabel, ferry, title, edited } = row;
  const accent = paceAccentColour(pace);

  return (
    <div className="trip-day-row">
      <div className="trip-day-order">
        <button
          type="button"
          className="trip-day-move"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${title} earlier`}
        >
          ▲
        </button>
        <span className="trip-day-num" style={{ background: accent }}>
          {index + 1}
        </span>
        <button
          type="button"
          className="trip-day-move"
          onClick={onMoveDown}
          disabled={index === totalDays - 1}
          aria-label={`Move ${title} later`}
        >
          ▼
        </button>
      </div>
      <div className="trip-day-body">
        {/* Plain text, not a link/button - there's no day-detail screen
            to open in Phase 3 (that's §3.4, Phase 4, out of scope). The
            one real hand-off this page offers into a day is "Make this
            day my own" below, so the title doesn't duplicate that
            action under a second, less legible affordance. */}
        <div className="trip-day-title">{title}</div>
        {edited && (
          <div className="trip-day-version">
            <span className="trip-day-version-tag">YOUR VERSION</span>
            <button type="button" className="trip-day-version-reset" onClick={onReset}>
              Reset to the original
            </button>
          </div>
        )}
        <div className="trip-day-meta">
          {[
            dateLabel,
            ferry ? "Needs a ferry" : pace,
            drive > 0 ? `≈${formatDuration(drive)}` : null,
            priceLabel || null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="trip-day-chips">
          {day.stops.length === 0 && <span className="trip-day-chip-empty">No stops yet</span>}
          {day.stops.map((stop: ItineraryStop) => {
            const id = stopId(stop);
            const name = stopName(stop);
            return (
              <span key={id} className="trip-day-chip">
                {name}
                <button
                  type="button"
                  className="trip-day-chip-remove"
                  onClick={() => onRemoveStop(id)}
                  aria-label={`Remove ${name} from ${title}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <button type="button" className="trip-day-plan-link" onClick={onOpenPlanner}>
          Make this day my own →
        </button>
      </div>
    </div>
  );
}

export default function TripReview({ hubDays, distilleries }: { hubDays: HubDay[]; distilleries: Distillery[] }) {
  const trip = useTrip();
  const router = useRouter();
  const [datesOpen, setDatesOpen] = useState(false);

  const hubDaysBySlug = useMemo(() => new Map(hubDays.map((d) => [d.slug, d])), [hubDays]);

  // Mirrors Workspace.tsx's own "!trip.ready" gate - avoids a flash of
  // the empty state before localStorage hydration catches up (server
  // always renders zero days, since there's no localStorage there).
  if (!trip.ready) {
    return <div style={{ minHeight: "50vh" }} />;
  }

  const days = trip.days;

  if (days.length === 0) {
    return <EmptyTripState />;
  }

  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const baseName = baseDisplayName(base, baseKind);

  const rows: DayRow[] = days.map((day, index) => {
    const hub = day.sourceHubDaySlug ? hubDaysBySlug.get(day.sourceHubDaySlug) : undefined;
    return {
      day,
      index,
      hub,
      pace: paceForItineraryDay(day, hubDaysBySlug),
      drive: driveMinutesForItineraryDay(day),
      cost: itineraryDayCost(day),
      priceLabel: itineraryDayPriceLabel(day),
      ferry: isFerryDayItinerary(day),
      title: dayTitle(day, hub),
      edited: hub ? isDayEdited(day, hub) : false,
    };
  });

  const distillerySlugsInTrip = new Set<string>();
  for (const day of days) {
    for (const s of day.stops) {
      if (s.kind === "distillery") distillerySlugsInTrip.add(s.distillery.slug);
    }
  }
  const distilleryCount = distillerySlugsInTrip.size;
  const totalDrive = rows.reduce((sum, r) => sum + r.drive, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const anyFerry = rows.some((r) => r.ferry);

  // Real per-day dates only exist once a specific range is confirmed - a
  // "month" answer (e.g. "September 2026") doesn't pin down which day of
  // the month is Day 1, so every day label falls back to "Day N" in that
  // mode, same as when no dates are set at all.
  const td = trip.tripDates;
  const rangeStart = td.mode === "range" && td.confirmed && td.startDate ? new Date(td.startDate) : null;
  const dateLabels: (string | null)[] = rows.map((_, i) => {
    if (!rangeStart || isNaN(rangeStart.getTime())) return null;
    const d = addDaysIso(td.startDate, i);
    return d ? formatDayDate(d) : null;
  });
  const tripEndDate = rangeStart ? addDaysIso(td.startDate, days.length - 1) : null;

  function moveUp(index: number) {
    trip.moveDay(index, -1);
  }
  function moveDown(index: number) {
    trip.moveDay(index, 1);
  }
  function removeStopFromDay(index: number, id: string) {
    trip.removeStop(index, id);
  }
  function openInPlanner(index: number) {
    // Honest hand-off mechanism verified against JourneyFlow.tsx: with
    // resume=1, no saved intake, and real days already in the trip, it
    // jumps straight to the workspace and reads the active day from
    // trip.currentDayIndex (Workspace.tsx's activeDayIndex). Setting that
    // first is what actually lands the visitor on THIS day, not just
    // "the planner, wherever it left off" - the Phase 2 agent's
    // /journey?resume=1 guess didn't do this part.
    trip.setCurrentDayIndex(index);
    router.push("/journey?resume=1");
  }
  function resetDay(index: number, hub: HubDay) {
    resetDayToHub(index, trip.days[index]?.stops ?? [], hub, trip);
  }

  // §4.4 "Still to sort" - generated, not written, and only ever
  // includes what's actually true of THIS trip. Two of the design doc's
  // six rules are skipped outright rather than faked - see the code
  // comments at each skipped rule for why.
  const todoItems: { id: string; node: React.ReactNode }[] = [];
  if (anyFerry) {
    todoItems.push({
      id: "ferry",
      node: (
        <>
          <strong>Feolin ferry times</strong> — the last crossing decides your day, not you.
        </>
      ),
    });
  }
  // SKIPPED: "any 18+/online-only tour -> book direct, named" - Tour
  // (src/lib/types.ts) is just { name, duration, price, description },
  // no age-restriction/online-only flag exists anywhere in the data
  // model. Rather than guess from tour names, this rule doesn't run at
  // all here - flagged in the Phase 3 report rather than silently
  // dropped.
  // SKIPPED: "a stop closed on its day's date" - needs closedDays,
  // Phase 4, explicitly out of scope.
  if (!td.confirmed) {
    todoItems.push({
      id: "dates",
      node: (
        <>
          <strong>Add your dates</strong> — then we can flag closures and ferry timings.
        </>
      ),
    });
  }
  todoItems.push({
    id: "stay",
    node: (
      <>
        <strong>
          {nights} {nights === 1 ? "night" : "nights"} in {baseName}
        </strong>{" "}
        — see where to stay.
      </>
    ),
  });
  // JUDGEMENT CALL: "how many days actually need a car" - the design doc's
  // own example ("everything within walking distance wouldn't need one")
  // assumes a walking-distance signal that doesn't exist in this data
  // model. driveMinutesForItineraryDay's haversine estimate floors at 5
  // minutes per leg and only returns exactly 0 for a day with zero stops,
  // so "driveMinutes > 0" in practice just means "this day has any stops
  // at all" - not a meaningful walking-vs-driving distinction. Counting
  // it anyway (rather than the flatter "every day needs a car" fallback)
  // because it's still an honest statement or a totally empty day, and
  // costs nothing extra to compute - flagged here and in the report.
  const carDays = rows.filter((r) => r.drive > 0).length;
  todoItems.push({
    id: "car",
    node: (
      <>
        <strong>
          {carDays} of {days.length} days need a car
        </strong>{" "}
        — worth knowing before you hire one.
      </>
    ),
  });

  return (
    <div className="trip-review">
      <div className="trip-hero">
        <div className="trip-hero-top">
          <span className="trip-hero-kicker">Your trip</span>
          <Link href="/days" className="trip-hero-back" aria-label="Back to all days">
            ‹ All days
          </Link>
        </div>
        <h1 className="trip-hero-title">
          {days.length} {days.length === 1 ? "day" : "days"} from {baseName}
        </h1>
        <p className="trip-hero-sub">
          {rangeStart && tripEndDate ? `${formatDayDate(rangeStart)} – ${formatDayDate(tripEndDate)} · ` : ""}
          {distilleryCount} {distilleryCount === 1 ? "distillery" : "distilleries"}
          {anyFerry ? ", one ferry" : ""}, ≈{formatDuration(totalDrive)} driving.
        </p>
      </div>

      <div className="trip-body">
        {/* §3.3 item 1 - dates prompt / summary */}
        {!td.confirmed ? (
          <button
            type="button"
            className="trip-dates-prompt"
            onClick={() => setDatesOpen(true)}
            aria-label="Add your travel dates"
          >
            <div className="trip-dates-prompt-title">
              Know your dates? <span className="trip-dates-prompt-cta">Add them →</span>
            </div>
            <div className="trip-dates-prompt-sub">
              We&apos;ll flag anything closed on the day you&apos;re going, and which day the ferry decides.
            </div>
          </button>
        ) : (
          <div className="trip-dates-summary">
            <div>
              <div className="trip-kicker trip-kicker-inline">Your dates</div>
              <div className="trip-dates-summary-value">
                {td.mode === "range" && rangeStart && tripEndDate
                  ? `${formatDayDate(rangeStart)} – ${formatDayDate(tripEndDate)}`
                  : td.mode === "month" && td.month
                  ? new Date(`${td.month}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
                  : "Dates added"}
              </div>
            </div>
            <button
              type="button"
              className="trip-change-link"
              onClick={() => setDatesOpen(true)}
              aria-label="Change your dates"
            >
              Change
            </button>
          </div>
        )}

        {/* §3.3 item 2 */}
        <ShapeStrip rows={rows} dateLabels={dateLabels} />

        {/* §3.3 item 3 */}
        <CollectionStrip distilleries={distilleries} inTrip={distillerySlugsInTrip} />

        {/* §3.3 item 4 */}
        <div className="trip-days-list">
          <div className="trip-kicker trip-kicker-standalone">Days</div>
          {rows.map((row) => (
            <DayReviewRow
              key={row.day.id}
              row={row}
              totalDays={days.length}
              dateLabel={dateLabels[row.index]}
              onMoveUp={() => moveUp(row.index)}
              onMoveDown={() => moveDown(row.index)}
              onRemoveStop={(id) => removeStopFromDay(row.index, id)}
              onOpenPlanner={() => openInPlanner(row.index)}
              onReset={() => row.hub && resetDay(row.index, row.hub)}
            />
          ))}
        </div>

        {/* §3.3 item 5 */}
        <div className="trip-todo">
          <div className="trip-todo-kicker">Still to sort · {todoItems.length}</div>
          {todoItems.map((t) => (
            <div key={t.id} className="trip-todo-item">
              <span className="trip-todo-bullet" aria-hidden="true">
                ·
              </span>
              <div>{t.node}</div>
            </div>
          ))}
        </div>

        {/* §3.3 item 6 */}
        <div className="trip-card trip-numbers">
          <div className="trip-kicker">The trip in numbers</div>
          <div className="trip-numbers-row">
            <span>Distilleries visited</span>
            <strong>
              {distilleryCount} of {distilleries.length}
            </strong>
          </div>
          <div className="trip-numbers-row">
            <span>Time on the road</span>
            <strong>≈{formatDuration(totalDrive)}</strong>
          </div>
          <div className="trip-numbers-row trip-numbers-total">
            <span>Indicative cost</span>
            <strong>{formatMoney(totalCost)}pp</strong>
          </div>
          <div className="trip-numbers-caption">Tours only — no travel, food or stays.</div>
        </div>

        {/* §3.3 item 7 - undecided whether a saved trip needs login
            (design doc §8, open question 6) - both buttons are present
            per the copy deck but inert, rather than either building
            real persistence/email infra or silently doing nothing with
            no explanation. Flagged in the Phase 3 report. */}
        <div className="trip-actions">
          <button type="button" className="trip-btn trip-btn-ghost" disabled aria-disabled="true">
            Save as a tour
          </button>
          <button type="button" className="trip-btn trip-btn-primary" disabled aria-disabled="true">
            Email this trip to myself
          </button>
        </div>
        <p className="trip-actions-note">
          Saving and emailing are coming soon — for now, this page is yours to bookmark.
        </p>
      </div>

      {datesOpen && (
        <div className="tour-picker-backdrop" onClick={() => setDatesOpen(false)}>
          <div
            className="tour-picker-modal"
            role="dialog"
            aria-label="Your travel dates"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="tour-picker-close" onClick={() => setDatesOpen(false)} aria-label="Close">
              &times;
            </button>
            <div className="tour-picker-heading">When are you arriving?</div>
            <div className="event-mode-toggle" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className={"event-mode-btn" + (td.mode === "range" ? " active" : "")}
                onClick={() => trip.setDateMode("range")}
              >
                Dates
              </button>
              <button
                type="button"
                className={"event-mode-btn" + (td.mode === "month" ? " active" : "")}
                onClick={() => trip.setDateMode("month")}
              >
                Month
              </button>
            </div>
            {td.mode === "range" ? (
              <DateRangePicker
                startDate={td.startDate}
                endDate={td.endDate}
                onChange={(start, end) => trip.setDateRange(start, end)}
              />
            ) : (
              <input
                type="month"
                className="event-date-input"
                value={td.month}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => trip.setDateMonth(e.target.value)}
              />
            )}
            <button type="button" className="trip-btn trip-btn-primary" style={{ marginTop: 16 }} onClick={() => setDatesOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
