"use client";

import { useState } from "react";
import { useTrip } from "@/lib/trip-context";
import { stopId, stopName } from "@/lib/itinerary-stop";
import DreamingMap, { type DreamingMapTap } from "./DreamingMap";
import type { Distillery, ItineraryStop, LocalFeature } from "@/lib/types";

/** Categories shown permanently on the dreaming map (11 Aug 2026, Mark's
 *  request) - distilleries always, plus Natural Features/Local
 *  Attractions, matching the same taxonomy Workspace.tsx's own filter
 *  bar uses (see its visibleLocalFeatures). Places to eat/drink
 *  deliberately excluded per Mark's explicit ask. Local Events left out
 *  too for now - it's a date-range-gated concept everywhere else on the
 *  site (Workspace.tsx resolves it against the header's date picker),
 *  and dreaming has no dates by definition ("no dates, no obligation" -
 *  hero-handoff.md §4.3) - flagging this as a scope call rather than a
 *  decision made on Mark's behalf; worth its own conversation if wanted
 *  here later. */
const SHORTLISTABLE_FEATURE_CATEGORIES: LocalFeature["category"][] = [
  "beach",
  "walk",
  "bike-route",
  "local-gem",
  "historic-site",
  "attraction-gem",
  "golf",
  "spa",
  "transport",
];

export default function DreamingShortlistSection({
  distilleries,
  localFeatures,
  center,
}: {
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
  center: { lat: number; lng: number };
}) {
  const trip = useTrip();
  const [tappedPin, setTappedPin] = useState<DreamingMapTap | null>(null);
  const [dayPickerFor, setDayPickerFor] = useState<ItineraryStop | null>(null);

  const visibleFeatures = localFeatures.filter((f) => SHORTLISTABLE_FEATURE_CATEGORIES.includes(f.category));
  const shortlist = trip.shortlist;
  const shortlistedIds = new Set(shortlist.map((s) => stopId(s)));

  function toggleShortlist(target: DreamingMapTap) {
    if (shortlistedIds.has(target.id)) {
      trip.removeFromShortlist(target.id);
      return;
    }
    if (target.kind === "distillery") {
      const d = distilleries.find((x) => x.slug === target.id);
      if (d) trip.addDistilleryToShortlist(d);
    } else {
      const f = visibleFeatures.find((x) => x.id === target.id);
      if (f) trip.addFeatureToShortlist(f);
    }
  }

  /** Commits a shortlisted item into a real day, then drops it from the
   *  shortlist. dayIndex undefined + no real days yet -> auto-creates
   *  Day 1 (same fallback pattern used elsewhere on the site, e.g.
   *  AreaClient.tsx's toggleFeature). dayIndex undefined + real days
   *  already exist is handled by the caller opening the picker instead -
   *  see handleAddToDayClick below. */
  function commitToDay(item: ItineraryStop, dayIndex: number) {
    if (item.kind === "distillery") trip.addStop(dayIndex, item.distillery);
    else trip.addFeatureStop(dayIndex, item.feature);
    trip.removeFromShortlist(stopId(item));
  }

  function handleAddToDayClick(item: ItineraryStop) {
    if (trip.days.length === 0) {
      trip.initDays(1);
      commitToDay(item, 0);
      return;
    }
    setDayPickerFor(item);
  }

  const tappedItem: ItineraryStop | undefined = tappedPin
    ? shortlist.find((s) => stopId(s) === tappedPin.id) ??
      (tappedPin.kind === "distillery"
        ? (() => {
            const d = distilleries.find((x) => x.slug === tappedPin.id);
            return d ? ({ kind: "distillery" as const, distillery: d } satisfies ItineraryStop) : undefined;
          })()
        : (() => {
            const f = visibleFeatures.find((x) => x.id === tappedPin.id);
            return f ? ({ kind: "feature" as const, feature: f } satisfies ItineraryStop) : undefined;
          })())
    : undefined;

  return (
    <div style={{ marginTop: 8 }}>
      <DreamingMap
        distilleries={distilleries}
        localFeatures={visibleFeatures}
        center={center}
        shortlistedIds={shortlistedIds}
        onTap={setTappedPin}
      />

      {tappedPin && tappedItem && (
        <div className="hero-dream-card" style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="hero-dream-card-kicker">{tappedPin.kind === "distillery" ? "Distillery" : "Local feature"}</div>
            <h3 className="hero-dream-card-title" style={{ fontSize: 17 }}>
              {tappedPin.name}
            </h3>
          </div>
          <button type="button" className="days-hub-card-action" onClick={() => toggleShortlist(tappedPin)}>
            {shortlistedIds.has(tappedPin.id) ? "✓ Shortlisted · Remove" : "+ Add to shortlist"}
          </button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div className="hero-dream-card-kicker">Your shortlist{shortlist.length > 0 ? ` · ${shortlist.length}` : ""}</div>
        {shortlist.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--peat)", marginTop: 6 }}>
            Nothing shortlisted yet - tap a pin on the map above to start.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {shortlist.map((item) => (
              <li
                key={stopId(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "white",
                  border: "1px solid var(--stone)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dark)" }}>{stopName(item)}</span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="days-hub-card-action" onClick={() => handleAddToDayClick(item)}>
                    Add to a day
                  </button>
                  <button
                    type="button"
                    className="days-hub-card-action"
                    aria-label={`Remove ${stopName(item)} from shortlist`}
                    onClick={() => trip.removeFromShortlist(stopId(item))}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dayPickerFor && (
        <div className="tour-picker-backdrop" onClick={() => setDayPickerFor(null)}>
          <div
            className="tour-picker-modal"
            role="dialog"
            aria-label={`Add ${stopName(dayPickerFor)} to a day`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="tour-picker-close" onClick={() => setDayPickerFor(null)} aria-label="Close">
              &times;
            </button>
            <div className="tour-picker-heading">Add {stopName(dayPickerFor)} to which day?</div>
            {trip.days.map((day, i) => (
              <button
                key={day.id}
                type="button"
                className="days-answers-menu-row"
                onClick={() => {
                  commitToDay(dayPickerFor, i);
                  setDayPickerFor(null);
                }}
              >
                {day.label}
              </button>
            ))}
            <button
              type="button"
              className="days-answers-menu-row"
              onClick={() => {
                const newIndex = trip.addDay();
                commitToDay(dayPickerFor, newIndex);
                setDayPickerFor(null);
              }}
            >
              + New day
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
