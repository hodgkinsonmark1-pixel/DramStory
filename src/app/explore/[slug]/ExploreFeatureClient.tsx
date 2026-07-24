"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import type { LocalFeature } from "@/lib/types";
import DetailPageBar from "@/components/DetailPageBar";

// Simple line-style icons for the Quick Facts strip - pick up the brand
// copper colour via currentColor/CSS `color`, unlike emoji which render
// in their own fixed native colours regardless of styling.
const ICON_PROPS = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IconParking() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
    </svg>
  );
}
function IconAccess() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M11 7v5l-3 6M11 12h5l3 6" />
      <circle cx="9" cy="18" r="3" />
    </svg>
  );
}
function IconToilet() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="5" r="1.8" />
      <path d="M8 8v5M5.5 11h5M6.5 13l-1.5 6M9.5 13l1.5 6" />
      <circle cx="17" cy="5" r="1.8" />
      <path d="M17 8v10M15 12h4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}
function IconRoute() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 19c3-6 6 2 9-4s4-6 7-2" />
      <circle cx="4" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="13" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

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

// Beach/Walk/Bike Route/Local Gem/Historic Site get the single-column
// editorial treatment built for Natural Features (Historic Site joined
// 24 July 2026, matching Machir Bay's page as the reference standard).
// Every other category still uses the two-column Distillery-derived
// layout below, until each of those gets its own pass (Attraction Gem
// is reviewed separately next; Transport after).
const NATURAL_FEATURE_CATEGORIES: LocalFeature["category"][] = ["beach", "walk", "bike-route", "local-gem", "historic-site"];

/** Small top-right corner tag for photo attribution - shown on a hero
 *  image or in the lightbox whenever that photo has a credit set. Top
 *  corner deliberately, not bottom - both hero layouts already put the
 *  "Get Directions"/"Add to Journey" buttons bottom-right, and only the
 *  "← Back" link occupies the top, which sits top-LEFT. Credit text is
 *  either plain ("Photo: Jane Doe") or a "[label](url)" markdown-style
 *  link to the source/license page (e.g. a Wikimedia Commons file page)
 *  - CC BY/CC BY-SA images require this attribution, CC0/public-domain/
 *  own photography don't, hence credit being optional per-photo rather
 *  than a fixed caption. External link, so a real <a> tag (not the
 *  internal-only renderWithLinks/Link pattern). */
