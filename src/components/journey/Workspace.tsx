"use client";

import { useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, LocationAnswer, TripTiming } from "@/lib/types";
import { INTEREST_CATEGORIES, REGIONS } from "@/lib/journey-options";
import Logo from "@/components/Logo";
import MapCanvas from "./MapCanvas";

interface WorkspaceProps {
  distilleries: Distillery[];
  location: LocationAnswer;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}

const PANEL_SUBTITLE_BY_TIMING: Record<TripTiming, string> = {
  today: "Add your next stop — we'll show what's open right now.",
  planning: "Build your itinerary now, save it, and refine it before you go.",
  inspiration: "No pressure — just explore and see what catches your eye.",
};

function describeLocation(location: LocationAnswer): { title: string; context: string | null } {
  if (location.kind === "region") {
    const region = REGIONS.find((r) => r.id === location.region);
    return { title: region?.label ?? "Your trip", context: null };
  }
  if (location.kind === "airport") {
    return { title: "Islay", context: `Flying into ${location.airportName}` };
  }
  return { title: "Islay", context: `Starting from ${location.distillerySlug.replace(/-/g, " ")}` };
}

/**
 * The workspace — map + itinerary panel. The filter bar and itinerary
 * shell are wired to the Q2/Q3 answers, and the map itself is a real
 * interactive Leaflet map (OpenStreetMap tiles, no API key or billing
 * account needed) with live pins for every distillery in the region. The
 * itinerary panel doesn't support drag-and-drop yet — that's the next
 * iteration on this base.
 */
export default function Workspace({ distilleries, location, initialInterests, timing }: WorkspaceProps) {
  const [activeCategories, setActiveCategories] = useState<Set<InterestCategoryId>>(
    new Set(initialInterests)
  );
  const [expandedCategory, setExpandedCategory] = useState<InterestCategoryId | null>(null);
  const [activeSubcats, setActiveSubcats] = useState<Set<string>>(new Set());

  const { title, context } = describeLocation(location);
  const isLive = location.kind !== "region" || location.region === "islay";

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

  return (
    <div className="workspace-root">
      <div className="map-page-header">
        <Link href="/" className="map-page-header-logo">
          <Logo size={28} />
          <span className="map-page-header-logo-text">DramStory</span>
        </Link>
        <div className="map-page-header-links">
          <span className="map-page-header-badge">{title}</span>
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
            <div className="journey-empty">
              <div className="journey-empty-icon">🗺️</div>
              <p>Nothing added yet — explore the map and add distilleries, tours, and places as you go.</p>
            </div>
          </div>
        </div>

        <div className="map-area">
          <div className="map-toolbar">
            {INTEREST_CATEGORIES.map((c) => {
              const on = c.alwaysOn || activeCategories.has(c.id);
              const expanded = expandedCategory === c.id;
              return (
                <div className="filter-btn-group" key={c.id}>
                  <button
                    className={"filter-btn" + (on ? " active" : "")}
                    onClick={() => toggleCategory(c.id, c.alwaysOn)}
                  >
                    <span>{c.icon}</span> {c.label}
                  </button>
                  {expanded && c.subcategories.length > 0 && (
                    <div className="subcat-row">
                      {c.subcategories.map((sub) => {
                        const key = `${c.id}:${sub}`;
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
                  )}
                </div>
              );
            })}
            <div className="filter-sep" />
            <div className="map-hint">
              {isLive ? `${distilleries.length} distilleries on the map` : "No pins here yet"}
            </div>
          </div>

          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <MapCanvas distilleries={isLive ? distilleries : []} isLive={isLive} />
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
