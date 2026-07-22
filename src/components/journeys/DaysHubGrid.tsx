"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HubDay } from "@/lib/types";
import HubDayMap from "@/components/journeys/HubDayMap";
import { useTrip } from "@/lib/trip-context";

/** Opens (or, if already open, refocuses) a single dedicated tab for the
 *  trip workspace - a fixed window target name is the browser-native way
 *  to get "reuse the same tab on repeat calls, or open a fresh one if the
 *  visitor closed it" without any custom messaging. Deliberately NOT
 *  called on every "+ Add this day" click (see handleAddToTrip below) -
 *  a visitor building a trip Day-by-Day from this page should be able to
 *  stay right here; this is only for the explicit "View your trip" link
 *  that appears once something's actually been added. */
function openTripTab() {
  window.open("/journey?resume=1", "dramstory-journey");
}

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same helper used on Distillery/Explore pages. */
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

function PacingTag({ pacing }: { pacing: HubDay["pacing"] }) {
  const tone =
    pacing === "Relaxed"
      ? { bg: "var(--green-light)", fg: "var(--green-deep)" }
      : pacing === "Moderate"
      ? { bg: "var(--amber-pale)", fg: "var(--copper)" }
      : { bg: "#F7E6E0", fg: "#B5502E" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {pacing}
    </span>
  );
}

