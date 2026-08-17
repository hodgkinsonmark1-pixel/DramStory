"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Distillery, HubDay } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { baseDisplayName, describePicks, findBaseAccommodation } from "@/lib/trip-answers";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { formatDuration } from "@/lib/drive-time";
import {
  driveMinutesForDay,
  travelCopy,
  pickHitsFor,
  dayPriceLabel,
  deriveHook,
  hasMoreNarrative,
  fullNarrativeText,
  milestoneFor,
  isFerryDay,
} from "@/lib/day-derivations";
import { PacingTag } from "@/components/PacingTag";

/** How many non-matching days to preview under "Everything else" before
 *  handing off to /days. The reference screenshot (hero-02) shows the
 *  same shape - two picked matches, one "everything else" example - for
 *  a column that has to fit inside a 100vh hero rather than a whole
 *  page. JUDGEMENT CALL: the design doc doesn't give an exact number for
 *  this compact preview (only the full /days page's grouping is fully
 *  specified) - 3 keeps the column readable without scrolling on most
 *  screens while still showing real variety. */
const EVERYTHING_ELSE_PREVIEW = 3;

interface DayEntry {
  day: HubDay;
  driveMinutes: number;
  hits: string[];
  price: string;
}

/**
 * State two's planning column (docs/hero-handoff.md §4.1, Phase 2 of §9).
 * Ranking/highlighting reuses the exact same day-derivations.ts functions
 * DaysHubGrid.tsx (the full /days page) ranks against - "the desktop
 * column is the same component with more room, not a second
 * implementation" (§4.1) is honoured at the logic layer here (identical
 * driveMinutesForDay/pickHitsFor/dayPriceLabel) and at the visual layer
 * by each HeroDayCard reusing days-hub.css's .days-hub-card classes
 * verbatim - it does NOT reuse DaysHubGrid's own DayCard component
 * directly, because that card also renders the "+ Add as a day" action
 * and a "Read more" narrative toggle, neither of which the reference
 * screenshots show on this compact preview (adding a day for real only
 * ever happens once a visitor is on /days itself).
 *
 * Re-sorting on answer change animates via FLIP (First-Last-Invert-Play,
 * §2.3: "Cards animate to new positions. Never blink.") - since cards
 * are keyed by day.id, React itself moves the existing DOM nodes rather
 * than recreating them when order changes, which is what makes measuring
 * their before/after position workable without a library.
 *
 * 11 Aug 2026: added the "Read more" narrative toggle back in (Mark's
 * request) - the header comment above originally listed this as one of
 * two things deliberately left out of this compact card (the other,
 * "+ Add as a day", stays out - adding a day for real still only makes
 * sense once a visitor is on /days itself). Reuses hasMoreNarrative()/
 * fullNarrativeText() and the exact same .days-hub-card-hook-toggle
 * markup/CSS DaysHubGrid's own DayCard already uses, so the two stay
 * visually identical rather than drifting into two implementations.
 */
