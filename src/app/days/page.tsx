"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

/**
 * PRE-DESIGNED DAYS HUB — LAYOUT PASS, DUMMY CONTENT ONLY
 * ---------------------------------------------------------------
 * This page is a template/layout review. Every distillery name,
 * narrative, cost, duration, and tour is placeholder text — none
 * of it is sourced or real. Nothing here reads from Airtable yet.
 * Do not link this route from live navigation until the real
 * Days content lands. See docs/deferred-features.md for related
 * parked decisions (e.g. gamification).
 */

type DummyDay = {
  id: string;
  name: string;
  type: "Solo" | "Multi";
  distilleries: string[];
  narrative: string;
  pacing: "Relaxed" | "Moderate" | "Packed";
  durationPortEllen: string;
  durationBowmore: string;
  cost: string;
};

const DUMMY_DISTILLERIES = [
  "Ardbeg",
  "Lagavulin",
  "Laphroaig",
  "Bowmore",
  "Bruichladdich",
  "Kilchoman",
  "Bunnahabhain",
  "Ardnahoe",
  "Caol Ila",
  "Kilchoman",
  "Jura",
];

const DUMMY_DAYS: DummyDay[] = [
  {
    id: "ardbeg-solo",
    name: "Ardbeg, Slowly",
    type: "Solo",
    distilleries: ["Ardbeg"],
    narrative:
      "[Placeholder narrative — one whole-day paragraph. Mood, the coast road down to the distillery, what the light does out here in the afternoon, no re-listing of distillery facts already on its own page.]",
    pacing: "Relaxed",
    durationPortEllen: "≈4.5 hrs",
    durationBowmore: "≈5.5 hrs",
    cost: "£15pp — placeholder tour",
  },
  {
    id: "bowmore-solo",
    name: "Bowmore, the Old Way",
    type: "Solo",
    distilleries: ["Bowmore"],
    narrative:
      "[Placeholder narrative — whole-day feel for a single distillery visit, written in the round rather than stop-by-stop.]",
    pacing: "Relaxed",
    durationPortEllen: "≈5 hrs",
    durationBowmore: "≈3 hrs",
    cost: "£15pp — placeholder tour",
  },
  {
    id: "kildalton-triangle",
    name: "The Kildalton Triangle",
    type: "Multi",
    distilleries: ["Bunnahabhain", "Ardnahoe", "Caol Ila"],
    narrative:
      "[Placeholder narrative — one paragraph covering the whole day: the drive between three neighbouring distilleries, old guard vs new arrival contrast, pacing between stops.]",
    pacing: "Packed",
    durationPortEllen: "≈7 hrs",
    durationBowmore: "≈8 hrs",
    cost: "£45pp — placeholder tours",
  },
];

function PacingTag({ pacing }: { pacing: DummyDay["pacing"] }) {
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

function DayCard({ day }: { day: DummyDay }) {
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
        {/* Map placeholder */}
        <div
          style={{
            width: 280,
            minWidth: 220,
            flexShrink: 0,
            background:
              "repeating-linear-gradient(45deg, var(--stone), var(--stone) 10px, var(--off-white) 10px, var(--off-white) 20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--slate)", fontWeight: 500 }}>
            [ Map placeholder ]
          </span>
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
            {day.distilleries.map((d) => (
              <span
                key={d}
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
              marginBottom: 18,
              maxWidth: 560,
            }}
          >
            {day.narrative}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px 32px",
              marginBottom: 20,
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
                Indicative cost
              </div>
              <div style={{ fontWeight: 600, color: "var(--copper)" }}>{day.cost}</div>
            </div>
          </div>

          <button
            style={{
              padding: "12px 28px",
              background: "var(--green-deep)",
              color: "white",
              border: "none",
              borderRadius: 100,
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
            disabled
            title="Placeholder — not wired to TripContext yet"
          >
            Add this day to my trip
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreDesignedDaysHubPage() {
  const [selectedDistillery, setSelectedDistillery] = useState<string>("all");

  const filteredDays = useMemo(() => {
    if (selectedDistillery === "all") return DUMMY_DAYS;
    return DUMMY_DAYS.filter((d) => d.distilleries.includes(selectedDistillery));
  }, [selectedDistillery]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid var(--stone)",
          background: "var(--off-white)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "56px 24px 24px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--green-deep)",
            marginBottom: 12,
          }}
        >
          Layout draft — placeholder content
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "var(--dark)",
            marginBottom: 12,
            letterSpacing: "-0.01em",
          }}
        >
          Pre-Designed <em style={{ fontStyle: "italic", color: "var(--amber)" }}>Days</em>
        </h1>
        <p style={{ fontSize: 15, color: "var(--peat)", maxWidth: 620, marginBottom: 32 }}>
          A ready-made day, built around the distilleries you want to see. Add it straight to
          your trip, then rearrange or edit anything, just as if you&apos;d built it yourself.
        </p>

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
            {[...new Set(DUMMY_DISTILLERIES)].map((d) => (
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
              No Days include that distillery yet. [Placeholder empty state.]
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
