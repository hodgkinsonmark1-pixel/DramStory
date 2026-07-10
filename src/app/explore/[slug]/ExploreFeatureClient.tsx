"use client";

import { useState } from "react";
import Image from "next/image";
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
  golf: "Golf",
  spa: "Spa",
  transport: "Transport",
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
  golf: "#4A7A4A",
  spa: "#C77DA6",
  transport: "#5C7A99",
};

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same helper as the distillery pages, kept
 *  local here since Natural Features content uses the same convention. */
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    return (
      <Link href={href} key={i} className="dist-inline-link">
        {label}
      </Link>
    );
  });
}

export default function ExploreFeatureClient({ feature: f }: ExploreFeatureClientProps) {
  const trip = useTrip();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
  const isFoodDrink = f.category === "pub" || f.category === "cafe" || f.category === "restaurant";

  // "Trip Tips" sidebar card only appears if at least one of these fields
  // has content - Natural Features get it, Food & Drink venues (which
  // don't have these fields populated) simply won't show an empty card.
  const hasTripTips = f.bestTimeToVisit || f.nearestFacilities || f.whatToBring || f.mobileSignalNote || f.pairsWellWith;

  return (
    <div className="distillery-page page">
      <Link href={totalStops > 0 ? "/journey?resume=1" : "/journey"} className="dist-back-bar">
        <span>&larr; {totalStops > 0 ? "Back to your journey" : "Back to the map"}</span>
        {totalStops > 0 && <span className="dist-back-stops">{totalStops} stop{totalStops > 1 ? "s" : ""}</span>}
      </Link>

      <div className="distillery-hero">
        {f.heroImageUrl ? (
          <Image className="distillery-hero-img" src={f.heroImageUrl} alt={f.name} fill unoptimized style={{ objectFit: "cover" }} />
        ) : (
          // No hero photo uploaded yet - a colour + icon placeholder rather
          // than a broken image, same fallback pattern as distilleries.
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
        )}
        <div className="distillery-hero-overlay" />
        <div className="distillery-hero-content">
          <div>
            <h1 className="distillery-hero-title">{f.name}</h1>
            <div className="distillery-hero-sub">
              <span className="hero-badge">{CATEGORY_LABELS[f.category]}</span>
              {f.difficulty && <span className="hero-badge">{f.difficulty}</span>}
              {isFoodDrink && f.hygieneRating && f.hygieneRating !== "Not Found" && (
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

      {f.whyVisit && (
        <div className="dist-why-visit">
          <span className="dist-why-visit-label">Why you should definitely visit</span>
          <p>{f.whyVisit}</p>
        </div>
      )}

      <div className="distillery-body">
        <div className="dist-detail-grid">
          <div>
            <div className="dist-section">
              <div className="dist-section-title">What to Expect</div>
              {f.description.split("\n\n").map((para, i) => (
                <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                  {renderWithLinks(para)}
                </p>
              ))}
            </div>

            {f.greatFor && f.greatFor.length > 0 && (
              <div className="dist-section">
                <div className="dist-section-title">Great For</div>
                <div className="facilities-grid">
                  {f.greatFor.map((tag) => (
                    <span className="facility-badge" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {f.highlights.length > 0 && (
              <div className="dist-section">
                <div className="dist-section-title">Highlights</div>
                <ul className="fun-facts-list">
                  {f.highlights.map((h) => (
                    <li key={h}>{renderWithLinks(h)}</li>
                  ))}
                </ul>
              </div>
            )}

            {(f.history || f.wildlifeHighlights) && (
              <div className="dist-below-line">
                {f.history && (
                  <div className="dist-section">
                    <div className="dist-section-title">History</div>
                    {f.history.split("\n\n").map((para, i) => (
                      <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                        {renderWithLinks(para)}
                      </p>
                    ))}
                  </div>
                )}
                {f.wildlifeHighlights && (
                  <div className="dist-section">
                    <div className="dist-section-title">Wildlife &amp; Seasonal Highlights</div>
                    <p className="dist-p">{renderWithLinks(f.wildlifeHighlights)}</p>
                  </div>
                )}
              </div>
            )}

            {f.gallery && f.gallery.length > 0 && (
              <div className="dist-section">
                <div className="dist-section-title">Gallery</div>
                <div className="dist-gallery-grid">
                  {f.gallery.map((url, i) => (
                    <button
                      type="button"
                      className="dist-gallery-img"
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      aria-label={`View larger photo ${i + 1} of ${f.name}`}
                    >
                      <Image src={url} alt={`${f.name} photo ${i + 1}`} fill unoptimized style={{ objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {f.safetyNotes && (
              <div className="dist-status-notice" style={{ margin: "20px 0 0", maxWidth: "none", padding: "16px 20px" }}>
                <span className="dist-status-icon">!</span>
                <p>
                  {f.safetyNotes}
                  {f.tideTimesUrl && (
                    <>
                      {" "}
                      <a href={f.tideTimesUrl} target="_blank" rel="noopener noreferrer" className="dist-inline-link">
                        Check live tide times &rarr;
                      </a>
                    </>
                  )}
                </p>
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
              </div>
              {f.websiteUrl && (
                <a href={f.websiteUrl} target="_blank" rel="noopener noreferrer" className="dist-website-link">
                  Visit {f.name}&apos;s official website ↗
                </a>
              )}
            </div>

            {hasTripTips && (
              <div className="sidebar-card">
                <div className="sidebar-card-title">Trip tips</div>
                <div className="info-grid">
                  {f.bestTimeToVisit && (
                    <div className="info-item">
                      <div className="info-label">Best time to visit</div>
                      <div className="info-value">{f.bestTimeToVisit}</div>
                    </div>
                  )}
                  {f.nearestFacilities && (
                    <div className="info-item">
                      <div className="info-label">Nearest facilities</div>
                      <div className="info-value">{f.nearestFacilities}</div>
                    </div>
                  )}
                  {f.whatToBring && (
                    <div className="info-item">
                      <div className="info-label">What to bring</div>
                      <div className="info-value">{f.whatToBring}</div>
                    </div>
                  )}
                  {f.mobileSignalNote && (
                    <div className="info-item">
                      <div className="info-label">Mobile signal</div>
                      <div className="info-value">{f.mobileSignalNote}</div>
                    </div>
                  )}
                  {f.pairsWellWith && (
                    <div className="info-item">
                      <div className="info-label">Pairs well with</div>
                      <div className="info-value">{renderWithLinks(f.pairsWellWith)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && f.gallery && (
        <div
          className="dist-lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${f.name} photo gallery`}
        >
          <button type="button" className="dist-lightbox-close" onClick={() => setLightboxIndex(null)} aria-label="Close photo">
            &times;
          </button>
          {f.gallery.length > 1 && (
            <button
              type="button"
              className="dist-lightbox-nav dist-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i - 1 + f.gallery!.length) % f.gallery!.length));
              }}
              aria-label="Previous photo"
            >
              &larr;
            </button>
          )}
          <div className="dist-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            <Image
              src={f.gallery[lightboxIndex]}
              alt={`${f.name} photo ${lightboxIndex + 1}`}
              fill
              unoptimized
              style={{ objectFit: "contain" }}
            />
          </div>
          {f.gallery.length > 1 && (
            <button
              type="button"
              className="dist-lightbox-nav dist-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i + 1) % f.gallery!.length));
              }}
              aria-label="Next photo"
            >
              &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
