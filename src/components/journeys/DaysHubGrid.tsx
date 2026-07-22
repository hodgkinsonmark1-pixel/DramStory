"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HubDay } from "@/lib/types";
import HubDayMap from "@/components/journeys/HubDayMap";
import { useTrip } from "@/lib/trip-context";

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

function DayCard({ day }: { day: HubDay }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = day.narrative.length > 380;
  const trip = useTrip();
  const router = useRouter();

  /** Adds this Day as a brand-new day in the visitor's trip (never merged
   *  into whatever day they currently have open - a Hub Day is a complete
   *  curated day in its own right), using the same addDay/addStop/
   *  setTourForStop functions every other "add to trip" action in the app
   *  already writes through. newDayIndex is captured from trip.days.length
   *  BEFORE addDay() is called, since addDay always appends exactly one
   *  day at the end - reading it after would risk a stale value, since
   *  React doesn't apply the state update synchronously within this same
   *  handler. */
  function handleAddToTrip() {
    const newDayIndex = trip.days.length;
    trip.addDay();
    for (const stop of day.stops) {
      trip.addStop(newDayIndex, stop.distillery);
      if (stop.tour) trip.setTourForStop(newDayIndex, stop.distillery, stop.tour);
    }
    trip.setCurrentDayIndex(newDayIndex);
    router.push("/journey?resume=1");
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
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
                background: "white",
                color: "var(--copper)",
                border: "1px solid var(--copper)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={handleAddToTrip}
            >
              + Add this day to my trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DaysHubGrid({ days }: { days: HubDay[] }) {
  const [selectedDistillery, setSelectedDistillery] = useState<string>("all");

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
          <DayCard key={day.id} day={day} />
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
