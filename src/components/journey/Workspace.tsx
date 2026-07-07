"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, LocalEvent, LocalFeature, LocationAnswer, TripLength, TripTiming } from "@/lib/types";
import { INTEREST_CATEGORIES, REGIONS, TRIP_LENGTHS } from "@/lib/journey-options";
import { CLASSIC_JOURNEYS, getJourneyDistilleries, routeStartingPrice } from "@/lib/journeys-data";
import { getMonthClimate, MONTH_NAMES } from "@/lib/islay-climate";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";
import { useRouteSegments } from "@/lib/use-route-segments";
import { useTrip } from "@/lib/trip-context";
import { stopCoords, stopId, stopName, stopVisitMinutes, incrementVisitMinutes } from "@/lib/itinerary-stop";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MapCanvas from "./MapCanvas";
import TripEssentials from "./TripEssentials";
import GolfSpaResults from "./GolfSpaResults";

interface WorkspaceProps {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  localEvents: LocalEvent[];
  location: LocationAnswer;
  tripLength: TripLength;
  initialInterests: InterestCategoryId[];
  timing: TripTiming;
}

// Matches MapCanvas's own ISLAY_CENTER - used as the search origin for the
// Golf & Spa results list (Google Places-sourced, rendered as a plain
// list rather than map pins - see GolfSpaResults.tsx for why).
const ISLAY_CENTER = { lat: 55.75, lng: -6.2 };

function describeLocation(location: LocationAnswer): string {
  const islayLabel = REGIONS.find((r) => r.id === "islay")?.label ?? "Islay & Jura";
  if (location.kind === "region") {
    const region = REGIONS.find((r) => r.id === location.region);
    return region?.label ?? "Your trip";
  }
  return islayLabel;
}

// Small date helpers for the Local Events drill-down UI - deliberately
// plain date-string math (no date library) since these only ever handle
// simple day-count arithmetic on ISO strings.
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Last day of the given "YYYY-MM" month, as an ISO date string. */
function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month, 0); // day 0 of next month = last day of this month
  return d.toISOString().slice(0, 10);
}