export function HeroDaysColumn({
  days,
  distilleries,
  announce,
}: {
  days: HubDay[];
  distilleries: Distillery[];
  /** Called once, the first time this column has real content, with the
   *  "N days, {header}" summary for a screen reader (§6: "role=status on
   *  a live region... screen reader users get no benefit from a reflow
   *  they cannot see"). Only passed by Hero.tsx when THIS reveal was the
   *  visitor's own button press this session - never on a returning
   *  visitor's hydration-driven reveal, which isn't a reflow they need
   *  telling about. */
  announce?: (text: string) => void;
}) {
  const trip = useTrip();
  const announcedRef = useRef(false);

  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const picks = trip.answers?.picks ?? DEFAULT_TRIP_ANSWERS.picks;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const baseAccommodation = findBaseAccommodation(base, baseKind) ?? FEATURED_STAYS[0];
  const baseName = baseDisplayName(base, baseKind);

  /** Pop animation + milestone toast (11 Aug 2026, Mark's request - back
   *  in after being left out of the first pass) - same
   *  justAddedId/milestone/timerRef pattern and same milestoneFor() copy
   *  DaysHubGrid.tsx's own parent component uses, reusing its
   *  .days-milestone-toast verbatim (it's position:fixed against the
   *  viewport, not this column, so it renders correctly regardless of
   *  being mounted inside the hero's narrower right column). Unlike
   *  DaysHubGrid, there's no persistent .days-trip-bar here for the
   *  toast to sit above - the hero has no permanent "your trip so far"
   *  strip of its own - so the toast is the only new visible element, a
   *  deliberately smaller footprint than /days's full pairing. */
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMilestone(day: HubDay) {
    const existingSlugs = new Set(
      trip.days.flatMap((d) => d.stops.filter((s) => s.kind === "distillery").map((s) => s.distillery.slug))
    );
    for (const stop of day.stops) existingSlugs.add(stop.distillery.slug);
    const dayCount = trip.days.length + 1;
    const msg = milestoneFor({
      dayCount,
      distilleryCount: existingSlugs.size,
      nights,
      ferryDay: isFerryDay(day),
    });
    setJustAddedId(day.id);
    setMilestone(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setJustAddedId(null);
      setMilestone(null);
    }, 2800);
  }

  const entries: DayEntry[] = useMemo(
    () =>
      days.map((day) => ({
        day,
        driveMinutes: driveMinutesForDay(day, baseAccommodation),
        hits: pickHitsFor(day, picks),
        price: dayPriceLabel(day),
      })),
    // baseAccommodation is re-looked-up each render but stable in shape
    // for a given base/baseKind pair - same reasoning/pattern as
    // DaysHubGrid's own identical entries useMemo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, base, baseKind, picks]
  );

  const sorted = useMemo(() => [...entries].sort((a, b) => a.driveMinutes - b.driveMinutes), [entries]);
  const hitEntries = picks.length > 0 ? sorted.filter((e) => e.hits.length > 0) : [];
  const hitIds = new Set(hitEntries.map((e) => e.day.id));
  const restEntries = sorted.filter((e) => !hitIds.has(e.day.id)).slice(0, EVERYTHING_ELSE_PREVIEW);

  const total = sorted.length;
  const headerLabel =
    picks.length > 0 ? `The days with ${describePicks(picks, distilleries)}` : `Closest to ${baseName}`;

  const visibleEntries = [...hitEntries, ...restEntries];

  // ---- FLIP re-sort (§2.3) ----------------------------------------
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRects = useRef(new Map<string, DOMRect>());
  const orderKey = visibleEntries.map((e) => e.day.id).join("|");

  useLayoutEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextRects = new Map<string, DOMRect>();
    for (const entry of visibleEntries) {
      const el = cardRefs.current.get(entry.day.id);
      if (el) nextRects.set(entry.day.id, el.getBoundingClientRect());
    }
    if (!prefersReduced) {
      for (const entry of visibleEntries) {
        const el = cardRefs.current.get(entry.day.id);
        const prev = prevRects.current.get(entry.day.id);
        const next = nextRects.get(entry.day.id);
        if (!el || !prev || !next) continue;
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (dx === 0 && dy === 0) continue;
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        // Force a reflow so the browser registers the "First" position
        // above before the transition below is allowed to take effect -
        // without this the two style writes coalesce into one and there
        // is nothing to animate from.
        void el.offsetHeight;
        el.style.transition = "transform 450ms cubic-bezier(.22,.68,.32,1)";
        el.style.transform = "";
      }
    }
    prevRects.current = nextRects;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  useLayoutEffect(() => {
    if (!announce || announcedRef.current || total === 0) return;
    announcedRef.current = true;
    announce(`${total} ${total === 1 ? "day" : "days"}, ${headerLabel.toLowerCase()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announce, total]);

  if (total === 0) {
    return <div className="hero-days-empty">No Days are ready to show yet.</div>;
  }

  return (
    <div className="hero-days-column">
      <div className="hero-days-header">
        <span className="hero-days-header-title">
          {headerLabel}
          {picks.length > 0 && ` · ${hitEntries.length}`}
        </span>
        <a href="/days" className="hero-days-header-total">
          {total} {total === 1 ? "day" : "days"} in all →
        </a>
      </div>

      {hitEntries.map((entry, i) => (
        <HeroDayCard
          key={entry.day.id}
          entry={entry}
          picks={picks}
          index={i}
          justAdded={justAddedId === entry.day.id}
          onAdd={handleMilestone}
          cardRef={(el) => {
            if (el) cardRefs.current.set(entry.day.id, el);
            else cardRefs.current.delete(entry.day.id);
          }}
        />
      ))}

      {hitEntries.length > 0 && restEntries.length > 0 && (
        <div className="days-hub-rule">
          <div className="days-hub-rule-line" />
          <div className="days-hub-rule-label">Everything else</div>
          <div className="days-hub-rule-line" />
        </div>
      )}

      {restEntries.map((entry, i) => (
        <HeroDayCard
          key={entry.day.id}
          entry={entry}
          picks={picks}
          index={hitEntries.length + i}
          justAdded={justAddedId === entry.day.id}
          onAdd={handleMilestone}
          cardRef={(el) => {
            if (el) cardRefs.current.set(entry.day.id, el);
            else cardRefs.current.delete(entry.day.id);
          }}
        />
      ))}

      <a href="/days" className="hero-days-foot">
        See all {total} {total === 1 ? "day" : "days"} →
      </a>

      {milestone && (
        <div className="days-milestone-toast" role="status">
          {milestone}
        </div>
      )}
    </div>
  );
}

function HeroDayCard({
  entry,
  picks,
  index,
  justAdded,
  onAdd,
  cardRef,
}: {
  entry: DayEntry;
  picks: string[];
  index: number;
  /** True for as long as this card's own days-pop animation should be
   *  playing - mirrors DaysHubGrid's DayCard prop of the same name. */
  justAdded: boolean;
  /** Called with the HubDay BEFORE any trip mutation, so the parent can
   *  compute the milestone toast off the trip as it stood beforehand -
   *  same contract/reasoning as DaysHubGrid.tsx's own onAdd prop. */
  onAdd: (day: HubDay) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const trip = useTrip();
  const { day, driveMinutes, hits, price } = entry;
  const hook = deriveHook(day.narrative);
  const hasMore = hasMoreNarrative(day.narrative);
  const [expanded, setExpanded] = useState(false);
  // Verb follows the Day's own Travel Mode - see DaysHubGrid's own copy
  // of this line, which this deliberately mirrors (17 Aug 2026).
  const driveLabel = driveMinutes > 0 ? `≈${formatDuration(driveMinutes)} ${travelCopy(day.travelMode).wholeDay}` : "";
  const metaText = [driveLabel, price].filter(Boolean).join(" · ");

  /** "Read more" sits inline at the end of the (unexpanded) teaser text,
   *  right after deriveHook()'s own trailing "…" (11 Aug 2026, Mark's
   *  request - first pass moved it inline AND dropped the "…", he wants
   *  the "…" kept). Only matters pre-expansion; the full narrative never
   *  carries a trailing "…" to begin with. */

  /** Same add-to-trip mechanism DaysHubGrid.tsx's own DayCard uses
   *  (onAdd(day) first so the parent can snapshot milestone data off the
   *  trip as it stood before, then addDay/addStop/setTourForStop/
   *  addFeatureStop, in that order) - 11 Aug 2026, Mark's request: "so
   *  the trip process can begin" from here too, not only once a visitor
   *  reaches /days. newDayIndex now comes from addDay()'s own return
   *  value (not a precomputed trip.days.length) since addDay may replace
   *  /journey's blank starter day in place at index 0 rather than
   *  appending - see trip-context.tsx's addDay for why. */
  const addedIndex = trip.days.findIndex((d) => d.sourceHubDaySlug === day.slug);
  const isAdded = addedIndex !== -1;
  function handleAddToTrip() {
    onAdd(day);
    const newDayIndex = trip.addDay(day.slug);
    for (const stop of day.stops) {
      trip.addStop(newDayIndex, stop.distillery, stop.anchor);
      if (stop.tour) trip.setTourForStop(newDayIndex, stop.distillery, stop.tour);
    }
    for (const feature of day.featureStops) {
      trip.addFeatureStop(newDayIndex, feature);
    }
  }

  return (
    <div
      ref={cardRef}
      className={
        "days-hub-card hero-days-card-enter" + (hits.length > 0 ? " hit" : "") + (justAdded ? " days-pop" : "")
      }
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {hits.length > 0 && (
        <div className="days-hub-hit-banner">
          ★ Includes {hits.length === 1 ? hits[0] : `${hits.slice(0, -1).join(", ")} and ${hits[hits.length - 1]}`}
        </div>
      )}
      <div className="days-hub-card-body">
        <div className="days-hub-card-meta">
          <PacingTag pacing={day.pacing} />
          {metaText && <span className="days-hub-card-meta-text">{metaText}</span>}
        </div>
        {isAdded ? (
          <Link href={`/days/${day.slug}?trip=${addedIndex}`} className="days-hub-card-title-link">
            <h3 className="days-hub-card-title">{day.name}</h3>
          </Link>
        ) : (
          <h3 className="days-hub-card-title">{day.name}</h3>
        )}
        {day.stops.length > 0 && (
          <div className="days-hub-card-route">
            {day.stops.map((stop, i) => (
              <span key={`${stop.distillery.slug}-${i}`}>
                {i > 0 && <span className="days-hub-card-sep"> → </span>}
                <span className={picks.includes(stop.distillery.slug) ? "days-hub-card-route-hit" : undefined}>
                  {stop.distillery.name}
                </span>
              </span>
            ))}
          </div>
        )}
        {hook && (
          <div className="days-hub-card-hook-block">
            <p className={`days-hub-card-hook${expanded ? " expanded" : ""}`}>
              {expanded ? fullNarrativeText(day.narrative) : hook}
              {hasMore && (
                <button
                  type="button"
                  className="days-hub-card-hook-toggle"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                >
                  {expanded ? " Show less" : " Read more"}
                </button>
              )}
            </p>
          </div>
        )}
        {isAdded ? (
          // Second button (11 Aug 2026, Mark's request) - once a day is
          // added there was no way from the hero itself to see the trip
          // it's building, only the per-card remove action. Links to the
          // same /trip review page DaysTripBar's "Review" button already
          // points at elsewhere on the site - not a new destination.
          <div className="days-hub-card-actions">
            <button
              type="button"
              className="days-hub-card-action in-trip"
              onClick={() => trip.removeDay(addedIndex)}
              aria-label={`Remove ${day.name} from your trip`}
            >
              ✓ Day {addedIndex + 1} of your trip · remove
            </button>
            {/* Opens in a new tab (11 Aug 2026, Mark's request) - unlike
                the "✓ Day N of your trip" button beside it (an in-place
                edit), this is a read-only look at the trip elsewhere on
                the site; a new tab keeps the visitor's place in the
                hero rather than navigating them away from it. */}
            <a href="/trip" target="_blank" rel="noopener noreferrer" className="days-hub-card-action">
              View trip so far →
            </a>
          </div>
        ) : (
          <button type="button" className="days-hub-card-action" onClick={handleAddToTrip}>
            + Add as a day
          </button>
        )}
      </div>
    </div>
  );
}
