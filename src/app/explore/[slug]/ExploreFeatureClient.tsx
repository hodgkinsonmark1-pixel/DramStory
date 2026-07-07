"use client";

import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import type { LocalFeature } from "@/lib/types";

interface ExploreFeatureClientProps {
  feature: LocalFeature;
}

const CATEGORY_LABELS: Record<LocalFeature["category"], string> = {
  beach: "Beach",
  walk: "Walk",
  "bike-route": "Bike Route",
  "local-gem": "Local Gem",
  "historic-site": "Historic Site",
  "attraction-gem": "Local Gem",
  pub: "Pub",
  cafe: "Cafe",
  restaurant: "Restaurant",
};

const CATEGORY_COLORS: Record<LocalFeature["category"], string> = {
  beach: "#D4A574",
  walk: "#2D6A4F",
  "bike-route": "#3A6EA5",
  "local-gem": "#8B5FBF",
  "historic-site": "#8B6F47",
  "attraction-gem": "#B8557A",
  pub: "#A64A4A",
  cafe: "#B87D4B",
  restaurant: "#4A6A8A",
};

export default function ExploreFeatureClient({ feature: f }: ExploreFeatureClientProps) {
  const trip = useTrip();

  const inJourney = trip.ready && trip.days.some((day) => day.stops.some((s) => s.kind === "feature" && s.feature.id === f.id));
  const totalStops = trip.days.reduce((sum, day) => sum + day.stops.length, 0);

  function toggleAddToTrip() {
    trip.initDays(1);
    if (inJourney) {
      trip.removeStop(0, f.id);
    } else {
      trip.addFeatureStop(0, f);
    }
  }

  const isWalkOrRide = f.category === "walk" || f.category === "bike-route";

  return (
    <div className="distillery-page page">
      <Link href={totalStops > 0 ? "/journey?resume=1" : "/distilleries"} className="dist-back-bar">
        <span>&larr; {totalStops > 0 ? "Back to your journey" : "Back to distilleries"}</span>
        {totalStops > 0 && <span className="dist-back-stops">{totalStops} stop{totalStops > 1 ? "s" : ""}</span>}
      </Link>

      <div className="distillery-hero">
        {/* No real photography sourced yet - a colour + icon placeholder
            rather than a broken image, per the "add photos" placeholder
            decision. Swap for a real image field once photos exist. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${CATEGORY_COLORS[f.category]}, ${CATEGORY_COLORS[f.category]}cc)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
          }}
        >
          {f.icon}
        </div>
        <div className="distillery-hero-overlay" />
        <div className="distillery-hero-content">
          <div>
            <h1 className="distillery-hero-title">{f.name}</h1>
            <div className="distillery-hero-sub">
              <span className="hero-badge">{CATEGORY_LABELS[f.category]}</span>
              {f.difficulty && <span className="hero-badge">{f.difficulty}</span>}
              {f.hygieneRating && f.hygieneRating !== "Not Found" && (
                <span className="hero-badge">Hygiene: {f.hygieneRating}</span>
              )}
            </div>
          </div>
          <div className="distillery-hero-actions">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`}
              target="_blank"
              rel="noreferrer"
              className="hero-action-btn hero-action-secondary"
            >
              Get Directions
            </a>
            <button
              className={"hero-action-btn hero-action-primary" + (inJourney ? " in-journey" : "")}
              onClick={toggleAddToTrip}
            >
              {inJourney ? "✓ In Your Journey" : "+ Add to Journey"}
            </button>
          </div>
        </div>
      </div>

      <div className="distillery-body">
        <div className="dist-grid">
          <div>
            <div className="dist-section">
              <div className="dist-section-title">About {f.name}</div>
              <p className="dist-p">{f.description}</p>
            </div>

            {f.highlights.length > 0 && (
              <div className="dist-section">
                <div className="dist-section-title">Highlights</div>
                <ul style={{ paddingLeft: 20, color: "var(--peat)", fontSize: 14, lineHeight: 1.8 }}>
                  {f.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="dist-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-title">Visit info</div>
              <div className="info-grid">
                {isWalkOrRide && f.length && (
                  <div className="info-item">
                    <div className="info-label">Length</div>
                    <div className="info-value">{f.length}</div>
                  </div>
                )}
                {isWalkOrRide && f.duration && (
                  <div className="info-item">
                    <div className="info-label">Duration</div>
                    <div className="info-value">{f.duration}</div>
                  </div>
                )}
                {isWalkOrRide && f.difficulty && (
                  <div className="info-item">
                    <div className="info-label">Difficulty</div>
                    <div className="info-value">{f.difficulty}</div>
                  </div>
                )}
                <div className="info-item">
                  <div className="info-label">Opening hours</div>
                  <div className="info-value">{f.openingHours}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Parking</div>
                  <div className="info-value">{f.parking}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Accessibility</div>
                  <div className="info-value">{f.accessibility}</div>
                </div>
                {f.websiteUrl && (
                  <div className="info-item">
                    <div className="info-label">Website</div>
                    <div className="info-value">
                      <a href={f.websiteUrl} target="_blank" rel="noreferrer">
                        Visit site &rarr;
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
