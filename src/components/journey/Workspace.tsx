"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Distillery, InterestCategoryId, LocalEvent, LocalFeature, LocationAnswer, TripTiming } from "@/lib/types";
import { INTEREST_CATEGORIES, REGIONS } from "@/lib/journey-options";
import { CLASSIC_JOURNEYS, getJourneyDistilleries } from "@/lib/journeys-data";
import { roundPriceUp } from "@/lib/pricing";
import { getMonthClimate, MONTH_NAMES } from "@/lib/islay-climate";
import { estimatedDriveMinutes, formatDuration } from "@/lib/drive-time";
import { useRouteSegments } from "@/lib/use-route-segments";
import { useTrip } from "@/lib/trip-context";
import { buildAccommodationBookingLink, buildBookingComLink } from "@/lib/accommodation-links";
import { stopCoords, stopId, stopName, stopVisitMinutes, incrementVisitMinutes } from "@/lib/itinerary-stop";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MapCanvas from "./MapCanvas";
import AccommodationControl from "./AccommodationControl";
import DateRangePicker from "./DateRangePicker";
import TripEssentials from "./TripEssentials";
import OnboardingOverlay from "./OnboardingOverlay";

interface WorkspaceProps {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  localEvents: LocalEvent[];
  location: LocationAnswer;
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

// Small date helpers for the Local Events drill-down UI - deliberately
// plain date-string math (no date library) since these only ever handle
// simple day-count arithmetic on ISO strings.
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  // Guards against an empty/invalid isoDate (e.g. a still-unset date
  // field) - toISOString() throws on an Invalid Date, which previously
  // crashed the whole page rather than failing quietly. Falls back to
  // today rather than propagating the invalid value further.
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
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
  initialInterests,
  timing,
}: WorkspaceProps) {
  const trip = useTrip();
  const [activeCategories, setActiveCategories] = useState<Set<InterestCategoryId>>(
    new Set(initialInterests)
  );
  const [expandedCategory, setExpandedCategory] = useState<InterestCategoryId | null>(null);
  const [activeSubcats, setActiveSubcats] = useState<Set<string>>(new Set());
  // activeDayIndex is derived from the shared, persisted trip.currentDayIndex
  // (not local state) so it survives navigating away to a distillery page
  // and back, and so adding a tour from that distillery's own page lands
  // on the day actually being viewed. Clamped defensively in case a day
  // was removed since it was last set.
  const activeDayIndex = Math.min(trip.currentDayIndex, Math.max(0, trip.days.length - 1));
  function setActiveDayIndex(next: number) {
    trip.setCurrentDayIndex(next);
  }

  // "When are you visiting" now lives in TripContext (trip.tripDates) -
  // set once via the workspace header, not per-subtab local state - so it
  // survives navigating away and back and is available to Local Events,
  // the weather popup, and calendar-date day labels alike.
  const todayIso = new Date().toISOString().slice(0, 10);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [weatherMinimized, setWeatherMinimized] = useState(false);
  // Shown only after pressing "Save My Dram Story", not continuously
  // while editing - dismissible via its own close button. Re-derives
  // dayCountExceedsRange fresh each click rather than trusting a stale
  // flag, so it also self-hides if the mismatch gets fixed later and
  // Save is pressed again.
  const [showDayMismatchNotice, setShowDayMismatchNotice] = useState(false);
  // Per-stop collapse state, scoped by stopId - a UI preference, not core
  // trip data, so it's local state rather than persisted via TripContext.
  // Opens with everything collapsed by default (19 July 2026 feedback) -
  // lazy initializer reads whatever stops are already in the current day
  // at mount time (e.g. the seeded default Day), rather than a separate
  // effect calling setState.
  const [collapsedStops, setCollapsedStops] = useState<Set<string>>(() => {
    const initialDay = trip.days[trip.currentDayIndex] ?? trip.days[0];
    return new Set(initialDay ? initialDay.stops.map((s) => stopId(s)) : []);
  });
  const toggleStopCollapsed = (id: string) =>
    setCollapsedStops((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [justSaved, setJustSaved] = useState(false);
  // Featured/curated accommodation partners - distinct from the generic
  // Hotels.com/Booking.com search above. Real, sourced, official links
  // (19 July 2026): The Machrie's room booking is a JS widget with no
  // direct URL, so links to their official hotel page instead; Port
  // Charlotte Hotel has a real direct booking-engine link.
  const FEATURED_STAYS = [
    { name: "The Machrie", url: "https://another.place/the-machrie/hotel" },
    { name: "Port Charlotte Hotel", url: "https://bookings.hopsoftware.com/en/property/Port-Charlotte-Hotel" },
  ];
  const [selectedFeatured, setSelectedFeatured] = useState(FEATURED_STAYS[0].name);

  // There's no longer a "how long" question (Step 3 removed, July 2026) -
  // trips start at a flat default day count and grow/shrink automatically
  // once the visitor sets a specific date range below, or manually via
  // +Add day/Remove at any time regardless.
  const DEFAULT_STARTING_DAYS = 3;
  useEffect(() => {
    if (trip.ready) trip.initDays(DEFAULT_STARTING_DAYS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.ready]);

  // Once a specific (not month-only) date range is confirmed in the
  // header, the itinerary's day count follows it automatically - the
  // clearest possible signal of "how long", now that it isn't asked
  // upfront. Deliberately does nothing for month-only selections (no
  // exact span to derive a day count from) or before any range is set.
  useEffect(() => {
    if (!trip.ready || trip.tripDates.mode !== "range" || !trip.tripDates.confirmed) return;
    const span = daysBetween(trip.tripDates.startDate, trip.tripDates.endDate) + 1;
    if (span > 0 && span <= 30) trip.syncDayCount(span);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.ready, trip.tripDates.mode, trip.tripDates.confirmed, trip.tripDates.startDate, trip.tripDates.endDate]);

  const title = describeLocation(location);
  const isLive = location.kind !== "region" || location.region === "islay";
  const isFlyingIn = location.kind === "airport";

  function toggleCategory(id: InterestCategoryId, alwaysOn?: boolean) {
    if (alwaysOn) {
      setExpandedCategory((prev) => (prev === id ? null : id));
      return;
    }
    // Local Events has no drill-down anymore (map pins only, per the July
    // 2026 redesign) - toggle its membership without ever expanding a
    // subcategory/date-picker row for it.
    if (id === "local-events") {
      setActiveCategories((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
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
  // Lets the onboarding walkthrough actually perform the "expand a stop"
  // action itself, rather than just pointing at it - the visitor watches
  // it happen, and it deliberately stays expanded afterward (not
  // re-collapsed), so the following "total journey time" step still
  // shows it expanded. Per 19 July 2026 conversation.
  useEffect(() => {
    function handleExpandFirstStop() {
      const first = activeDay?.stops[0];
      if (!first) return;
      const id = stopId(first);
      setCollapsedStops((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    function handleCollapseFirstStop() {
      const first = activeDay?.stops[0];
      if (!first) return;
      const id = stopId(first);
      setCollapsedStops((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
    window.addEventListener("onboarding:expand-first-stop", handleExpandFirstStop);
    window.addEventListener("onboarding:collapse-first-stop", handleCollapseFirstStop);
    return () => {
      window.removeEventListener("onboarding:expand-first-stop", handleExpandFirstStop);
      window.removeEventListener("onboarding:collapse-first-stop", handleCollapseFirstStop);
    };
  }, [activeDay]);
  // Same pattern for the "total journey time" walkthrough step - auto-
  // expands/collapses the real summary panel so the visitor sees it done,
  // then folds it back once the step is over (19 July 2026 feedback).
  useEffect(() => {
    function handleExpandSummary() {
      setSummaryExpanded(true);
    }
    function handleCollapseSummary() {
      setSummaryExpanded(false);
    }
    window.addEventListener("onboarding:expand-journey-summary", handleExpandSummary);
    window.addEventListener("onboarding:collapse-journey-summary", handleCollapseSummary);
    return () => {
      window.removeEventListener("onboarding:expand-journey-summary", handleExpandSummary);
      window.removeEventListener("onboarding:collapse-journey-summary", handleCollapseSummary);
    };
  }, []);
  // Distinguishes "the whole trip is empty" (first-time visitor, show the
  // welcoming onboarding message) from "this specific day is empty but
  // other days have stops" (show the more specific per-day message).
  const totalStops = days.reduce((sum, day) => sum + day.stops.length, 0);

  const accommodation = activeDay?.accommodation;
  const stopCoordsForDay = activeDay ? activeDay.stops.map(stopCoords) : [];
  // When a base is set, the day's route becomes a loop: base -> stops -> base,
  // so drive-time/cost totals reflect the actual journey, not just
  // stop-to-stop hops with the trip to/from home left out.
  const routeCoords = accommodation
    ? [{ lat: accommodation.lat, lng: accommodation.lng }, ...stopCoordsForDay, { lat: accommodation.lat, lng: accommodation.lng }]
    : stopCoordsForDay;
  const { segments: routeSegments } = useRouteSegments(routeCoords);

  // Drive time + visit time totals for the currently viewed day. Prefers
  // the real road-routed duration for each segment; falls back to the
  // haversine estimate only while that segment's route is still loading
  // or if OSRM couldn't route it - so the numbers never show 0m/blank
  // while waiting, they just start as an estimate and firm up shortly after.
  const driveSegments: number[] = [];
  if (activeDay) {
    for (let i = 0; i < routeCoords.length - 1; i++) {
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
    ? roundPriceUp(
        activeDay.stops.reduce((sum, s) => sum + (s.kind === "distillery" ? s.tour?.price ?? 0 : 0), 0)
      )
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
  // separate label->category maps. "Golf & Spa" maps to TWO Local
  // Feature categories at once (golf + spa), now real Airtable pins
  // (verified Machrie Golf, Islay Sauna, Bothan Jura Wild Sauna) rather
  // than the earlier Google Places-sourced list view.
  const ATTRACTION_SUBCAT_TO_FEATURE_CATEGORIES: Record<string, LocalFeature["category"][]> = {
    "Historic Sites": ["historic-site"],
    "Local Gems": ["attraction-gem"],
    "Golf & Spa": ["golf", "spa"],
    Transport: ["transport"],
  };
  const localAttractionsActive = activeCategories.has("local-attractions");
  const activeAttractionSubcats = Array.from(activeSubcats)
    .filter((key) => key.startsWith("local-attractions:"))
    .flatMap((key) => ATTRACTION_SUBCAT_TO_FEATURE_CATEGORIES[key.split(":")[1]] ?? []);

  // Places to Eat subcategory labels -> LocalFeature.category values.
  // "Fine Dining" has no distinct Airtable category (no reliable
  // OSM-tagged equivalent) and deliberately maps to nothing.
  const EAT_SUBCAT_TO_FEATURE_CATEGORY: Record<string, LocalFeature["category"] | undefined> = {
    Bars: "pub",
    Cafes: "cafe",
    Restaurants: "restaurant",
    "Fine Dining": undefined,
  };
  const placesToEatActive = activeCategories.has("places-to-eat");
  const activeEatSubcats = Array.from(activeSubcats)
    .filter((key) => key.startsWith("places-to-eat:"))
    .map((key) => EAT_SUBCAT_TO_FEATURE_CATEGORY[key.split(":")[1]])
    .filter((c): c is LocalFeature["category"] => c !== undefined);

  const visibleLocalFeatures = [
    ...(naturalFeaturesActive
      ? localFeatures.filter(
          (f) =>
            (f.category === "beach" || f.category === "walk" || f.category === "bike-route" || f.category === "local-gem") &&
            (activeNaturalSubcats.length === 0 || activeNaturalSubcats.includes(f.category))
        )
      : []),
    ...(localAttractionsActive
      ? localFeatures.filter(
          (f) =>
            (f.category === "historic-site" || f.category === "attraction-gem" || f.category === "golf" || f.category === "spa" || f.category === "transport") &&
            (activeAttractionSubcats.length === 0 || activeAttractionSubcats.includes(f.category))
        )
      : []),
    ...(placesToEatActive
      ? localFeatures.filter(
          (f) =>
            (f.category === "pub" || f.category === "cafe" || f.category === "restaurant") &&
            (activeEatSubcats.length === 0 || activeEatSubcats.includes(f.category))
        )
      : []),
  ];

  // Local Events: resolve the currently-selected date range (fixed to
  // today for "today" timing; otherwise the header's shared date/month
  // picker). Null when nothing's been picked yet - Local Events pins and
  // the weather popup both stay empty/hidden in that case, rather than
  // guessing a range nobody chose.
  const selectedRange: [string, string] | null =
    timing === "today"
      ? [todayIso, todayIso]
      : !trip.tripDates.confirmed
        ? null
        : trip.tripDates.mode === "month"
          ? [`${trip.tripDates.month}-01`, lastDayOfMonth(trip.tripDates.month)]
          : [trip.tripDates.startDate, trip.tripDates.endDate];
  // Calendar-date day labels only make sense once a specific range (not
  // just a month) has been confirmed - a month alone doesn't pin down
  // which exact day "Day 1" falls on.
  const useCalendarDayLabels =
    timing !== "today" && trip.tripDates.mode === "range" && trip.tripDates.confirmed && Boolean(trip.tripDates.startDate);
  function calendarDayLabel(dayIndex: number): string {
    return formatDisplayDate(addDays(trip.tripDates.startDate, dayIndex));
  }
  // Flags it when the itinerary has grown past a date range that was
  // later narrowed - syncDayCount is grow-only (see trip-context), so
  // this can genuinely happen rather than self-correcting. Passive only:
  // names the mismatch and suggests the two fixes, doesn't force either.
  const dateRangeSpan = useCalendarDayLabels
    ? daysBetween(trip.tripDates.startDate, trip.tripDates.endDate) + 1
    : null;
  const dayCountExceedsRange = dateRangeSpan !== null && days.length > dateRangeSpan;
  const localEventsActive = activeCategories.has("local-events");
  // No events at all until a real date/month has been chosen - this is
  // the map-pin indicator now (a pulsing ring on the hosting distillery,
  // per MapCanvas), not a list, so "no events" just means no ring shows.
  const activeEvents =
    localEventsActive && selectedRange
      ? localEvents.filter((e) => rangesOverlap(e.date, e.endDate ?? e.date, selectedRange[0], selectedRange[1]))
      : [];
  const highlightedDistillerySlugs = Array.from(new Set(activeEvents.flatMap((e) => e.distillerySlugs)));

  // Local Events used to have its own inline "no events found" text in
  // the (now-removed) drill-down list; toggling the filter with no
  // matching pins to show otherwise looked like it did nothing at all.
  // This surfaces the same two messages as a dismissible map popup
  // instead - reset to visible each time the filter is freshly turned
  // on, so re-opening it after dismissing shows it again rather than
  // staying silently hidden forever.
  const [eventsNoticeDismissed, setEventsNoticeDismissed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localEventsActive) setEventsNoticeDismissed(false);
  }, [localEventsActive]);
  const showEventsNotice =
    localEventsActive && !eventsNoticeDismissed && (!selectedRange || activeEvents.length === 0);
  const eventsNoticeText = !selectedRange
    ? "Pick dates in the header above to see events during your visit."
    : "No events found for the dates you've selected.";

  // Weather/daylight banner - uses the same selectedRange as Local
  // Events, but deliberately independent of whether that filter is
  // toggled on, since this is a separate "when are you visiting" insight
  // that should show regardless. Falls back to today's date purely for
  // the arithmetic below when nothing's selected yet; weatherReady (below)
  // is what actually keeps the popup hidden in that case.
  const weatherRange = selectedRange ?? [todayIso, todayIso];
  const weatherMonthNumber = Number(weatherRange[0].slice(5, 7));
  const weatherMonthClimate = getMonthClimate(weatherMonthNumber);
  const weatherMonthName = MONTH_NAMES[weatherMonthNumber - 1];
  const eventsDuringVisit = selectedRange
    ? localEvents.filter((e) => rangesOverlap(e.date, e.endDate ?? e.date, selectedRange[0], selectedRange[1]))
    : [];
  // "Today" always has a real date (today), so the popup can show
  // immediately; other timings need the header date control to have
  // actually been used at least once first.
  const weatherReady = isLive && (timing === "today" || trip.tripDates.confirmed);

  // Seasonal-closure / silent-season notices for any distillery currently
  // in the active day's itinerary. Reads the existing free-text
  // statusNotice field rather than a structured date range, since that
  // field isn't date-range-structured in Airtable yet - so this surfaces
  // whatever's flagged regardless of the exact dates selected, rather
  // than truly matching against the visit window.
  const closureNotices = activeDay
    ? Array.from(
        new Set(
          activeDay.stops
            .filter((s): s is Extract<typeof s, { kind: "distillery" }> => s.kind === "distillery")
            .map((s) => s.distillery.statusNotice)
            .filter((n): n is string => Boolean(n))
        )
      )
    : [];

  if (!trip.ready || !activeDay) {
    return <div className="workspace-root" />;
  }

  return (
    <>
    <OnboardingOverlay timing={timing} />
    <div className="workspace-root">
      <div className="map-page-header">
        <div className="map-page-header-left">
          <Link href="/" className="map-page-header-logo">
            <Logo size={36} />
            <span className="map-page-header-logo-text">DramStory</span>
          </Link>

          {timing !== "today" && (
            <div className="header-date-control" id="onboard-header-dates">
              <div className="event-mode-toggle">
                <button
                  className={"event-mode-btn" + (trip.tripDates.mode === "range" ? " active" : "")}
                  data-date-mode-btn="range"
                  onClick={() => trip.setDateMode("range")}
                >
                  Dates
                </button>
                <button
                  className={"event-mode-btn" + (trip.tripDates.mode === "month" ? " active" : "")}
                  onClick={() => trip.setDateMode("month")}
                >
                  Month
                </button>
              </div>
              {trip.tripDates.mode === "range" ? (
                <DateRangePicker
                  startDate={trip.tripDates.startDate}
                  endDate={trip.tripDates.endDate}
                  onChange={(start, end) => trip.setDateRange(start, end)}
                />
              ) : (
                <input
                  type="month"
                  className="event-date-input"
                  value={trip.tripDates.month}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => trip.setDateMonth(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        <div className="map-page-header-links">
          <span className="map-page-header-badge">{title}</span>
          {timing === "today" && <span className="header-date-today">📅 Today</span>}

          <Link
            href="/distilleries"
            id="onboard-nav-distilleries"
            target="_blank"
            rel="noopener noreferrer"
          >
            Distilleries
          </Link>
          <Link
            href="/local-features"
            id="onboard-nav-local-features"
            target="_blank"
            rel="noopener noreferrer"
          >
            Local Features
          </Link>
          <Link
            href="/days"
            id="onboard-nav-days-hub"
            target="_blank"
            rel="noopener noreferrer"
          >
            Day Plans
          </Link>
          <Link href="/" onClick={() => trip.resetTrip()}>
            Start over
          </Link>
        </div>
      </div>

      <div className="workspace-main">
        <div className="journey-panel" id="onboard-sidebar">
          <div className="panel-header panel-header-with-nav">
            <div className="panel-eyebrow">Your itinerary</div>
            <div className="day-nav-arrows">
              <button
                className="day-nav-arrow"
                onClick={() => setActiveDayIndex(Math.max(0, activeDayIndex - 1))}
                disabled={activeDayIndex === 0}
                aria-label="Previous day"
              >
                &#8249;
              </button>
              <div className="day-nav-label">
                {useCalendarDayLabels ? calendarDayLabel(activeDayIndex) : activeDay.label}
              </div>
              <button
                className="day-nav-arrow"
                onClick={() => setActiveDayIndex(Math.min(days.length - 1, activeDayIndex + 1))}
                disabled={activeDayIndex === days.length - 1}
                aria-label="Next day"
              >
                &#8250;
              </button>
            </div>
          </div>

          <div className="day-nav">
            <div className="day-nav-actions">
              {days.length > 1 && (
                <>
                  <button
                    className="day-nav-reorder"
                    onClick={() => trip.moveDay(activeDayIndex, -1)}
                    disabled={activeDayIndex === 0}
                  >
                    Move earlier
                  </button>
                  <button
                    className="day-nav-reorder"
                    onClick={() => trip.moveDay(activeDayIndex, 1)}
                    disabled={activeDayIndex === days.length - 1}
                  >
                    Move later
                  </button>
                </>
              )}
              <button className="day-nav-add" onClick={trip.addDay}>
                + Add day
              </button>
              {activeDay.stops.length > 0 && (
                <button
                  className="day-nav-reorder"
                  onClick={() => {
                    const allIds = activeDay.stops.map((s) => stopId(s));
                    const allCollapsed = allIds.every((id) => collapsedStops.has(id));
                    setCollapsedStops((prev) => {
                      const next = new Set(prev);
                      for (const id of allIds) {
                        if (allCollapsed) next.delete(id);
                        else next.add(id);
                      }
                      return next;
                    });
                  }}
                >
                  {activeDay.stops.map((s) => stopId(s)).every((id) => collapsedStops.has(id))
                    ? "Expand all"
                    : "Collapse all"}
                </button>
              )}
              {days.length > 1 && (
                <button className="day-nav-remove" onClick={() => trip.removeDay(activeDayIndex)}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {showDayMismatchNotice && dayCountExceedsRange && (
            <div className="day-count-mismatch-notice">
              <button
                className="day-count-mismatch-close"
                onClick={() => setShowDayMismatchNotice(false)}
                aria-label="Dismiss"
              >
                &times;
              </button>
              Your itinerary has {days.length} days, but your selected dates only cover {dateRangeSpan}.
              Remove the extra days, or widen your date range above.
            </div>
          )}

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
                <p>
                  {totalStops === 0
                    ? "Your journey is empty — click a distillery on the map to start building your trip."
                    : `Nothing added to ${useCalendarDayLabels ? calendarDayLabel(activeDayIndex) : activeDay.label} yet — explore the map and add distilleries or places.`}
                </p>
              </div>
            ) : (
              activeDay.stops.map((stop, i) => {
                const id = stopId(stop);
                const collapsed = collapsedStops.has(id);
                const tourName = stop.kind === "distillery" ? stop.tour?.name : undefined;
                const tourCost = stop.kind === "distillery" && stop.tour ? `£${stop.tour.price}pp` : undefined;
                const visitLabel = `~${formatDuration(stopVisitMinutes(stop))}`;

                return (
                  <div key={id} id={i === 0 ? "onboard-first-stop" : undefined}>
                    <div className="journey-stop">
                      <div className="stop-move-col" style={{ marginRight: 4 }}>
                        <button
                          className="stop-move-btn"
                          onClick={() => trip.moveStop(activeDayIndex, i, -1)}
                          disabled={i === 0}
                          aria-label={`Move ${stopName(stop)} earlier`}
                        >
                          &#8963;
                        </button>
                        <button
                          className="stop-move-btn"
                          onClick={() => trip.moveStop(activeDayIndex, i, 1)}
                          disabled={i === activeDay.stops.length - 1}
                          aria-label={`Move ${stopName(stop)} later`}
                        >
                          &#8964;
                        </button>
                      </div>
                      <div className="stop-number">{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="stop-name">{stopName(stop)}</div>

                        {collapsed ? (
                          // Compact plain-text summary line - no input box,
                          // no separate rows, just the essentials at a
                          // glance: note, tour, length, cost.
                          <div style={{ fontSize: 12, color: "var(--peat)", marginTop: 2 }}>
                            {[stop.note, tourName, visitLabel, tourCost].filter(Boolean).join(" · ")}
                          </div>
                        ) : (
                          <>
                            {stop.kind === "distillery" && stop.tour && (
                              <>
                                <div className="stop-tour">🎟 {stop.tour.name}</div>
                                <div className="stop-cost">£{stop.tour.price} per person</div>
                              </>
                            )}
                            {stop.kind === "feature" && (
                              <div className="stop-region">
                                {stop.feature.icon} {stop.feature.category.replace("-", " ")}
                              </div>
                            )}

                            <input
                              type="text"
                              value={stop.note ?? ""}
                              onChange={(e) => trip.setStopNote(activeDayIndex, id, e.target.value)}
                              placeholder="Add a note (e.g. tour at 12)"
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: 6,
                                padding: "4px 8px",
                                fontSize: 12,
                                fontStyle: stop.note ? "normal" : "italic",
                                color: stop.note ? "var(--dark)" : "var(--slate)",
                                border: "1px solid var(--stone)",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--off-white)",
                              }}
                            />

                            <div className="stop-time-row">
                              <span className="stop-time">{visitLabel} visit</span>
                              <button
                                className="stop-time-btn"
                                onClick={() =>
                                  trip.setStopMinutes(activeDayIndex, id, incrementVisitMinutes(stop, -1))
                                }
                                aria-label="Decrease visit time"
                              >
                                &minus;
                              </button>
                              <button
                                className="stop-time-btn"
                                onClick={() =>
                                  trip.setStopMinutes(activeDayIndex, id, incrementVisitMinutes(stop, 1))
                                }
                                aria-label="Increase visit time"
                              >
                                +
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        className="stop-move-btn"
                        id={i === 0 ? "onboard-first-stop-collapse" : undefined}
                        onClick={() => toggleStopCollapsed(id)}
                        aria-label={collapsed ? `Expand ${stopName(stop)}` : `Collapse ${stopName(stop)}`}
                        title={collapsed ? "Expand" : "Collapse"}
                      >
                        {collapsed ? "▸" : "▾"}
                      </button>
                      <button
                        className="stop-remove"
                        onClick={() => trip.removeStop(activeDayIndex, id)}
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
                );
              })
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
            <div className="journey-summary" id="onboard-journey-summary-panel">
              <button
                id="onboard-journey-summary"
                className="summary-total summary-total-toggle"
                onClick={() => setSummaryExpanded((v) => !v)}
              >
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

              <button
                className="save-journey-btn"
                onClick={() => {
                  // The trip already auto-persists to localStorage on every
                  // change (see TripContext) - there's no separate save
                  // step yet functionally. This button's job for now is
                  // just to surface the day-count/date-range mismatch at a
                  // point the visitor actively chose, rather than
                  // continuously nagging while they're still mid-edit.
                  if (dayCountExceedsRange) {
                    setShowDayMismatchNotice(true);
                  } else {
                    setJustSaved(true);
                    setTimeout(() => setJustSaved(false), 2000);
                  }
                }}
              >
                {justSaved ? "✓ Saved" : "📖 Save My Dram Story"}
              </button>
            </div>
          )}
        </div>

        <div className="map-area">
          <div className="map-toolbar">
            <div className="map-toolbar-row" id="onboard-toolbar-row">
              {expandedCategoryData &&
              (expandedCategoryData.subcategories.length > 0 || expandedCategoryData.id === "places-to-stay") ? (
                <>
                  <button className="filter-btn active" data-category-id="distilleries" onClick={() => toggleCategory("distilleries", true)}>
                    <span>🥃</span> Distilleries
                  </button>
                  <button
                    className="filter-btn active expanded"
                    onClick={() => toggleCategory(expandedCategoryData.id, expandedCategoryData.alwaysOn)}
                  >
                    <span>{expandedCategoryData.icon}</span> {expandedCategoryData.label}
                  </button>
                  <span className="toolbar-divider" />
                  {expandedCategoryData.id === "places-to-stay" ? (
                    <>
                      <AccommodationControl dayIndex={activeDayIndex} accommodation={accommodation} />
                      <a
                        href={buildAccommodationBookingLink(accommodation?.name ?? "Port Ellen", trip.tripDates)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="subcat-chip"
                        style={{ background: "var(--green-deep)", color: "white", fontWeight: 600 }}
                      >
                        Book Now
                      </a>
                      <a
                        href={buildBookingComLink(accommodation?.name ?? "Port Ellen", trip.tripDates)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 12,
                          color: "var(--slate)",
                          textDecoration: "underline",
                          marginLeft: 4,
                        }}
                      >
                        or try Booking.com
                      </a>
                      <span className="toolbar-divider" />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--copper)",
                          marginRight: 4,
                        }}
                      >
                        Featured stays
                      </span>
                      {FEATURED_STAYS.map((stay) => (
                        <button
                          key={stay.name}
                          className={"subcat-chip" + (selectedFeatured === stay.name ? " active" : "")}
                          onClick={() => setSelectedFeatured(stay.name)}
                        >
                          {stay.name}
                        </button>
                      ))}
                      <a
                        href={FEATURED_STAYS.find((s) => s.name === selectedFeatured)?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="subcat-chip"
                        style={{ background: "var(--copper)", color: "white", fontWeight: 600 }}
                      >
                        Book Now
                      </a>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </>
              ) : (
                INTEREST_CATEGORIES.map((c) => {
                  const on = c.alwaysOn || activeCategories.has(c.id);
                  return (
                    <button
                      key={c.id}
                      data-category-id={c.id}
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

          <div style={{ position: "relative", flex: 1, minHeight: 0 }} id="onboard-map">
            <MapCanvas
              distilleries={isLive ? distilleries : []}
              localFeatures={isLive ? visibleLocalFeatures : []}
              highlightedDistillerySlugs={isLive ? highlightedDistillerySlugs : []}
              isLive={isLive}
              accommodation={isLive ? accommodation : undefined}
              initialView={trip.mapView ?? undefined}
              onViewChange={trip.setMapView}
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
            {showEventsNotice && (
              <div className="events-notice-popup">
                <button
                  className="events-notice-close"
                  onClick={() => setEventsNoticeDismissed(true)}
                  aria-label="Dismiss"
                >
                  &times;
                </button>
                📅 {eventsNoticeText}
              </div>
            )}
            {weatherReady && !weatherMinimized && (
              <div className="weather-popup">
                <button
                  className="weather-popup-close"
                  onClick={() => setWeatherMinimized(true)}
                  aria-label="Minimize"
                >
                  &times;
                </button>
                <div className="weather-popup-title">
                  {timing === "today" ? "🌤️ Today on Islay" : `🌤️ Visiting in ${weatherMonthName}`}
                </div>
                <p className="weather-popup-text">
                  {timing === "today" ? (
                    <>
                      Check a live forecast before you head out —{" "}
                      <a
                        className="weather-inline-link"
                        href="https://weather.metoffice.gov.uk/forecast/gcgt0ynnb"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Met Office forecast for Bowmore, Islay ↗
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      You can expect ~{weatherMonthClimate.daylightHours} of daylight, average high{" "}
                      {weatherMonthClimate.avgHighC}°C — {weatherMonthClimate.summary}.
                    </>
                  )}
                </p>
                {eventsDuringVisit.length > 0 && (
                  <p className="weather-popup-events">
                    📅 Worth knowing: {eventsDuringVisit.map((e) => e.name).join(", ")}{" "}
                    {eventsDuringVisit.length > 1 ? "are" : "is"} on during your visit.
                  </p>
                )}
                {closureNotices.length > 0 && (
                  <p className="weather-popup-events">
                    ⚠️ {closureNotices.join(" ")}
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

      {weatherReady && weatherMinimized && (
        <div className="below-map-section weather-banner-section">
          <div className="weather-banner">
            <span className="weather-banner-icon">🌤️</span>
            <span className="weather-banner-text">
              {timing === "today" ? (
                <>
                  Today on Islay — check a live forecast before you head out (
                  <a
                    className="weather-inline-link"
                    href="https://weather.metoffice.gov.uk/forecast/gcgt0ynnb"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Met Office ↗
                  </a>
                  ).
                </>
              ) : (
                <>
                  Visiting in {weatherMonthName}: ~{weatherMonthClimate.daylightHours} of daylight, average high{" "}
                  {weatherMonthClimate.avgHighC}°C — {weatherMonthClimate.summary}.
                </>
              )}
              {eventsDuringVisit.length > 0 && (
                <>
                  {" "}
                  📅 Worth knowing: {eventsDuringVisit.map((e) => e.name).join(", ")}{" "}
                  {eventsDuringVisit.length > 1 ? "are" : "is"} on during your visit.
                </>
              )}
              {closureNotices.length > 0 && <> ⚠️ {closureNotices.join(" ")}</>}
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
            return (
              <Link href={`/journeys/${journey.slug}`} className="journey-card" key={journey.slug}>
                <div className="journey-card-tagline">{journey.tagline}</div>
                <div className="journey-card-name">{journey.name}</div>
                <div className="journey-card-stops">{stops.map((d) => d.name).join(", ")}</div>
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
