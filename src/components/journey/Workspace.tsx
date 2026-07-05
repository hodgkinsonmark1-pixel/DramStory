"use client";

import { useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
import { INTEREST_CATEGORIES, REGIONS, TRIP_LENGTHS } from "@/lib/journey-options";
import Logo from "@/components/Logo";
import MapCanvas from "./MapCanvas";

interface WorkspaceProps {
  distilleries: Distillery[];
  location: LocationAnswer;
  tripLength: TripLength;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}

const PANEL_SUBTITLE_BY_TIMING: Record<TripTiming, string> = {
  today: "Add your next stop — we'll show what's open right now.",
  planning: "Build your itinerary now, save it, and refine it before you go.",
  inspiration: "No pressure — just explore and see what catches your eye.",
};

function describeLocation(location: LocationAnswer): { title: string; context: string | null } {
  const islayLabel = REGIONS.find((r) => r.id === "islay")?.label ?? "Islay & Jura";
  if (location.kind === "region") {
    const region = REGIONS.find((r) => r.id === location.region);
    return { title: region?.label ?? "Your trip", context: null };
  }
  if (location.kind === "airport") {
    return { title: islayLabel, context: `Flying into ${location.airportName}` };
  }
  return { title: islayLabel, context: `Starting from ${location.distillerySlug.replace(/-/g, " ")}` };
}

/**
 * The workspace — map + itinerary panel. The filter bar and itinerary
 * shell are wired to the Q2/Q3/Q4 answers, and the map itself is a real
 * interactive Leaflet map with live pins for every distillery in the
 * region. The itinerary is a flat add/remove list for now (clicking
 * "+ Add" on a map popup works) rather than full day-by-day tabs with
 * drag-and-drop — that needs a real day-state model, which is the next
 * iteration once trip-length/date logic is nailed down.
 */
export default function Workspace({
  distilleries,
  location,
  tripLength,
  initialInterests,
  timing,
}: WorkspaceProps) {
  const [activeCategories, setActiveCategories] = useState<Set<InterestCategoryId>>(
    new Set(initialInterests)
  );
  const [expandedCategory, setExpandedCategory] = useState<InterestCategoryId | null>(null);
  const [activeSubcats, setActiveSubcats] = useState<Set<string>>(new Set());
  const [itinerary, setItinerary] = useState<Distillery[]>([]);

  const { title, context } = describeLocation(location);
  const isLive = location.kind !== "region" || location.region === "islay";
  const lengthLabel = TRIP_LENGTHS.find((t) => t.id === tripLength)?.label;

  function toggleCategory(id: InterestCategoryId, alwaysOn?: boolean) {
    if (alwaysOn) {
      setExpandedCategory((prev) => (prev === id ? null : id));
      return;
    }
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (expandedCategory === id) setExpandedCategory(null);
      } else {
        next.add(id);
        setExpandedCategory(id);
      }
      return next;
    });
  }

  function toggleSubcat(key: string) {
    setActiveSubcats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addDistillery(slug: string) {
    const d = distilleries.find((x) => x.slug === slug);
    if (!d) return;
    setItinerary((prev) => (prev.some((x) => x.slug === slug) ? prev : [...prev, d]));
  }

  function removeDistillery(slug: string) {
    setItinerary((prev) => prev.filter((x) => x.slug !== slug));
  }

  const expandedCategoryData = INTEREST_CATEGORIES.find((c) => c.id === expandedCategory);

  return (
    <div className="workspace-root">
      <div className="map-page-header">
        <Link href="/" className="map-page-header-logo">
          <Logo size={36} />
          <span className="map-page-header-logo-text">DramStory</span>
        </Link>
        <div className="map-page-header-links">
          <span className="map-page-header-badge">
            {title}
            {lengthLabel ? ` · ${lengthLabel}` : ""}
          </span>
          <Link href="/distilleries">Distilleries</Link>
          <Link href="/">Start over</Link>
        </div>
      </div>

      {context && <div className="trip-context-banner">{context}</div>}

      <div className="workspace-main">
        <div className="journey-panel">
          <div className="panel-header">
            <div className="panel-eyebrow">Your itinerary</div>
            <div className="panel-title">{title}</div>
            <div className="panel-subtitle">{PANEL_SUBTITLE_BY_TIMING[timing]}</div>
          </div>
          <div className="journey-stops">
            {itinerary.length === 0 ? (
              <div className="journey-empty">
                <div className="journey-empty-icon">🗺️</div>
                <p>Nothing added yet — explore the map and add distilleries as you go.</p>
              </div>
            ) : (
              itinerary.map((d, i) => (
                <div className="journey-stop" key={d.slug}>
                  <div className="stop-number">{i + 1}</div>
                  <div>
                    <div className="stop-name">{d.name}</div>
                    <div className="stop-region">{d.region}</div>
                  </div>
                  <button className="stop-remove" onClick={() => removeDistillery(d.slug)} aria-label={`Remove ${d.name}`}>
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="map-area">
          <div className="map-toolbar">
            <div className="map-toolbar-row">
              {INTEREST_CATEGORIES.map((c) => {
                const on = c.alwaysOn || activeCategories.has(c.id);
                const expanded = expandedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    className={"filter-btn" + (on ? " active" : "") + (expanded ? " expanded" : "")}
                    onClick={() => toggleCategory(c.id, c.alwaysOn)}
                  >
                    <span>{c.icon}</span> {c.label}
                  </button>
                );
              })}
              <div className="filter-sep" />
              <div className="map-hint">
                {isLive ? `${distilleries.length} distilleries on the map` : "No pins here yet"}
              </div>
            </div>

            {expandedCategoryData && expandedCategoryData.subcategories.length > 0 && (
              <div className="map-toolbar-subrow">
                <div className="subcat-row">
                  {expandedCategoryData.subcategories.map((sub) => {
                    const key = `${expandedCategoryData.id}:${sub}`;
                    return (
                      <button
                        key={key}
                        className={"subcat-chip" + (activeSubcats.has(key) ? " active" : "")}
                        onClick={() => toggleSubcat(key)}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <MapCanvas
              distilleries={isLive ? distilleries : []}
              isLive={isLive}
              onAddDistillery={addDistillery}
            />
            {!isLive && (
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "white",
                  padding: "10px 20px",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-card)",
                  fontSize: 12,
                  color: "var(--slate)",
                  zIndex: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {title} is on the roadmap — Islay is the only region loaded so far.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
