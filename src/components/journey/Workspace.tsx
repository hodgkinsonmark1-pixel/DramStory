"use client";

import { useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, ItineraryDay, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
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

function describeLocation(location: LocationAnswer): string {
  const islayLabel = REGIONS.find((r) => r.id === "islay")?.label ?? "Islay & Jura";
  if (location.kind === "region") {
    const region = REGIONS.find((r) => r.id === location.region);
    return region?.label ?? "Your trip";
  }
  return islayLabel;
}

function makeDays(count: number): ItineraryDay[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `day-${i + 1}`,
    label: `Day ${i + 1}`,
    stops: [],
  }));
}

/**
 * The workspace — map + itinerary panel, now with real day tabs. Day count
 * is seeded from the trip-length answer; visitors can add more days
 * freely (mainly useful for "just dreaming", where the length was only a
 * rough guess to begin with). Airport arrival/departure banners on the
 * first/last day are derived live from days.length + the location answer
 * rather than stored - see the ItineraryDay comment in lib/types.ts for why.
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

  const startingDayCount = TRIP_LENGTHS.find((t) => t.id === tripLength)?.days ?? 1;
  const [days, setDays] = useState<ItineraryDay[]>(() => makeDays(startingDayCount));
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const title = describeLocation(location);
  const isLive = location.kind !== "region" || location.region === "islay";
  const lengthLabel = TRIP_LENGTHS.find((t) => t.id === tripLength)?.label;
  const isFlyingIn = location.kind === "airport";

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
    setDays((prev) =>
      prev.map((day, i) =>
        i === activeDayIndex && !day.stops.some((s) => s.slug === slug)
          ? { ...day, stops: [...day.stops, d] }
          : day
      )
    );
  }

  function removeStop(dayIndex: number, slug: string) {
    setDays((prev) =>
      prev.map((day, i) => (i === dayIndex ? { ...day, stops: day.stops.filter((s) => s.slug !== slug) } : day))
    );
  }

  function addDay() {
    setDays((prev) => [...prev, { id: `day-${prev.length + 1}`, label: `Day ${prev.length + 1}`, stops: [] }]);
  }

  function removeDay(index: number) {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, label: `Day ${i + 1}` })));
    setActiveDayIndex((prev) => Math.min(prev, days.length - 2));
  }

  const expandedCategoryData = INTEREST_CATEGORIES.find((c) => c.id === expandedCategory);
  const activeDay = days[activeDayIndex];

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

      <div className="workspace-main">
        <div className="journey-panel">
          <div className="panel-header">
            <div className="panel-eyebrow">Your itinerary</div>
            <div className="panel-title">{title}</div>
            <div className="panel-subtitle">{PANEL_SUBTITLE_BY_TIMING[timing]}</div>
          </div>

          <div className="day-nav">
            <button
              className="day-nav-arrow"
              onClick={() => setActiveDayIndex((i) => Math.max(0, i - 1))}
              disabled={activeDayIndex === 0}
              aria-label="Previous day"
            >
              &#8249;
            </button>
            <div className="day-nav-label">
              {activeDay.label}
              <span className="day-nav-count"> of {days.length}</span>
            </div>
            <button
              className="day-nav-arrow"
              onClick={() => setActiveDayIndex((i) => Math.min(days.length - 1, i + 1))}
              disabled={activeDayIndex === days.length - 1}
              aria-label="Next day"
            >
              &#8250;
            </button>
            <button className="day-nav-add" onClick={addDay}>
              + Add day
            </button>
            {days.length > 1 && (
              <button className="day-nav-remove" onClick={() => removeDay(activeDayIndex)}>
                Remove this day
              </button>
            )}
          </div>

          <div className="journey-stops">
            {isFlyingIn && activeDayIndex === 0 && (
              <div className="journey-stop journey-stop-airport">
                <div className="stop-number">✈</div>
                <div>
                  <div className="stop-name">Arrive at {location.kind === "airport" ? location.airportName : ""}</div>
                  <div className="stop-region">Trip begins here</div>
                </div>
              </div>
            )}

            {activeDay.stops.length === 0 && !(isFlyingIn && (activeDayIndex === 0 || activeDayIndex === days.length - 1)) ? (
              <div className="journey-empty">
                <div className="journey-empty-icon">🗺️</div>
                <p>Nothing added to {activeDay.label} yet — explore the map and add distilleries.</p>
              </div>
            ) : (
              activeDay.stops.map((d, i) => (
                <div className="journey-stop" key={d.slug}>
                  <div className="stop-number">{i + 1}</div>
                  <div>
                    <div className="stop-name">{d.name}</div>
                    <div className="stop-region">{d.region}</div>
                  </div>
                  <button
                    className="stop-remove"
                    onClick={() => removeStop(activeDayIndex, d.slug)}
                    aria-label={`Remove ${d.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))
            )}

            {isFlyingIn && activeDayIndex === days.length - 1 && (
              <div className="journey-stop journey-stop-airport">
                <div className="stop-number">✈</div>
                <div>
                  <div className="stop-name">Depart from {location.kind === "airport" ? location.airportName : ""}</div>
                  <div className="stop-region">Trip ends here</div>
                </div>
              </div>
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