/** True if [aStart, aEnd] and [bStart, bEnd] overlap at all. */
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export default function Workspace({
  distilleries,
  localFeatures,
  localEvents,
  location,
  tripLength,
  initialInterests,
  timing,
}: WorkspaceProps) {
  const trip = useTrip();
  const [activeCategories, setActiveCategories] = useState<Set<InterestCategoryId>>(
    new Set(initialInterests)
  );
  const [expandedCategory, setExpandedCategory] = useState<InterestCategoryId | null>(null);
  const [activeSubcats, setActiveSubcats] = useState<Set<string>>(new Set());
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Local Events date UI - lives in that category's drill-down submenu.
  // No real event data exists in Airtable yet, so this doesn't filter
  // anything for now; it's the UI ready for whenever events are populated.
  const todayIso = new Date().toISOString().slice(0, 10);
  const [eventDateMode, setEventDateMode] = useState<"range" | "month">("range");
  const [eventStartDate, setEventStartDate] = useState(todayIso);
  const [eventEndDate, setEventEndDate] = useState(todayIso);
  const [eventMonth, setEventMonth] = useState(todayIso.slice(0, 7));
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [weatherMinimized, setWeatherMinimized] = useState(false);

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

  function clearSubcatsForCategory(categoryId: string) {
    setActiveSubcats((prev) => {
      const next = new Set(prev);
      for (const key of next) {
        if (key.startsWith(`${categoryId}:`)) next.delete(key);
      }
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
  const totalVisitMinutes = activeDay ? activeDay.stops.reduce((sum, s) => sum + stopVisitMinutes(s), 0) : 0;
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

  // Local Attractions subcategory labels -> LocalFeature.category values.
  // "Local Gems" here means a different bucket (attraction-gem) than
  // Natural Features' "Local Gems" (local-gem) - the chip keys are
  // prefixed with the category id, so there's no collision, just two
  // separate label->category maps. "Golf & Spa" has no Airtable category
  // at all (Google Places-sourced, not populated until Google unblocks),
  // so it deliberately maps to nothing and always shows zero results.
  const ATTRACTION_SUBCAT_TO_FEATURE_CATEGORY: Record<string, LocalFeature["category"] | undefined> = {
    "Historic Sites": "historic-site",
    "Local Gems": "attraction-gem",
    "Golf & Spa": undefined,
  };
  const localAttractionsActive = activeCategories.has("local-attractions");
  const activeAttractionSubcats = Array.from(activeSubcats)
    .filter((key) => key.startsWith("local-attractions:"))
    .map((key) => ATTRACTION_SUBCAT_TO_FEATURE_CATEGORY[key.split(":")[1]])
    .filter((c): c is LocalFeature["category"] => c !== undefined);
  // Golf & Spa selected on its own (no other attraction subcat active)
  // should show zero Local Feature pins, not fall back to "show
  // everything" - Golf & Spa itself now renders as a separate results
  // list (GolfSpaResults), never as pins, so this only concerns the
  // Airtable-backed Historic Sites/Local Gems pins on the map.
  const golfSpaOnlySelected =
    activeSubcats.has("local-attractions:Golf & Spa") &&
    !activeSubcats.has("local-attractions:Historic Sites") &&
    !activeSubcats.has("local-attractions:Local Gems");
  // Show the Golf & Spa results list whenever Local Attractions is
  // expanded and either "Everything" (no subcat chip active) or the
  // Golf & Spa chip specifically is selected.
  const attractionSubcatActive = Array.from(activeSubcats).some((key) =>
    key.startsWith("local-attractions:")
  );
  const showGolfSpaResults =
    activeSubcats.has("local-attractions:Golf & Spa") || !attractionSubcatActive;

  const visibleLocalFeatures = [
    ...(naturalFeaturesActive
      ? localFeatures.filter(
          (f) =>
            (f.category === "beach" || f.category === "walk" || f.category === "bike-route" || f.category === "local-gem") &&
            (activeNaturalSubcats.length === 0 || activeNaturalSubcats.includes(f.category))
        )
      : []),
    ...(localAttractionsActive && !golfSpaOnlySelected
      ? localFeatures.filter(
          (f) =>
            (f.category === "historic-site" || f.category === "attraction-gem") &&
            (activeAttractionSubcats.length === 0 || activeAttractionSubcats.includes(f.category))
        )
      : []),
  ];

  // Local Events: resolve the currently-selected date range (varies by
  // timing - "today" is fixed to today, "planning"/"inspiration" share
  // the same range/month picker), find events overlapping it, and
  // collect which distilleries should get the pulsing map highlight.
  const selectedRange: [string, string] =
    timing === "today"
      ? [todayIso, todayIso]
      : eventDateMode === "month"
        ? [`${eventMonth}-01`, lastDayOfMonth(eventMonth)]
        : [eventStartDate, eventEndDate];
  const localEventsActive = activeCategories.has("local-events");
  const activeEvents = localEventsActive
    ? localEvents.filter((e) => rangesOverlap(e.date, e.endDate ?? e.date, selectedRange[0], selectedRange[1]))
    : [];
  const highlightedDistillerySlugs = Array.from(new Set(activeEvents.flatMap((e) => e.distillerySlugs)));

  // Weather/daylight banner - uses the same selectedRange as Local
  // Events, but deliberately independent of whether that filter is
  // toggled on, since this is a separate "when are you visiting" insight
  // that should show regardless.
  const weatherMonthNumber = Number(selectedRange[0].slice(5, 7));
  const weatherMonthClimate = getMonthClimate(weatherMonthNumber);
  const weatherMonthName = MONTH_NAMES[weatherMonthNumber - 1];
  const eventsDuringVisit = localEvents.filter((e) =>
    rangesOverlap(e.date, e.endDate ?? e.date, selectedRange[0], selectedRange[1])
  );

  if (!trip.ready || !activeDay) {
    return <div className="workspace-root" />;
  }

  return (
    <>
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
                      <div className="stop-time-row">
                        <span className="stop-time">~{formatDuration(stopVisitMinutes(stop))} visit</span>
                        <button
                          className="stop-time-btn"
                          onClick={() =>
                            trip.setStopMinutes(activeDayIndex, stopId(stop), incrementVisitMinutes(stop, -1))
                          }
                          aria-label="Decrease visit time"
                        >
                          &minus;
                        </button>
                        <button
                          className="stop-time-btn"
                          onClick={() =>
                            trip.setStopMinutes(activeDayIndex, stopId(stop), incrementVisitMinutes(stop, 1))
                          }
                          aria-label="Increase visit time"
                        >
                          +
                        </button>
                      </div>
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
              {expandedCategoryData && expandedCategoryData.subcategories.length > 0 ? (
                <>
                  <button className="filter-btn active" onClick={() => toggleCategory("distilleries", true)}>
                    <span>🥃</span> Distilleries
                  </button>
                  <button
                    className="filter-btn active expanded"
                    onClick={() => toggleCategory(expandedCategoryData.id, expandedCategoryData.alwaysOn)}
                  >
                    <span>{expandedCategoryData.icon}</span> {expandedCategoryData.label}
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    className={
                      "subcat-chip" +
                      (Array.from(activeSubcats).every((k) => !k.startsWith(`${expandedCategoryData.id}:`))
                        ? " active"
                        : "")
                    }
                    onClick={() => clearSubcatsForCategory(expandedCategoryData.id)}
                  >
                    Everything
                  </button>
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

                  {expandedCategoryData.id === "local-events" && (
                    <>
                      <div className="event-date-controls">
                        {timing === "today" && (
                          <span className="event-date-today">📅 Showing events for {formatDisplayDate(todayIso)}</span>
                        )}

                        {(timing === "planning" || timing === "inspiration") && (
                          <>
                            <div className="event-mode-toggle">
                              <button
                                className={"event-mode-btn" + (eventDateMode === "range" ? " active" : "")}
                                onClick={() => setEventDateMode("range")}
                              >
                                Date range
                              </button>
                              <button
                                className={"event-mode-btn" + (eventDateMode === "month" ? " active" : "")}
                                onClick={() => setEventDateMode("month")}
                              >
                                Month
                              </button>
                            </div>
                            {eventDateMode === "range" ? (
                              <>
                                <input
                                  type="date"
                                  className="event-date-input"
                                  value={eventStartDate}
                                  onChange={(e) => {
                                    const newStart = e.target.value;
                                    setEventStartDate(newStart);
                                    if (daysBetween(newStart, eventEndDate) > 14 || daysBetween(newStart, eventEndDate) < 0) {
                                      setEventEndDate(addDays(newStart, 7));
                                    }
                                  }}
                                />
                                <span className="event-date-sep">to</span>
                                <input
                                  type="date"
                                  className="event-date-input"
                                  value={eventEndDate}
                                  min={eventStartDate}
                                  max={addDays(eventStartDate, 14)}
                                  onChange={(e) => setEventEndDate(e.target.value)}
                                />
                              </>
                            ) : (
                              <input
                                type="month"
                                className="event-date-input"
                                value={eventMonth}
                                onChange={(e) => setEventMonth(e.target.value)}
                              />
                            )}
                          </>
                        )}
                      </div>

                      <div className="event-results-list">
                        {activeEvents.length === 0 ? (
                          <span className="event-results-empty">No events found in this date range</span>
                        ) : (
                          activeEvents.map((e) => (
                            <div className="event-result-card" key={e.id}>
                              <span className="event-result-name">{e.name}</span>
                              <span className="event-result-meta">
                                {formatDisplayDate(e.date)}
                                {e.endDate && e.endDate !== e.date ? ` \u2013 ${formatDisplayDate(e.endDate)}` : ""}
                                {" \u00b7 "}
                                {e.location}
                                {e.price ? ` \u00b7 ${e.price}` : ""}
                              </span>
                              {e.link && (
                                <a href={e.link} target="_blank" rel="noreferrer" className="event-result-link">
                                  Book &rarr;
                                </a>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {expandedCategoryData.id === "local-attractions" && showGolfSpaResults && (
                    <GolfSpaResults center={ISLAY_CENTER} />
                  )}
                </>
              ) : (
                INTEREST_CATEGORIES.map((c) => {
                  const on = c.alwaysOn || activeCategories.has(c.id);
                  return (
                    <button
                      key={c.id}
                      className={"filter-btn" + (on ? " active" : "")}
                      onClick={() => toggleCategory(c.id, c.alwaysOn)}
                    >
                      <span>{c.icon}</span> {c.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <MapCanvas
              distilleries={isLive ? distilleries : []}
              localFeatures={isLive ? visibleLocalFeatures : []}
              highlightedDistillerySlugs={isLive ? highlightedDistillerySlugs : []}
              isLive={isLive}
              routeStops={routeCoords.reduce<{ lat: number; lng: number }[]>((points, coord, i) => {
                if (i === 0) return [coord];
                const real = routeSegments[i - 1];
                // Real road geometry when we have it; a plain straight
                // line for just this segment if OSRM couldn't route it -
                // degrades gracefully rather than breaking the whole route.
                return [...points, ...(real ? real.points : [routeCoords[i - 1], coord])];
              }, [])}
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
            {isLive && !weatherMinimized && (
              <div className="weather-popup">
                <button
                  className="weather-popup-close"
                  onClick={() => setWeatherMinimized(true)}
                  aria-label="Minimize"
                >
                  &times;
                </button>
                <div className="weather-popup-title">
                  🌤️ Visiting in {weatherMonthName}
                </div>
                <p className="weather-popup-text">
                  ~{weatherMonthClimate.daylightHours} of daylight, average high {weatherMonthClimate.avgHighC}°C —{" "}
                  {weatherMonthClimate.summary}.
                </p>
                {eventsDuringVisit.length > 0 && (
                  <p className="weather-popup-events">
                    📅 Worth knowing: {eventsDuringVisit.map((e) => e.name).join(", ")}{" "}
                    {eventsDuringVisit.length > 1 ? "are" : "is"} on during your visit.
                  </p>
                )}
                <button className="weather-popup-dismiss" onClick={() => setWeatherMinimized(true)}>
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLive && weatherMinimized && (
        <div className="below-map-section weather-banner-section">
          <div className="weather-banner">
            <span className="weather-banner-icon">🌤️</span>
            <span className="weather-banner-text">
              Visiting in {weatherMonthName}: ~{weatherMonthClimate.daylightHours} of daylight, average high{" "}
              {weatherMonthClimate.avgHighC}°C — {weatherMonthClimate.summary}.
              {eventsDuringVisit.length > 0 && (
                <>
                  {" "}
                  📅 Worth knowing: {eventsDuringVisit.map((e) => e.name).join(", ")}{" "}
                  {eventsDuringVisit.length > 1 ? "are" : "is"} on during your visit.
                </>
              )}
            </span>
            <button className="weather-banner-expand" onClick={() => setWeatherMinimized(false)}>
              More &darr;
            </button>
          </div>
        </div>
      )}

      <div className="below-map-section">
        <div className="how-eyebrow">Keep exploring</div>
        <h2 className="how-title">Classic journeys</h2>
        <div className="journeys-grid">
          {CLASSIC_JOURNEYS.map((journey) => {
            const stops = getJourneyDistilleries(journey, distilleries);
            const price = routeStartingPrice(journey, distilleries);
            return (
              <Link href={`/journeys/${journey.slug}`} className="journey-card" key={journey.slug}>
                <div className="journey-card-tagline">{journey.tagline}</div>
                <div className="journey-card-name">{journey.name}</div>
                <div className="journey-card-stops">{stops.map((d) => d.name).join(", ")}</div>
                {price !== null && <div className="journey-card-price">From £{price}pp</div>}
              </Link>
            );
          })}
        </div>
      </div>

      <TripEssentials />

      <div className="below-map-section">
        <div className="how-eyebrow">Coming soon</div>
        <h2 className="how-title">Where to stay</h2>
        <div className="accommodation-placeholder">
          <div className="accommodation-placeholder-icon">🏨</div>
          <p>
            Accommodation suggestions near your route are on the way — hotels, B&amp;Bs, and self-catering,
            booked straight through the site.
          </p>
          <p style={{ fontSize: 12, opacity: 0.8 }}>Launching once our booking partner is confirmed.</p>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