function DayCard({ day, onAdded }: { day: HubDay; onAdded: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = day.narrative.length > 380;
  const trip = useTrip();

  /** Derived from the actual trip, not a local timer - so the "Added"
   *  state (22 July 2026 fix) stays true for as long as this Hub Day
   *  really is in the trip, and only reverts if the visitor removes that
   *  day. addDay() tags the new day with day.slug via sourceHubDaySlug
   *  specifically so this can be checked here. */
  const isAdded = trip.days.some((d) => d.sourceHubDaySlug === day.slug);

  /** Adds this Day as a brand-new day in the visitor's trip (never merged
   *  into whatever day they currently have open - a Hub Day is a complete
   *  curated day in its own right), using the same addDay/addStop/
   *  setTourForStop functions every other "add to trip" action in the app
   *  already writes through. newDayIndex is captured from trip.days.length
   *  BEFORE addDay() is called, since addDay always appends exactly one
   *  day at the end - reading it after would risk a stale value, since
   *  React doesn't apply the state update synchronously within this same
   *  handler.
   *
   *  Deliberately does NOT navigate this tab away (22 July 2026 fix) - it
   *  used to router.push to /journey, which was fine for a visitor who'd
   *  opened the Days Hub as their only tab, but broke the "keep Days Hub
   *  open, add several Days in a row" flow: a visitor with the workspace
   *  already open in another tab (e.g. from the homepage, or via the
   *  onboarding walkthrough's "open in new tab" links) would click Add,
   *  get yanked out of the Days Hub into a second, redundant workspace
   *  tab, and lose the one they came from entirely. The write to
   *  localStorage (via TripProvider's existing persist effect) plus the
   *  cross-tab `storage` event listener added to trip-context.tsx now
   *  updates any already-open workspace tab live, in the background,
   *  without touching this tab at all. */
  function handleAddToTrip() {
    const newDayIndex = trip.days.length;
    trip.addDay(day.slug);
    for (const stop of day.stops) {
      trip.addStop(newDayIndex, stop.distillery);
      if (stop.tour) trip.setTourForStop(newDayIndex, stop.distillery, stop.tour);
    }
    for (const feature of day.featureStops) {
      trip.addFeatureStop(newDayIndex, feature);
    }
    trip.setCurrentDayIndex(newDayIndex);
    onAdded();
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--stone)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {/* Visual: split hero images for 2-stop Multi Days, single hero for
            Solo Days, else real map, else placeholder */}
        <div
          style={{
            width: 280,
            minWidth: 220,
            flexShrink: 0,
            minHeight: 200,
            position: "relative",
            overflow: "hidden",
            display: day.heroImageUrls ? "flex" : undefined,
            ...(day.heroImageUrl || day.heroImageUrls || day.mapDistilleries
              ? {}
              : {
                  background:
                    "repeating-linear-gradient(45deg, var(--stone), var(--stone) 10px, var(--off-white) 10px, var(--off-white) 20px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }),
          }}
        >
          {day.heroImageUrls ? (
            day.heroImageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={day.distilleries[i] ?? day.name}
                style={{ width: "50%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ))
          ) : day.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={day.heroImageUrl}
              alt={day.distilleries[0] ?? day.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : day.mapDistilleries && day.mapDistilleries.length > 0 ? (
            <HubDayMap distilleries={day.mapDistilleries} featureStops={day.mapFeatures} />
          ) : (
            <span style={{ fontSize: 12, color: "var(--slate)", fontWeight: 500 }}>
              [ Map placeholder ]
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 280, padding: "24px 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: 24,
                color: "var(--dark)",
                margin: 0,
              }}
            >
              {day.name}
            </h2>
            <PacingTag pacing={day.pacing} />
          </div>

          {/* Quick-scan distillery list */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: day.featureStops.length > 0 ? 8 : 14 }}>
            {day.distilleries.map((d, i) => (
              <span
                key={`${d}-${i}`}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--dark)",
                  background: "var(--green-light)",
                  padding: "4px 12px",
                  borderRadius: 100,
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Quick-scan feature-stop icons (22 July 2026) - surfaces the
              non-distillery stops (a beach, a walk, a historic site) a
              Day's narrative links to, at a glance, using each Local
              Feature's own Icon field. Previously this was invisible
              unless you read the full narrative, which made every card
              read as "just a distillery" regardless of what else was in
              the day - this is also what was making cards look uniform
              when several sat in the page's vertical flow. */}
          {day.featureStops.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {day.featureStops.map((f) => (
                <span
                  key={f.id}
                  title={f.name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--copper)",
                    background: "var(--amber-pale)",
                    padding: "4px 10px 4px 8px",
                    borderRadius: 100,
                  }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{f.icon}</span>
                  {f.name}
                </span>
              ))}
            </div>
          )}

          {/* Narrative */}
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--peat)",
              marginBottom: isLong ? 6 : 18,
              maxWidth: 560,
              ...(isLong && !expanded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }
                : {}),
            }}
          >
            {renderWithLinks(day.narrative)}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 18,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--copper)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              {expanded ? "See less" : "See more"}
            </button>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "20px 32px",
              marginBottom: 4,
              fontSize: 13,
              color: "var(--peat)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 2 }}>
                From Port Ellen
              </div>
              <div style={{ fontWeight: 600, color: "var(--dark)" }}>{day.durationPortEllen}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 2 }}>
                From Bowmore
              </div>
              <div style={{ fontWeight: 600, color: "var(--dark)" }}>{day.durationBowmore}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 2 }}>
                Indicative distillery cost
              </div>
              <div style={{ fontWeight: 600, color: "var(--copper)" }}>{day.cost}</div>
            </div>

            <button
              style={{
                marginLeft: "auto",
                padding: "9px 18px",
                background: isAdded ? "var(--green-light)" : "white",
                color: isAdded ? "var(--green-deep)" : "var(--copper)",
                border: `1px solid ${isAdded ? "var(--green-deep)" : "var(--copper)"}`,
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={handleAddToTrip}
              title={isAdded ? "Already in your trip - click to add another copy of this day" : undefined}
            >
              {isAdded ? "✓ Added to your trip" : "+ Add this day to my trip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DaysHubGrid({ days }: { days: HubDay[] }) {
  const [selectedDistillery, setSelectedDistillery] = useState<string>("all");
  const [addedCount, setAddedCount] = useState(0);

  const distilleryOptions = useMemo(
    () => [...new Set(days.flatMap((d) => d.distilleries))].sort(),
    [days]
  );

  const filteredDays = useMemo(() => {
    if (selectedDistillery === "all") return days;
    return days.filter((d) => d.distilleries.includes(selectedDistillery));
  }, [days, selectedDistillery]);

  return (
    <>
      {/* Appears once at least one Day's been added this visit - a
          deliberately quiet, non-blocking way to go see the trip
          building up, rather than forcing a tab switch on every single
          "+ Add this day" click (see openTripTab/handleAddToTrip above
          for why). Reuses the same named tab on repeat clicks. */}
      {addedCount > 0 && (
        <button
          onClick={openTripTab}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
            padding: "8px 16px",
            background: "var(--green-light)",
            color: "var(--green-deep)",
            border: "none",
            borderRadius: 100,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View your trip ({addedCount} {addedCount === 1 ? "day" : "days"} added) →
        </button>
      )}

      {/* Distillery dropdown */}
      <div style={{ marginBottom: 40 }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--slate)",
            marginBottom: 8,
          }}
        >
          Select your distillery
        </label>
        <select
          value={selectedDistillery}
          onChange={(e) => setSelectedDistillery(e.target.value)}
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--stone)",
            background: "white",
            fontSize: 14,
            color: "var(--dark)",
            minWidth: 260,
            fontFamily: "var(--font-body)",
          }}
        >
          <option value="all">All distilleries</option>
          {distilleryOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Vertical stacked day list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 64 }}>
        {filteredDays.map((day) => (
          <DayCard key={day.id} day={day} onAdded={() => setAddedCount((c) => c + 1)} />
        ))}
        {filteredDays.length === 0 && (
          <div style={{ fontSize: 14, color: "var(--slate)", padding: "40px 0" }}>
            No Days include that distillery yet.
          </div>
        )}
      </div>
    </>
  );
}