function PhotoCredit({ credit }: { credit?: string }) {
  if (!credit) return null;
  const match = credit.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const label = match ? match[1] : credit;
  const href = match ? match[2] : null;
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 3,
        background: "rgba(0,0,0,0.55)",
        color: "rgba(255,255,255,0.9)",
        fontSize: 10,
        lineHeight: 1.4,
        padding: "3px 8px",
        borderRadius: 4,
      }}
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
          {label}
        </a>
      ) : (
        label
      )}
    </div>
  );
}

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s. */
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

  const backHref = totalStops > 0 ? "/journey?resume=1" : "/journey";
  const backLabel = totalStops > 0 ? "Back to your journey" : "Back to the map";

  const lightbox =
    lightboxIndex !== null && f.gallery ? (
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
          <PhotoCredit credit={f.galleryCredits?.[lightboxIndex]} />
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
    ) : null;

  // ─────────────────────────────────────────────────────────────────
  // Natural Features: single-column editorial layout (Beach/Walk/Bike
  // Route/Local Gem). See journey-extra.css "Natural Feature page" for
  // the CSS - deliberately not a two-column sidebar layout, so there's
  // no independent column to run longer/shorter than the other.
  // ─────────────────────────────────────────────────────────────────
  if (NATURAL_FEATURE_CATEGORIES.includes(f.category)) {
    const hasFooterInfo = f.whatToBring || f.mobileSignalNote || f.pairsWellWith || f.websiteUrl;

    return (
      <div className="nf-page page">
        <div className="nf-hero">
          {f.heroImageUrl ? (
            // objectPosition defaults to the top third - most landscape
            // photos have the interesting part (sky, headland) above
            // center - but is overridable per record via Hero Focal Y
            // for photos where that doesn't suit (e.g. wide flat beaches
            // where the sand itself is the point).
            <Image
              src={f.heroImageUrl}
              alt={f.name}
              fill
              unoptimized
              style={{ objectFit: "cover", objectPosition: `center ${f.heroFocalY ?? 30}%` }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(135deg, ${CATEGORY_COLORS[f.category]}, ${CATEGORY_COLORS[f.category]}cc)`,
              }}
            />
          )}
          <PhotoCredit credit={f.heroImageCredit} />
          <div className="nf-hero-overlay" />
          <Link href={backHref} style={{ position: "absolute", top: 16, left: 20, color: "white", fontSize: 12, opacity: 0.85 }}>
            &larr; {backLabel}
          </Link>
          <div className="nf-hero-content">
            <div>
              <h1 className="nf-hero-title">{f.name}</h1>
              <div className="nf-hero-tags">
                <span className="nf-hero-tag nf-hero-tag-category">{CATEGORY_LABELS[f.category]}</span>
                {(f.greatFor ?? []).slice(0, 4).map((tag) => (
                  <span className="nf-hero-tag nf-hero-tag-activity" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="nf-hero-actions">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`}
                target="_blank"
                rel="noreferrer"
                className="hero-action-btn hero-action-secondary"
              >
                Get Directions
              </a>
              <button className={"hero-action-btn hero-action-primary" + (inJourney ? " in-journey" : "")} onClick={toggleAddToTrip}>
                {inJourney ? "✓ In Your Journey" : "+ Add to Journey"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 24 }} className="nf-body">
          {f.whyVisit && (
            <div className="nf-pull-quote">
              <p>&ldquo;{f.whyVisit}&rdquo;</p>
            </div>
          )}

          <div className="nf-quick-facts">
            <div className="nf-quick-fact">
              <div className="nf-quick-fact-icon">
                <IconParking />
              </div>
              <div className="nf-quick-fact-label">Parking</div>
              <div className="nf-quick-fact-value">{f.parking.split(",")[0].split(";")[0]}</div>
            </div>
            <div className="nf-quick-fact">
              <div className="nf-quick-fact-icon">
                <IconAccess />
              </div>
              <div className="nf-quick-fact-label">Access</div>
              <div className="nf-quick-fact-value">{f.accessibility.split(".")[0].split(";")[0]}</div>
            </div>
            {f.nearestFacilities && (
              <div className="nf-quick-fact">
                <div className="nf-quick-fact-icon">
                  <IconToilet />
                </div>
                <div className="nf-quick-fact-label">Toilets</div>
                <div className="nf-quick-fact-value">{f.nearestFacilities.split(",")[0].split(";")[0]}</div>
              </div>
            )}
            <div className="nf-quick-fact">
              <div className="nf-quick-fact-icon">
                <IconClock />
              </div>
              <div className="nf-quick-fact-label">Hours</div>
              <div className="nf-quick-fact-value">{f.openingHours}</div>
            </div>
            {f.bestTimeToVisit && (
              <div className="nf-quick-fact">
                <div className="nf-quick-fact-icon">
                  <IconSun />
                </div>
                <div className="nf-quick-fact-label">Best time</div>
                <div className="nf-quick-fact-value">{f.bestTimeToVisit.split(".")[0]}.</div>
              </div>
            )}
            {(f.length || f.duration || f.difficulty) && (
              <div className="nf-quick-fact">
                <div className="nf-quick-fact-icon">
                  <IconRoute />
                </div>
                <div className="nf-quick-fact-label">Route</div>
                <div className="nf-quick-fact-value">{[f.length, f.duration, f.difficulty].filter(Boolean).join(" · ")}</div>
              </div>
            )}
          </div>

          {f.description.split("\n\n").map((para, i) => (
            <p className="nf-expect" key={i}>
              {renderWithLinks(para)}
            </p>
          ))}

          {f.highlights.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="nf-section-title">Good to Know</div>
              <ul className="fun-facts-list">
                {f.highlights.map((h) => (
                  <li key={h}>{renderWithLinks(h)}</li>
                ))}
              </ul>
            </div>
          )}

          {f.history && (
            <div className="nf-history-grid">
              <div>
                <div className="nf-section-title">History</div>
                {f.history.split("\n\n").map((para, i) => (
                  <p key={i} style={{ marginBottom: 12 }}>
                    {renderWithLinks(para)}
                  </p>
                ))}
              </div>
              {f.gallery && f.gallery[1] && (
                <div className="nf-aside-photo">
                  <Image src={f.gallery[1]} alt={`${f.name} photo relating to its history`} fill unoptimized style={{ objectFit: "cover" }} />
                </div>
              )}
            </div>
          )}

          {f.wildlifeHighlights && (
            <div className="nf-wildlife-box">
              <div className="nf-wildlife-label">Wildlife &amp; Seasonal Highlights</div>
              <p>{renderWithLinks(f.wildlifeHighlights)}</p>
            </div>
          )}

          {f.gallery && f.gallery.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="nf-section-title">Gallery</div>
              <div className="nf-gallery-strip">
                {f.gallery.map((url, i) => {
                  // Index 1 is already shown alongside History above (when
                  // History exists) - skip it here so it doesn't appear
                  // twice on the same page.
                  if (f.history && i === 1) return null;
                  return (
                    <button type="button" key={i} onClick={() => setLightboxIndex(i)} aria-label={`View larger photo ${i + 1} of ${f.name}`}>
                      <Image src={url} alt={`${f.name} photo ${i + 1}`} fill unoptimized style={{ objectFit: "cover" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {f.safetyNotes && (
            <div className="dist-status-notice" style={{ margin: "8px 0 0", maxWidth: "none", padding: "16px 20px" }}>
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

          {hasFooterInfo && (
            <div className="nf-footer">
              <div className="nf-footer-label">Plan Your Visit</div>
              <div className="nf-footer-grid">
                {f.whatToBring && (
                  <div>
                    <div className="nf-footer-item-label">What to bring</div>
                    <div className="nf-footer-item-value">{f.whatToBring}</div>
                  </div>
                )}
                {f.mobileSignalNote && (
                  <div>
                    <div className="nf-footer-item-label">Mobile signal</div>
                    <div className="nf-footer-item-value">{f.mobileSignalNote}</div>
                  </div>
                )}
                {f.pairsWellWith && (
                  <div>
                    <div className="nf-footer-item-label">Pairs well with</div>
                    <div className="nf-footer-item-value">{renderWithLinks(f.pairsWellWith)}</div>
                  </div>
                )}
                {f.websiteUrl && (
                  <div>
                    <div className="nf-footer-item-label">Website</div>
                    <div className="nf-footer-item-value">
                      <a href={f.websiteUrl} target="_blank" rel="noopener noreferrer" className="dist-inline-link">
                        Visit official website ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {lightbox}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Everything else (Food & Drink, Golf & Spa, Transport, Attraction
  // Gem, Ferry Port, Airport): unchanged two-column layout for now,
  // each gets its own pass next.
  // ─────────────────────────────────────────────────────────────────
  const isWalkOrRide = f.category === "walk" || f.category === "bike-route";
  const isFoodDrink = f.category === "pub" || f.category === "cafe" || f.category === "restaurant";
  const hasTripTips = f.bestTimeToVisit || f.nearestFacilities || f.whatToBring || f.mobileSignalNote || f.pairsWellWith;

  return (
    <div className="distillery-page page">
      <DetailPageBar backHref={backHref} backLabel={backLabel} stopCount={totalStops} />

      <div className="distillery-hero">
        {f.heroImageUrl ? (
          <Image className="distillery-hero-img" src={f.heroImageUrl} alt={f.name} fill unoptimized style={{ objectFit: "cover" }} />
        ) : (
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
        <PhotoCredit credit={f.heroImageCredit} />
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
            <button className={"hero-action-btn hero-action-primary" + (inJourney ? " in-journey" : "")} onClick={toggleAddToTrip}>
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
              <div className="dist-section-title">About</div>
              {f.description.split("\n\n").map((para, i) => (
                <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                  {renderWithLinks(para)}
                </p>
              ))}
            </div>

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

      {lightbox}
    </div>
  );
}
