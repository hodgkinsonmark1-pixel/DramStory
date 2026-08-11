"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { Distillery, HubDay } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { baseDisplayName, describePicks, findBaseAccommodation } from "@/lib/trip-answers";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { formatDuration } from "@/lib/drive-time";
import { driveMinutesForDay, pickHitsFor, dayPriceLabel, deriveHook } from "@/lib/day-derivations";
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
  const baseAccommodation = findBaseAccommodation(base, baseKind) ?? FEATURED_STAYS[0];
  const baseName = baseDisplayName(base, baseKind);

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
        <span className="hero-days-header-total">
          {total} {total === 1 ? "day" : "days"} in all
        </span>
      </div>

      {hitEntries.map((entry, i) => (
        <HeroDayCard
          key={entry.day.id}
          entry={entry}
          picks={picks}
          index={i}
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
          cardRef={(el) => {
            if (el) cardRefs.current.set(entry.day.id, el);
            else cardRefs.current.delete(entry.day.id);
          }}
        />
      ))}

      <a href="/days" className="hero-days-foot">
        See all {total} {total === 1 ? "day" : "days"} →
      </a>
    </div>
  );
}

function HeroDayCard({
  entry,
  picks,
  index,
  cardRef,
}: {
  entry: DayEntry;
  picks: string[];
  index: number;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const { day, driveMinutes, hits, price } = entry;
  const hook = deriveHook(day.narrative);
  const driveLabel = driveMinutes > 0 ? `≈${formatDuration(driveMinutes)} on the road` : "";
  const metaText = [driveLabel, price].filter(Boolean).join(" · ");

  return (
    <div
      ref={cardRef}
      className={"days-hub-card hero-days-card-enter" + (hits.length > 0 ? " hit" : "")}
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
        <h3 className="days-hub-card-title">{day.name}</h3>
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
            <p className="days-hub-card-hook">{hook}</p>
          </div>
        )}
      </div>
    </div>
  );
}
