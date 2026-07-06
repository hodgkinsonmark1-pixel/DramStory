"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, LocalFeature, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
import { INTEREST_CATEGORIES, REGIONS, TRIP_LENGTHS } from "@/lib/journey-options";
import { estimatedDriveMinutes, formatDuration, parseAvgVisitMinutes } from "@/lib/drive-time";
import { useRouteSegments } from "@/lib/use-route-segments";
import { useTrip } from "@/lib/trip-context";
import { stopCoords, stopId, stopName } from "@/lib/itinerary-stop";
import Logo from "@/components/Logo";
import MapCanvas from "./MapCanvas";

interface WorkspaceProps {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  location: LocationAnswer;
  tripLength: TripLength;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}

// A quick stop at a beach/walk/bike route/local gem doesn't have a defined
// "visit" length the way a distillery tour does - this is a reasonable
// flat estimate so trip totals stay meaningful once features are added.
const FEATURE_VISIT_MINUTES = 25;

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
  localFeatures,
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

  const routeCoords = activeDay ? activeDay.stops.map(stopCoords) : [];
  const { segments: routeSegments } = useRouteSegments(routeCoords);

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
        real?.durationMinutes ?? estimatedDriveMinutes(routeCoords[i], routeCoords[i + 1])
      );
    }
  }
  const totalDriveMinutes = driveSegments.reduce((a, b) => a + b, 0);
  const totalVisitMinutes = activeDay
    ? activeDay.stops.reduce(
        (sum, s) => sum + (s.kind === "distillery" ? parseAvgVisitMinutes(s.distillery.avgVisit) : FEATURE_VISIT_MINUTES),
        0
      )
    : 0;
  const toursBooked = activeDay ? activeDay.stops.filter((s) => s.kind === "distillery" && s.tour).length : 0;
  const toursTotal = activeDay
    ? activeDay.stops.reduce((sum, s) => sum + (s.kind === "distillery" ? s.tour?.price ?? 0 : 0), 0)
    : 0;

  const expandedCategoryData = INTEREST_CATEGORIES.find((c) => c.id === expandedCategory);

  // Natural Features subcategory labels -> LocalFeature.category values.
  const SUBCAT_TO_FEATURE_CATEGORY: Record<string, LocalFeature["category"]> = {
    Beaches: "beach",
    Walks: "walk",
    "Bike Rides": "bike-route",
    "Local Gems": "local-gem",
  };
  const naturalFeaturesActive = activeCategories.has("natural-features");
  const activeNaturalSubcats = Array.from(activeSubcats)
    .filter((key) => key.startsWith("natural-features:"))
    .map((key) => SUBCAT_TO_FEATURE_CATEGORY[key.split(":")[1]]);
  const visibleLocalFeatures = naturalFeaturesActive
    ? localFeatures.filter((f) => activeNaturalSubcats.length === 0 || activeNaturalSubcats.includes(f.category))
    : [];

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
            {days.length > 1 && (
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
                <p>Nothing added to {activeDay.label} yet — explore the map and add distilleries or places.</p>
              </div>
            ) : (
              activeDay.stops.map((stop, i) => (
                <div key={stopId(stop)}>
                  <div className="journey-stop">
                    <div className="stop-number">{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div className="stop-name">{stopName(stop)}</div>
                      {stop.kind === "distillery" ? (
                        <>
                          <div className="stop-region">{stop.distillery.region}</div>
                          <div className="stop-time">~{stop.distillery.avgVisit} visit</div>
                          {stop.tour && (
                            <>
                              <div className="stop-tour">🎟 {stop.tour.name}</div>
                              <div className="stop-cost">£{stop.tour.price} per person</div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="stop-region">
                          {stop.feature.icon} {stop.feature.category.replace("-", " ")}
                        </div>
                      )}
                    </div>
                    <button
                      className="stop-remove"
                      onClick={() => trip.removeStop(activeDayIndex, stopId(stop))}
                      aria-label={`Remove ${stopName(stop)}`}
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
                      {activeDay.stops
                        .filter((s) => s.kind === "distillery")
                        .map((s) => (
                          <div key={stopId(s)} className="summary-row">
                            <span>
                              {s.kind === "distillery" && s.distillery.name}{" "}
                              {s.kind === "distillery" && s.tour ? `- ${s.tour.name}` : "- No tour selected"}
                            </span>
                            <span>{s.kind === "distillery" && s.tour ? `£${s.tour.price}` : "-"}</span>
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
              localFeatures={isLive ? visibleLocalFeatures : []}
              isLive={isLive}
              routeStops={routeCoords}
              onAddDistillery={(slug) => {
                const d = distilleries.find((x) => x.slug === slug);
                if (d) trip.addStop(activeDayIndex, d);
              }}
              onAddFeature={(id) => {
                const f = localFeatures.find((x) => x.id === id);
                if (f) trip.addFeatureStop(activeDayIndex, f);
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
