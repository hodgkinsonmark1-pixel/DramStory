"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
import { INTEREST_CATEGORIES, REGIONS, TRIP_LENGTHS } from "@/lib/journey-options";
import { estimatedDriveMinutes, formatDuration, parseAvgVisitMinutes } from "@/lib/drive-time";
import { useRouteSegments } from "@/lib/use-route-segments";
import { useTrip } from "@/lib/trip-context";
import Logo from "@/components/Logo";
import MapCanvas from "./MapCanvas";

interface WorkspaceProps {
  distilleries: Distillery[];
  location: LocationAnswer;
  tripLength: TripLength;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}

function describeLocation(location: LocationAnswer): string {
  const islayLabel = REGIONS.find((r) => r.id === "islay")?.label ?? "Islay & Jura";
  if (location.kind === "region") {
    const region = REGIONS.find((r) => r.id === location.region);
    return region?.label ?? "Your trip";
  }
  return islayLabel;
}

export default function Workspace({
  distilleries,
  location,
  tripLength,
  initialInterests,
}: WorkspaceProps) {
  const trip = useTrip();
  const [activeCategories, setActiveCategories] = useState<Set<InterestCategoryId>>(
    new Set(initialInterests)
  );
  const [expandedCategory, setExpandedCategory] = useState<InterestCategoryId | null>(null);
  const [activeSubcats, setActiveSubcats] = useState<Set<string>>(new Set());
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const startingDayCount = TRIP_LENGTHS.find((t) => t.id === tripLength)?.days ?? 1;
  useEffect(() => {
    if (trip.ready) trip.initDays(startingDayCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.ready]);

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

  const days = trip.days;
  const activeDay = days[activeDayIndex];

  const stopCoords = activeDay
    ? activeDay.stops.map((s) => ({ lat: s.distillery.lat, lng: s.distillery.lng }))
    : [];
  const { segments: routeSegments } = useRouteSegments(stopCoords);

  // Drive time + visit time totals for the currently viewed day. Prefers
  // the real road-routed duration for each segment; falls back to the
  // haversine estimate only while that segment's route is still loading
  // or if OSRM couldn't route it - so the numbers never show 0m/blank
  // while waiting, they just start as an estimate and firm up shortly after.
  const driveSegments: number[] = [];
  if (activeDay) {
    for (let i = 0; i < activeDay.stops.length - 1; i++) {
      const real = routeSegments[i];
      driveSegments.push(
        real?.durationMinutes ??
          estimatedDriveMinutes(activeDay.stops[i].distillery, activeDay.stops[i + 1].distillery)
      );
    }
  }
  const totalDriveMinutes = driveSegments.reduce((a, b) => a + b, 0);
  const totalVisitMinutes = activeDay
    ? activeDay.stops.reduce((sum, s) => sum + parseAvgVisitMinutes(s.distillery.avgVisit), 0)
    : 0;
  const toursBooked = activeDay ? activeDay.stops.filter((s) => s.tour).length : 0;
  const toursTotal = activeDay
    ? activeDay.stops.reduce((sum, s) => sum + (s.tour?.price ?? 0), 0)
    : 0;

  const expandedCategoryData = INTEREST_CATEGORIES.find((c) => c.id === expandedCategory);

  if (!trip.ready || !activeDay) {
    return <div className="workspace-root" />;
  }

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
          <Link href="/" onClick={() => trip.resetTrip()}>
            Start over
          </Link>
        </div>
      </div>

      <div className="workspace-main">
        <div className="journey-panel">
          <div className="panel-header">
            <div className="panel-eyebrow">Your itinerary</div>
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
            <div className="day-nav-label">{activeDay.label}</div>
            <div className="day-dots">
              {days.map((d, i) => (
                <button
                  key={d.id}
                  className={"day-dot" + (i === activeDayIndex ? " active" : "")}
                  onClick={() => setActiveDayIndex(i)}
                  aria-label={`Go to ${d.label}`}
                />
              ))}
            </div>
            <button
              className="day-nav-arrow"
              onClick={() => setActiveDayIndex((i) => Math.min(days.length - 1, i + 1))}
              disabled={activeDayIndex === days.length - 1}
              aria-label="Next day"
            >
              &#8250;
            </button>
            <div className="day-nav-actions">
              <button className="day-nav-add" onClick={trip.addDay}>
                + Add day
              </button>
              {days.length > 1 && (
                <button className="day-nav-remove" onClick={() => trip.removeDay(activeDayIndex)}>
                  Remove
                </button>
              )}
            </div>
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
              activeDay.stops.map((stop, i) => (
                <div key={stop.distillery.slug}>
                  <div className="journey-stop">
                    <div className="stop-number">{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div className="stop-name">{stop.distillery.name}</div>
                      <div className="stop-region">{stop.distillery.region}</div>
                      <div className="stop-time">~{stop.distillery.avgVisit} visit</div>
                      {stop.tour && (
                        <>
                          <div className="stop-tour">🎟 {stop.tour.name}</div>
                          <div className="stop-cost">£{stop.tour.price} per person</div>
                        </>
                      )}
                    </div>
                    <button
                      className="stop-remove"
                      onClick={() => trip.removeStop(activeDayIndex, stop.distillery.slug)}
                      aria-label={`Remove ${stop.distillery.name}`}
                    >
                      &times;
                    </button>
                  </div>
                  {i < activeDay.stops.length - 1 && (
                    <div className="drive-time-between">
                      🚗 {formatDuration(driveSegments[i])} drive
                    </div>
                  )}
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

          {activeDay.stops.length > 0 && (
            <div className="journey-summary">
              <button className="summary-total summary-total-toggle" onClick={() => setSummaryExpanded((v) => !v)}>
                <span>Total journey</span>
                <span>
                  {formatDuration(totalDriveMinutes + totalVisitMinutes)}
                  <span className="summary-expand-chevron">{summaryExpanded ? " ▲" : " ▼"}</span>
                </span>
              </button>

              {summaryExpanded && (
                <>
                  <div className="summary-row">
                    <span>Driving time</span>
                    <span>{formatDuration(totalDriveMinutes)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Estimated visits</span>
                    <span>{formatDuration(totalVisitMinutes)}</span>
                  </div>

                  <button className="cost-toggle" onClick={() => setShowCostBreakdown((v) => !v)}>
                    {showCostBreakdown ? "▲" : "▼"} Show estimated tour costs
                    {toursBooked > 0 ? ` (${toursBooked} tour${toursBooked > 1 ? "s" : ""} booked)` : ""}
                  </button>

                  {showCostBreakdown && (
                    <div className="cost-breakdown">
                      {activeDay.stops.map((s) => (
                        <div key={s.distillery.slug} className="summary-row">
                          <span>
                            {s.distillery.name} {s.tour ? `- ${s.tour.name}` : "- No tour selected"}
                          </span>
                          <span>{s.tour ? `£${s.tour.price}` : "-"}</span>
                        </div>
                      ))}
                      <div className="summary-row" style={{ fontWeight: 600 }}>
                        <span>Tours total</span>
                        <span>£{toursTotal} pp</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--slate)", marginTop: 8 }}>
                        Accommodation and transport not included. Add tours from each distillery page.
                      </p>
                    </div>
                  )}
                </>
              )}

              <button className="save-journey-btn">📖 Save My Dram Story</button>
            </div>
          )}
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
              routeStops={activeDay.stops.reduce<{ lat: number; lng: number }[]>((points, stop, i) => {
                if (i === 0) return [{ lat: stop.distillery.lat, lng: stop.distillery.lng }];
                const real = routeSegments[i - 1];
                const prevCoord = { lat: activeDay.stops[i - 1].distillery.lat, lng: activeDay.stops[i - 1].distillery.lng };
                const thisCoord = { lat: stop.distillery.lat, lng: stop.distillery.lng };
                // Real road geometry when we have it; a plain straight
                // line for just this segment if OSRM couldn't route it -
                // degrades gracefully rather than breaking the whole route.
                return [...points, ...(real ? real.points : [prevCoord, thisCoord])];
              }, [])}
              onAddDistillery={(slug) => {
                const d = distilleries.find((x) => x.slug === slug);
                if (d) trip.addStop(activeDayIndex, d);
              }}
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
