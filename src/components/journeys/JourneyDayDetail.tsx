"use client";

import Link from "next/link";
import type { HubDay } from "@/lib/types";
import JourneyDayMap from "@/components/journeys/JourneyDayMap";
import AddDayToTripButton from "@/components/journeys/AddDayToTripButton";

/**
 * The single day-detail template for a Classic Journey (docs/content-
 * structure-conventions.md's "Classic Journey day-by-day template") -
 * narrative, stops grouped as "Distilleries visited"/"Other features
 * visited", a transport note, and a per-day interactive map, plus the
 * "+ Add this day to my journey" button. Used once per HubDay by
 * /journeys/[slug] (src/app/journeys/[slug]/page.tsx), in Journey Days
 * order, so every Journey that includes a given Day renders it exactly
 * the same way - and picks up any future edit to that Day's Narrative/
 * Transport Note/Day Stops automatically, with no per-journey copy to
 * keep in sync.
 *
 * Extracted 12 Aug 2026 from what used to be inline markup on the old,
 * hardcoded /journeys/[slug] page (journeys-data.ts's CLASSIC_JOURNEYS) -
 * this is the same visual template, now fed real HubDay data instead of
 * a hand-written array, and rendering real [label](/path) narrative
 * links (renderWithLinks below - the old page never actually parsed
 * these, it just printed day.narrative as plain text). Fixes the old
 * page's two known issues by construction: it always had this map
 * component available but a stop whose distillerySlug didn't match any
 * live Distillery record (e.g. a stale "caol_ila" vs the real "caol-ila"
 * slug) fell back to printing that raw slug string instead of a name -
 * that class of bug can't happen here, since a Day Stop links a real
 * Distillery record directly, never a slug string that can drift out of
 * sync.
 */

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same pattern kept as its own local copy in
 *  DayScreen.tsx/DistilleryPageClient.tsx/FeaturedStayClient.tsx/
 *  ExploreFeatureClient.tsx (each file keeps its own copy rather than
 *  importing a shared one - following that existing convention here). */
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    return (
      <Link href={href} key={i} style={{ color: "var(--copper)", fontWeight: 500 }}>
        {label}
      </Link>
    );
  });
}

function StopsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--copper)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}

export default function JourneyDayDetail({
  day,
  dayNumber,
}: {
  day: HubDay;
  /** Omit on a standalone /days/[slug] page (no journey context to number
   *  against) - the heading then shows just the Day's own name. Added
   *  13 Aug 2026 so this component could be reused there without a fake
   *  "Day 1" prefix. */
  dayNumber?: number;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        background: "var(--cream)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--stone)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--dark)",
          marginBottom: 10,
        }}
      >
        {dayNumber != null ? `Day ${dayNumber} · ${day.name}` : day.name}
      </div>

      {day.narrative && (
        <p style={{ fontSize: 14, color: "var(--peat)", lineHeight: 1.65, marginBottom: 14 }}>
          {renderWithLinks(day.narrative)}
        </p>
      )}

      {day.stops.length > 0 && (
        <StopsRow label="Distilleries visited">
          {day.stops.map((s) => (
            <div key={s.distillery.id} style={{ fontSize: 14, color: "var(--peat)" }}>
              <Link href={`/distilleries/${s.distillery.slug}`} style={{ color: "var(--dark)", fontWeight: 500 }}>
                {s.distillery.name}
              </Link>
            </div>
          ))}
        </StopsRow>
      )}

      {day.featureStops.length > 0 && (
        <StopsRow label="Other features visited">
          {day.featureStops.map((f) => (
            <div key={f.id} style={{ fontSize: 14, color: "var(--peat)" }}>
              <Link href={`/explore/${f.slug}`} style={{ color: "var(--dark)", fontWeight: 500 }}>
                {f.name}
              </Link>
            </div>
          ))}
        </StopsRow>
      )}

      {day.transportNote && (
        <div style={{ fontSize: 12, color: "var(--slate)", fontStyle: "italic", marginTop: 8 }}>
          {day.transportNote}
        </div>
      )}

      {(day.stops.length > 0 || day.featureStops.length > 0) && (
        <div style={{ marginTop: 12 }}>
          <JourneyDayMap
            stops={day.stops.map((s) => s.distillery)}
            featureStops={day.mapFeatures ?? []}
          />
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <AddDayToTripButton day={day} />
      </div>
    </div>
  );
}
