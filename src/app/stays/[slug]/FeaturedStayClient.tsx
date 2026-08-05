"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedStay } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import StickyStayBar from "./StickyStayBar";
import PlanYourDaysSection from "./PlanYourDaysSection";
import DistilleriesFromYourDoor from "./DistilleriesFromYourDoor";
import { useAddStayToTrip } from "./useAddStayToTrip";

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

interface FeaturedStayClientProps {
  stay: FeaturedStay;
}

export default function FeaturedStayClient({ stay: s }: FeaturedStayClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const handleAddToTrip = useAddStayToTrip(s);

  // Visit Info tiles - Price From and Parking/Mobile Signal deliberately
  // NOT included here (05 Aug 2026 rebuild): Price From is already shown
  // in the hero and sticky bar, and Parking/Mobile Signal read as
  // operational asides rather than "tile" shaped facts - both now render
  // in the note banner just below the tiles instead. See this file's
  // hasVisitInfo/hasVisitNote split below.
  const hasVisitTiles = s.setting || s.distanceFromAirport || s.distanceFromPortAskaigFerry || s.distanceFromPortEllenFerry;
  const hasVisitNote = s.parking || s.mobileSignalNote;
  const hasVisitInfo = hasVisitTiles || hasVisitNote;
  const hasHistoryHighlight = !!(s.historyHighlightYear && s.historyHighlightQuote);

  return (
    <>
      {/* Header wrapped in a page-local sticky container (05 Aug 2026,
          Mark's review: "I'd like the header bar to remain visible") -
          PageHeader itself is a shared component used across content
          pages, so the stickiness lives here in a .stay- wrapper rather
          than inside PageHeader, keeping this hotels-template-only. */}
      <div className="stay-header-sticky">
        <PageHeader />
      </div>

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
          </div>
        </div>

        {/* Booking bar - in-flow directly under the hero, sticks below the
            header on scroll. The hero's own Book Now / Get Directions
            buttons were removed in the same 05 Aug 2026 review ("lose the
            get directions... lose the book now button") - this bar is now
            the page's single booking CTA, alongside the closing banner. */}
        <StickyStayBar stay={s} />

        {/* "Plan your days from here" (05 Aug 2026) - sits right under the
            hero, before Why Stay/Facilities, matching the reference layout
            Mark reviewed. Renders nothing if this hotel has no "Plan Your
            Days" picked yet in Airtable. */}
        <PlanYourDaysSection days={s.planYourDays} />

        {/* Why Stay + Facilities as a two-column row - Facilities moved up
            from the About section's sidebar to sit alongside Why Stay here,
            requested by Mark 04 Aug 2026. This row lives outside
            .distillery-body (same as the original standalone Why Stay
            callout did) so it replicates that element's own page-level
            centering/padding directly rather than double up with
            .distillery-body's. */}
        {(s.whyStay || s.facilities.length > 0) && (
          <div
            className="dist-detail-grid"
            style={{ maxWidth: 1200, margin: "32px auto 0", padding: "0 48px" }}
          >
            <div>
              {s.whyStay && (
                <div className="dist-why-visit" style={{ maxWidth: "none", margin: 0 }}>
                  <span className="dist-why-visit-label">Why stay here</span>
                  <p>{s.whyStay}</p>
                </div>
              )}
            </div>
            <div className="dist-sidebar">
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
        )}

        <div className="distillery-body">
          {/* Visit Info - restyled 05 Aug 2026 from a single stacked
              info-grid into four separate tiles (Setting/Airport/Port
              Askaig/Port Ellen), plus a note banner for Parking/Mobile
              Signal (operational asides, not tile-shaped facts) - see
              hasVisitTiles/hasVisitNote above. Still a full-width bar
              above the About section rather than a narrow sidebar (same
              "practical travel facts first" reasoning as before), and
              still carries the website/TripAdvisor links row exactly as
              already fixed earlier today - not moved, so as not to
              re-break that fix. */}
          {hasVisitInfo && (
            <div style={{ marginBottom: 32 }}>
              <div className="sidebar-card-title" style={{ marginBottom: 12 }}>
                Visit info
              </div>
              {hasVisitTiles && (
                <div className="stay-visit-tiles">
                  {s.setting && (
                    <div className="stay-visit-tile">
                      <div className="stay-visit-tile-label">Setting</div>
                      <div className="stay-visit-tile-value">{s.setting}</div>
                    </div>
                  )}
                  {s.distanceFromAirport && (
                    <div className="stay-visit-tile">
                      <div className="stay-visit-tile-label">From the airport</div>
                      <div className="stay-visit-tile-value">{renderWithLinks(s.distanceFromAirport)}</div>
                    </div>
                  )}
                  {s.distanceFromPortAskaigFerry && (
                    <div className="stay-visit-tile">
                      <div className="stay-visit-tile-label">From Port Askaig</div>
                      <div className="stay-visit-tile-value">{renderWithLinks(s.distanceFromPortAskaigFerry)}</div>
                    </div>
                  )}
                  {s.distanceFromPortEllenFerry && (
                    <div className="stay-visit-tile">
                      <div className="stay-visit-tile-label">From Port Ellen</div>
                      <div className="stay-visit-tile-value">{renderWithLinks(s.distanceFromPortEllenFerry)}</div>
                    </div>
                  )}
                </div>
              )}
              {hasVisitNote && (
                <div className="stay-visit-note">
                  <span className="stay-visit-note-icon">!</span>
                  <span>
                    {[s.parking, s.mobileSignalNote].filter(Boolean).join(" ")}
                  </span>
                </div>
              )}
              {/* The official-website/TripAdvisor links row moved from
                  here into StickyStayBar's second row (05 Aug 2026,
                  Mark's review). */}
            </div>
          )}

          {/* About (left) + "A Night in [Year]" history highlight (right) -
              two-column row, same dist-detail-grid pattern as Works Great
              With/Nearest Area below. History Highlight is a short,
              separately-sourced pull-quote (FeaturedStay.historyHighlight*
              - added 05 Aug 2026), distinct from the full `history` prose
              further down the page - only renders once both a year and a
              quote are set (see hasHistoryHighlight above), so a hotel
              without one yet just gets the single-column About layout. */}
          <div className={hasHistoryHighlight ? "dist-detail-grid" : undefined}>
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
            </div>

            {hasHistoryHighlight && (
              <div className="dist-sidebar">
                <div className="stay-history-highlight">
                  <span className="stay-history-highlight-eyebrow">A Night in {s.historyHighlightYear}</span>
                  <p className="stay-history-highlight-quote">{s.historyHighlightQuote}</p>
                  {s.historyHighlightSource && (
                    <p className="stay-history-highlight-source">For {s.historyHighlightSource}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Gallery ("Inside the inn") - each photo now carries its own
              short caption overlay (FeaturedStay.galleryCaptions, added 05
              Aug 2026), index-aligned with `gallery` the same way
              galleryCredits already was. A photo with no caption for its
              index just shows no overlay - captions are being added
              alongside the rest of this hotel's photography, same
              "pending content" pattern as an empty Gallery. */}
          {s.gallery && s.gallery.length > 0 && (
            <div className="dist-section">
              <div className="dist-section-title">Inside the inn</div>
              <div className="dist-gallery-grid">
                {s.gallery.map((url, i) => (
                  <button
                    type="button"
                    className="dist-gallery-img"
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`View larger photo ${i + 1} of ${s.name}`}
                    style={{ position: "relative" }}
                  >
                    <Image src={url} alt={`${s.name} photo ${i + 1}`} fill unoptimized style={{ objectFit: "cover" }} />
                    {s.galleryCaptions?.[i] && <span className="stay-gallery-caption">{s.galleryCaptions[i]}</span>}
                  </button>
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

          {/* Works Great With + Nearest Area section removed 05 Aug 2026
              (Mark's review): "Distilleries from your door" below now
              covers the nearby-distillery job with real drive times, and
              Nearest Area is covered by the Setting tile in the Visit
              Info row. The worksGreatWith* fields stay in the data model
              (still used by other surfaces and possibly a future Areas
              page) - this template just no longer renders them. */}
        </div>

        {/* "Distilleries from your door" (05 Aug 2026) - the nearest four
            by real drive time, sourced from the Stay Distillery Distances
            table. Full-width, outside .distillery-body's narrower
            max-width, same treatment as Plan Your Days above. */}
        <DistilleriesFromYourDoor nearest={s.nearestDistilleries} />

        {/* Closing CTA banner (05 Aug 2026) */}
        <div className="stay-cta-banner">
          <div>
            <p className="stay-cta-banner-title">Make {s.name} your base.</p>
            {(s.facilities.length > 0 || s.nearestDistilleries.length > 0 || s.priceFrom) && (
              <p className="stay-cta-banner-sub">
                {s.facilities.length > 0 && `${s.facilities.length} facilit${s.facilities.length === 1 ? "y" : "ies"}`}
                {s.facilities.length > 0 && s.nearestDistilleries.length > 0 && ", "}
                {s.nearestDistilleries.length > 0 &&
                  `nearest distillery ${s.nearestDistilleries[0].driveTimeMinutes} min away`}
                {(s.facilities.length > 0 || s.nearestDistilleries.length > 0) && s.priceFrom && ". "}
                {s.priceFrom && `From ${s.priceFrom} a night.`}
              </p>
            )}
          </div>
          <div className="stay-cta-banner-actions">
            <button type="button" onClick={handleAddToTrip} className="stay-cta-banner-secondary">
              + Add to my trip
            </button>
            {s.bookingUrl && (
              <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="stay-cta-banner-primary">
                Check availability &rarr;
              </a>
            )}
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
