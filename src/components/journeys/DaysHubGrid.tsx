"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Distillery, HubDay } from "@/lib/types";
import { useTrip, DEFAULT_TRIP_ANSWERS } from "@/lib/trip-context";
import { findBaseAccommodation, baseDisplayName } from "@/lib/trip-answers";
import { FEATURED_STAYS } from "@/lib/featured-stays";
import { formatDuration } from "@/lib/drive-time";
import { PacingTag } from "@/components/PacingTag";
import {
  type DayGroupId,
  GROUP_ORDER,
  GROUP_LABELS,
  driveMinutesForDay,
  travelCopy,
  dayGroupFor,
  pickHitsFor,
  dayPriceLabel,
  deriveHook,
  hasMoreNarrative,
  fullNarrativeText,
  isFerryDay,
  itineraryDayFromHubDay,
  milestoneFor,
} from "@/lib/day-derivations";
import DaysTripBar from "@/components/journeys/DaysTripBar";

/**
 * /days rebuild (Days/Trip flow Phase 2, docs/days-trip-flow-handoff.md
 * §3.2/§4/§5). Was a flat filterable list with a distillery dropdown -
 * per §1 ("This design turns the same content into a planning flow")
 * that dropdown is gone: `answers.picks` now RE-SORTS the list into a
 * "days with your distilleries" section instead of hiding anything
 * (§4.1 - ranking, never filtering). The existing "+ Add this day to my
 * trip" mechanism (addDay/addStop/setTourForStop/addFeatureStop) is
 * unchanged underneath - only restyled/regrouped around, per the task
 * brief.
 *
 * JUDGEMENT CALL: dropped the per-card route map (HubDayMap) and the
 * feature-stop chip row along with the dropdown/expand-narrative UI -
 * the design doc's own card anatomy (§3.2: "pace tag · drive · price →
 * title → route line → hook → one action") and the reference prototype's
 * day cards don't include a map thumbnail or chips at all; the route
 * line text already carries the same "which distilleries, in what
 * order" information. Also dropped the old "View your trip (N days
 * added)" quiet pill - the new persistent trip bar (always visible,
 * richer) supersedes it rather than sitting alongside it.
 */

interface DayEntry {
  day: HubDay;
  driveMinutes: number;
  group: DayGroupId;
  hits: string[];
  price: string;
}

