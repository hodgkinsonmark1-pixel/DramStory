"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedStay } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same helper as DistilleryPageClient/
 *  ExploreFeatureClient (each detail page keeps its own copy rather than
 *  sharing one, matching the existing pattern in this codebase). */
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

/** Small top-right corner tag for photo attribution - same component as
 *  ExploreFeatureClient's PhotoCredit (duplicated per the existing
 *  per-page-client pattern, not shared). Credit text is either plain
 *  ("Photo: Jane Doe") or a "[label](url)" markdown-style link to the
 *  source/license page. */
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

// Same category -> display label mapping as ExploreFeatureClient's
// CATEGORY_LABELS (duplicated rather than shared, matching this codebase's
// existing per-page-client convention) - only used here for the "Works
// Great With" Local Feature cards' small type line.
const LOCAL_FEATURE_CATEGORY_LABELS: Record<FeaturedStay["worksGreatWithLocalFeatures"][number]["category"], string> = {
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

interface FeaturedStayClientProps {
  stay: FeaturedStay;
}

export default function FeaturedStayClient({ stay: s }: FeaturedStayClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const hasVisitInfo =
    s.setting || s.priceFrom || s.parking || s.distanceFromFerryAirport || s.mobileSignalNote || s.nearestArea;
  const websiteDiffersFromBooking = s.websiteUrl && s.websiteUrl !== s.bookingUrl;
  const worksGreatWith = s.worksGreatWithDistilleries.length > 0 || s.worksGreatWithLocalFeatures.length > 0;

  return (
    <>
      <PageHeader />

      <div className="page">
        <div className="distillery-hero">
          {s.heroImageUrl ? (
            <Image className="distillery-hero-img" src={s.heroImageUrl} alt={s.name} fill unoptimized style={{ objectFit: "cover" }} />
          ) : (
            // Graceful empty state - Mark adds placeholder photography
            // directly in Airtable, so a record can genuinely have no Hero
            // Image yet without this page breaking.
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, var(--navy), var(--peat))",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 72 }}>🏨</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Photo coming soon</span>
            </div>
          )}
          <PhotoCredit credit={s.heroImageCredit} />
          <div className="distillery-hero-overlay" />
          <div className="distillery-hero-content">
            <div>
              <h1 className="distillery-hero-title">{s.name}</h1>
              <div className="distillery-hero-sub">
                {s.style && <span className="hero-badge">{s.style}</span>}
                {s.nearestArea && <span className="hero-badge">{s.nearestArea}</span>}
                {s.priceFrom && <span className="hero-badge">From {s.priceFrom}</span>}
              </div>
            </div>
            <div className="distillery-hero-actions">
              {s.bookingUrl && (
                <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="hero-action-btn hero-action-primary">
                  Book Now &rarr;
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                target="_blank"
                rel="noreferrer"
                className="hero-action-btn hero-action-secondary"
              >
                Get Directions
              </a>
            </div>
          </div>
        </div>

        {s.whyStay && (
          <div className="dist-why-visit">
            <span className="dist-why-visit-label">Why stay here</span>
            <p>{s.whyStay}</p>
          </div>
        )}

        <div className="distillery-body">
          <div className="dist-detail-grid">
            <div>
              <div className="dist-section">
                <div className="dist-section-title">About {s.name}</div>
                {s.description.split("\n\n").map((para, i) => (
                  <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                    {renderWithLinks(para)}
                  </p>
                ))}
              </div>

              {s.whiskyBarNote && (
                <div className="dist-section">
                  <div className="dist-section-title">Whisky bar &amp; collection</div>
                  <p className="dist-p">{renderWithLinks(s.whiskyBarNote)}</p>
                </div>
              )}

              {s.gallery && s.gallery.length > 0 && (
                <div className="dist-section">
                  <div className="dist-section-title">Gallery</div>
                  <div className="dist-gallery-grid">
                    {s.gallery.map((url, i) => (
                      <button
                        type="button"
                        className="dist-gallery-img"
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        aria-label={`View larger photo ${i + 1} of ${s.name}`}
                      >
                        <Image src={url} alt={`${s.name} photo ${i + 1}`} fill unoptimized style={{ objectFit: "cover" }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {worksGreatWith && (
                <div className="dist-section">
                  <div className="dist-section-title">Works Great With</div>
                  <div className="nearby-grid">
                    {s.worksGreatWithDistilleries.map((d) => (
                      <Link href={`/distilleries/${d.slug}`} className="nearby-card" key={d.slug}>
                        <div className="nearby-icon">🥃</div>
                        <div className="nearby-name">{d.name}</div>
                        <div className="nearby-type">Distillery</div>
                        {d.region && <div className="nearby-dist">{d.region}</div>}
                      </Link>
                    ))}
                    {s.worksGreatWithLocalFeatures.map((f) => (
                      <Link href={`/explore/${f.slug}`} className="nearby-card" key={f.slug}>
                        <div className="nearby-icon">{f.icon}</div>
                        <div className="nearby-name">{f.name}</div>
                        <div className="nearby-type">{LOCAL_FEATURE_CATEGORY_LABELS[f.category]}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {s.history && (
                <div className="dist-below-line">
                  <div className="dist-section">
                    <div className="dist-section-title">History</div>
                    {s.history.split("\n\n").map((para, i) => (
                      <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                        {renderWithLinks(para)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="dist-sidebar">
              {hasVisitInfo && (
                <div className="sidebar-card">
                  <div className="sidebar-card-title">Visit info</div>
                  <div className="info-grid">
                    {s.setting && (
                      <div className="info-item">
                        <div className="info-label">Setting</div>
                        <div className="info-value">{s.setting}</div>
                      </div>
                    )}
                    {s.priceFrom && (
                      <div className="info-item">
                        <div className="info-label">Price from</div>
                        <div className="info-value">{s.priceFrom} per night</div>
                      </div>
                    )}
                    {s.parking && (
                      <div className="info-item">
                        <div className="info-label">Parking</div>
                        <div className="info-value">{s.parking}</div>
                      </div>
                    )}
                    {s.distanceFromFerryAirport && (
                      <div className="info-item">
                        <div className="info-label">Distance from ferry/airport</div>
                        <div className="info-value">{renderWithLinks(s.distanceFromFerryAirport)}</div>
                      </div>
                    )}
                    {s.mobileSignalNote && (
                      <div className="info-item">
                        <div className="info-label">Mobile signal</div>
                        <div className="info-value">{s.mobileSignalNote}</div>
                      </div>
                    )}
                    {s.nearestArea && (
                      <div className="info-item">
                        <div className="info-label">Nearest area</div>
                        <div className="info-value">{s.nearestArea}</div>
                      </div>
                    )}
                  </div>
                  {websiteDiffersFromBooking && (
                    <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="dist-website-link">
                      Visit {s.name}&apos;s official website ↗
                    </a>
                  )}
                  {s.tripAdvisorUrl && (
                    <a href={s.tripAdvisorUrl} target="_blank" rel="noopener noreferrer" className="dist-website-link">
                      See reviews on TripAdvisor &rarr;
                    </a>
                  )}
                </div>
              )}

              {s.facilities.length > 0 && (
                <div className="sidebar-card">
                  <div className="sidebar-card-title">Facilities</div>
                  <div className="facilities-grid">
                    {s.facilities.map((f) => (
                      <span className="facility-badge" key={f}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {lightboxIndex !== null && s.gallery && (
        <div
          className="dist-lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${s.name} photo gallery`}
        >
          <button type="button" className="dist-lightbox-close" onClick={() => setLightboxIndex(null)} aria-label="Close photo">
            &times;
          </button>
          {s.gallery.length > 1 && (
            <button
              type="button"
              className="dist-lightbox-nav dist-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i - 1 + s.gallery!.length) % s.gallery!.length));
              }}
              aria-label="Previous photo"
            >
              &larr;
            </button>
          )}
          <div className="dist-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            <Image src={s.gallery[lightboxIndex]} alt={`${s.name} photo ${lightboxIndex + 1}`} fill unoptimized style={{ objectFit: "contain" }} />
            <PhotoCredit credit={s.galleryCredits?.[lightboxIndex]} />
          </div>
          {s.gallery.length > 1 && (
            <button
              type="button"
              className="dist-lightbox-nav dist-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i + 1) % s.gallery!.length));
              }}
              aria-label="Next photo"
            >
              &rarr;
            </button>
          )}
        </div>
      )}
    </>
  );
}