function DayCard({
  entry,
  picks,
  justAdded,
  onAdd,
}: {
  entry: DayEntry;
  picks: string[];
  justAdded: boolean;
  onAdd: (day: HubDay) => void;
}) {
  const { day, driveMinutes, hits, price } = entry;
  const trip = useTrip();

  /** Derived from the actual trip, not a local timer - the "added" state
   *  stays true for as long as this Hub Day really is in the trip, and
   *  reverts if the visitor removes it. Unchanged from the pre-Phase-2
   *  implementation. */
  const addedIndex = trip.days.findIndex((d) => d.sourceHubDaySlug === day.slug);
  const isAdded = addedIndex !== -1;

  /** Same add-to-trip mechanism as before Phase 2 (addDay/addStop/
   *  setTourForStop/addFeatureStop, in that order) - onAdd(day) is called
   *  first so the parent can compute the milestone toast from the trip as
   *  it stood BEFORE this day was added. newDayIndex now comes from
   *  addDay()'s own return value rather than a precomputed
   *  trip.days.length, since addDay may replace /journey's blank starter
   *  day in place at index 0 instead of appending - see trip-context.tsx's
   *  addDay for why (11 Aug 2026, Mark's request). */
  function handleAddToTrip() {
    onAdd(day);
    const newDayIndex = trip.addDay(day.slug);
    // The Day's own order, features included - same list the day screen,
    // the schedule and the map use (itineraryDayFromHubDay), so a day
    // added to a trip arrives in the order it is published in rather
    // than every distillery first and the cafes tacked on the end.
    for (const stop of itineraryDayFromHubDay(day).stops) {
      if (stop.kind === "distillery") {
        trip.addStop(newDayIndex, stop.distillery, stop.anchor);
        if (stop.tour) trip.setTourForStop(newDayIndex, stop.distillery, stop.tour);
      } else {
        trip.addFeatureStop(newDayIndex, stop.feature);
      }
    }
    trip.setCurrentDayIndex(newDayIndex);
  }

  const hook = deriveHook(day.narrative);
  const hasMore = hasMoreNarrative(day.narrative);
  const [expanded, setExpanded] = useState(false);
  // Verb follows the Day's own Travel Mode - a walking day shouldn't be
  // labelled "on the road" (17 Aug 2026).
  const driveLabel = driveMinutes > 0 ? `≈${formatDuration(driveMinutes)} ${travelCopy(day.travelMode).wholeDay}` : "";
  const metaText = [driveLabel, price].filter(Boolean).join(" · ");

  return (
    <div
      className={[
        "days-hub-card",
        isAdded ? "in-trip" : "",
        hits.length > 0 ? "hit" : "",
        justAdded ? "days-pop" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hits.length > 0 && (
        <div className="days-hub-hit-banner">
          ★ Includes{" "}
          {hits.length === 1 ? hits[0] : `${hits.slice(0, -1).join(", ")} and ${hits[hits.length - 1]}`}
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
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {hasMore && (
                <button
                  type="button"
                  className="days-hub-card-hook-toggle"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
              {/* Added 13 Aug 2026 alongside the new /days/[slug] page -
                  the inline "Read more" toggle above is quick scanning
                  in place, this is a real navigation to that Day's own
                  full page (narrative, stops, transport note, map).
                  Both kept: neither replaces the other. */}
              <Link href={`/days/${day.slug}`} className="days-hub-card-hook-toggle">
                Full day &rarr;
              </Link>
            </div>
          </div>
        )}
        {isAdded ? (
          <button
            className="days-hub-card-action in-trip"
            onClick={() => trip.removeDay(addedIndex)}
            aria-label={`Remove ${day.name} from your trip`}
          >
            ✓ Day {addedIndex + 1} of your trip · remove
          </button>
        ) : (
          <button className="days-hub-card-action" onClick={handleAddToTrip}>
            + Add as a day
          </button>
        )}
      </div>
    </div>
  );
}

export default function DaysHubGrid({ days, distilleries }: { days: HubDay[]; distilleries: Distillery[] }) {
  const trip = useTrip();
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const base = trip.answers?.base ?? DEFAULT_TRIP_ANSWERS.base;
  const baseKind = trip.answers?.baseKind ?? DEFAULT_TRIP_ANSWERS.baseKind;
  const nights = trip.answers?.nights ?? DEFAULT_TRIP_ANSWERS.nights;
  const picks = trip.answers?.picks ?? DEFAULT_TRIP_ANSWERS.picks;

  const baseAccommodation = findBaseAccommodation(base, baseKind) ?? FEATURED_STAYS[0];
  const baseName = baseDisplayName(base, baseKind);

  const entries: DayEntry[] = useMemo(
    () =>
      days.map((day) => {
        const driveMinutes = driveMinutesForDay(day, baseAccommodation);
        return {
          day,
          driveMinutes,
          group: dayGroupFor(day, driveMinutes),
          hits: pickHitsFor(day, picks),
          price: dayPriceLabel(day),
        };
      }),
    // baseAccommodation is re-looked-up each render but is stable in
    // shape (name/lat/lng) for a given base/baseKind pair, so depending
    // on those two primitives (rather than the object reference) avoids
    // recomputing every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, base, baseKind, picks]
  );

  const sorted = useMemo(() => [...entries].sort((a, b) => a.driveMinutes - b.driveMinutes), [entries]);

  const hitEntries = picks.length > 0 ? sorted.filter((e) => e.hits.length > 0) : [];
  const hitDayIds = new Set(hitEntries.map((e) => e.day.id));
  const restEntries = sorted.filter((e) => !hitDayIds.has(e.day.id));

  // "{n} days work well from {base}" (§3.2/§10 copy deck) - the design
  // doc doesn't formally define "work well" beyond that headline, so
  // per the reference prototype's own intent (close/short-drive days are
  // the easy sell; a big trek or a ferry crossing is the exception), this
  // counts the easy + short-drive groups. JUDGEMENT CALL, flagged since
  // it's an editorial heuristic rather than a literal spec formula.
  const worksCount = sorted.filter((e) => e.group === "easy" || e.group === "mid").length;
  const pickHitCount = hitEntries.length;

  const headline = `${worksCount} ${worksCount === 1 ? "day" : "days"} work well from ${baseName}`;
  const singlePickName = picks.length === 1 ? distilleries.find((d) => d.slug === picks[0])?.name : undefined;
  const subline =
    picks.length > 0
      ? `${pickHitCount} of them include ${singlePickName ?? "a distillery you picked"}`
      : "Sorted by how far you'd drive from your door";

  const pickedNames = picks
    .map((slug) => distilleries.find((d) => d.slug === slug)?.name)
    .filter((n): n is string => Boolean(n));

  /** Computes the milestone toast from the trip as it stood BEFORE this
   *  add (DayCard.handleAddToTrip calls this first, then mutates) - the
   *  trip context's own setDays/addDay calls don't apply synchronously,
   *  so reading trip.days right after calling addDay() would still see
   *  the old array. */
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

  // Trip bar totals - read straight from the live trip (not the
  // milestone snapshot above, which is only a point-in-time value for
  // the toast's wording at the moment of adding).
  const tripDistillerySlugs = new Set(
    trip.days.flatMap((d) => d.stops.filter((s) => s.kind === "distillery").map((s) => s.distillery.slug))
  );
  const tripCost = trip.days.reduce(
    (sum, d) =>
      sum + d.stops.reduce((s, stop) => s + (stop.kind === "distillery" ? stop.tour?.price ?? 0 : 0), 0),
    0
  );

  return (
    <>
      <div className="days-hub-panel">
        <h2 className="days-hub-headline">{headline}</h2>
        <div className="days-hub-subline">{subline}</div>

        {hitEntries.length > 0 && (
          <>
            <div className="days-hub-group-block">
              <h3 className="days-hub-group-header">
                The days with your distilleries <span className="days-hub-group-count">{hitEntries.length}</span>
              </h3>
              <div className="days-hub-group-sub">
                {pickedNames.join(", ")} — shown first, but nothing below is hidden
              </div>
            </div>
            {hitEntries.map((entry) => (
              <DayCard
                key={entry.day.id}
                entry={entry}
                picks={picks}
                justAdded={justAddedId === entry.day.id}
                onAdd={handleMilestone}
              />
            ))}
            <div className="days-hub-rule">
              <div className="days-hub-rule-line" />
              <div className="days-hub-rule-label">Everything else</div>
              <div className="days-hub-rule-line" />
            </div>
          </>
        )}

        {GROUP_ORDER.filter((g) => restEntries.some((e) => e.group === g)).map((g) => {
          const inGroup = restEntries.filter((e) => e.group === g);
          return (
            <div key={g}>
              <div className="days-hub-group-block">
                <h3 className="days-hub-group-header">
                  {GROUP_LABELS[g].title} <span className="days-hub-group-count">{inGroup.length}</span>
                </h3>
                <div className="days-hub-group-sub">{GROUP_LABELS[g].sub}</div>
              </div>
              {inGroup.map((entry) => (
                <DayCard
                  key={entry.day.id}
                  entry={entry}
                  picks={picks}
                  justAdded={justAddedId === entry.day.id}
                  onAdd={handleMilestone}
                />
              ))}
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{ fontSize: 14, color: "var(--slate)", padding: "40px 0" }}>
            No Days are ready to show yet.
          </div>
        )}
      </div>

      <DaysTripBar
        dayCount={trip.days.length}
        distilleryCount={tripDistillerySlugs.size}
        totalDistilleries={distilleries.length}
        costTotal={tripCost}
        nights={nights}
        milestone={milestone}
        justAdded={justAddedId !== null}
      />
    </>
  );
}
