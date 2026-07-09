"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import type { Distillery } from "@/lib/types";

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - keeps Airtable content authorable as simple
 *  text while still supporting the cross-linking the brand voice guide
 *  calls for (Journal posts, other distilleries, Explore pages). */
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

interface DistilleryPageClientProps {
  distillery: Distillery;
  nextStops: Distillery[];
}

export default function DistilleryPageClient({ distillery: d, nextStops }: DistilleryPageClientProps) {
  const trip = useTrip();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const stopDays = trip.ready ? trip.findStopDays(d.slug) : [];
  const inJourney = stopDays.length > 0;
  const totalStops = trip.days.reduce((sum, day) => sum + day.stops.length, 0);
  const safeCurrentDayIndex = Math.min(trip.currentDayIndex, Math.max(0, trip.days.length - 1));
  // A real journey session exists if either signal says so: the intake
  // flow (Q1-Q4) was completed, OR real stops exist even without ever
  // going through that flow (starting straight from a distillery page's
  // "+ Add to Journey" button, which doesn't set intake). Previously
  // gated on totalStops > 0 alone, which sent visitors to the flat
  // distilleries list instead of back to their actual map/workspace the
  // moment their current day happened to be empty.
  const hasActiveJourney = trip.ready && (trip.intake !== null || totalStops > 0);

  // Tours apply to whichever day(s) this distillery is actually already on
  // (stopDays, computed above). If it isn't in the journey at all yet, it
  // lands on the shared current day - whatever day the visitor was last
  // viewing in the workspace (persisted state) - rather than always
  // defaulting to Day 1 regardless of where they actually were.
  function addTour(tourName: string) {
    trip.initDays(1);
    const tour = d.tours.find((t) => t.name === tourName);
    const targetDays = stopDays.length > 0 ? stopDays : [safeCurrentDayIndex];
    const currentStop = trip.days[targetDays[0]]?.stops.find(
      (s) => s.kind === "distillery" && s.distillery.slug === d.slug
    );
    const alreadySelected = currentStop?.kind === "distillery" && currentStop.tour?.name === tourName;
    for (const dayIndex of targetDays) {
      trip.setTourForStop(dayIndex, d, alreadySelected ? undefined : tour);
    }
  }

  function toggleAddDistillery() {
    trip.initDays(1);
    if (inJourney) {
      for (const dayIndex of stopDays) {
        trip.removeStop(dayIndex, d.slug);
      }
    } else {
      trip.addStop(safeCurrentDayIndex, d);
    }
  }

  const currentStopForTour = stopDays.length > 0
    ? trip.days[stopDays[0]]?.stops.find((s) => s.kind === "distillery" && s.distillery.slug === d.slug)
    : undefined;
  const selectedTourName = currentStopForTour?.kind === "distillery" ? currentStopForTour.tour?.name : undefined;

  return (
    <div className="distillery-page page">
      <Link href={hasActiveJourney ? "/journey?resume=1" : "/distilleries"} className="dist-back-bar">
        <span>&larr; {hasActiveJourney ? "Back to your journey" : "Back to distilleries"}</span>
        {hasActiveJourney && totalStops > 0 && <span className="dist-back-stops">{totalStops} stop{totalStops > 1 ? "s" : ""}</span>}
      </Link>

      <div className="distillery-hero">
        <Image className="distillery-hero-img" src={d.image} alt={d.name} fill unoptimized />
        <div className="distillery-hero-overlay" />
        <div className="distillery-hero-content">
          <div>
            <h1 className="distillery-hero-title">{d.name}</h1>
            <div className="distillery-hero-sub">
              <span className="hero-badge">{d.region}</span>
              <span className="hero-badge">{d.style}</span>
              <span className="hero-badge">Est. {d.founded}</span>
            </div>
          </div>
          <div className="distillery-hero-actions">
            <a href="#tours" className="hero-action-btn hero-action-primary">
              Book a Tour
            </a>
            <button
              className={"hero-action-btn hero-action-secondary" + (inJourney ? " in-journey" : "")}
              onClick={toggleAddDistillery}
            >
              {inJourney ? "✓ In Your Journey" : "+ Add to Journey"}
            </button>
          </div>
        </div>
      </div>

      {d.whyVisit && (
        <div className="dist-why-visit">
          <span className="dist-why-visit-label">Why you should definitely visit</span>
          <p>{d.whyVisit}</p>
        </div>
      )}

      {d.statusNotice && (
        <div className="dist-status-notice">
          <span className="dist-status-icon">!</span>
          <p>{d.statusNotice}</p>
        </div>
      )}

      <div className="distillery-body">
        <div className="dist-detail-grid">
          <div>
            <div className="dist-section">
              <div className="dist-section-title">About {d.name}</div>
              <p className="dist-p" style={{ fontStyle: "italic", marginBottom: 12 }}>
                {d.tagline}
              </p>
              {d.description.split("\n\n").map((para, i) => (
                <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                  {renderWithLinks(para)}
                </p>
              ))}
            </div>

            {d.funFacts && (
              <div className="dist-section">
                <div className="dist-section-title">Fun facts</div>
                <ul className="fun-facts-list">
                  {d.funFacts
                    .split("\n")
                    .map((line) => line.replace(/^-\s*/, "").trim())
                    .filter(Boolean)
                    .map((fact, i) => (
                      <li key={i}>{renderWithLinks(fact)}</li>
                    ))}
                </ul>
              </div>
            )}

            {d.gallery && d.gallery.length > 0 && (
              <div className="dist-section">
                <div className="dist-section-title">Gallery</div>
                <div className="dist-gallery-grid">
                  {d.gallery.map((url, i) => (
                    <button
                      type="button"
                      className="dist-gallery-img"
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      aria-label={`View larger photo ${i + 1} of ${d.name}`}
                    >
                      <Image src={url} alt={`${d.name} photo ${i + 1}`} fill unoptimized style={{ objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="dist-section" id="tours">
              <div className="dist-section-title">Tours</div>
              {d.tours.map((t) => {
                const isSelected = selectedTourName === t.name;
                return (
                  <div className="tour-card" key={t.name}>
                    <div className="tour-name">{t.name}</div>
                    <div className="tour-detail">
                      {t.duration} &middot; {t.description}
                    </div>
                    <div className="tour-price">£{t.price} per person</div>
                    <div className="tour-actions">
                      <button className="tour-book">Book &#8599;</button>
                      <button
                        className={"tour-add-btn" + (isSelected ? " added" : "")}
                        onClick={() => addTour(t.name)}
                      >
                        {isSelected ? "✓ Added" : "+ Add to Journey"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {d.nearby.length > 0 && (
              <div className="dist-section">
                <div className="dist-section-title">Nearby</div>
                <div className="nearby-grid">
                  {d.nearby.map((n) => (
                    <div className="nearby-card" key={n.name}>
                      <div className="nearby-icon">{n.icon}</div>
                      <div className="nearby-name">{n.name}</div>
                      <div className="nearby-type">{n.type}</div>
                      <div className="nearby-dist">{n.distance}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(d.history || d.whiskyProfile) && (
              <div className="dist-below-line">
                {d.whiskyProfile && (
                  <div className="dist-section">
                    <div className="dist-section-title">Whisky profile</div>
                    <p className="dist-p">{renderWithLinks(d.whiskyProfile)}</p>
                  </div>
                )}
                {d.history && (
                  <div className="dist-section">
                    <div className="dist-section-title">History</div>
                    {d.history.split("\n\n").map((para, i) => (
                      <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                        {renderWithLinks(para)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="dist-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-title">Visit info</div>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Hours</div>
                  <div className="info-value">{d.hours}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Price from</div>
                  <div className="info-value">{d.priceFrom}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Avg. visit</div>
                  <div className="info-value">{d.avgVisit}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Parking</div>
                  <div className="info-value">{d.parking}</div>
                </div>
              </div>
              {d.websiteUrl && (
                <a
                  href={d.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dist-website-link"
                >
                  Visit {d.name}&apos;s official website ↗
                </a>
              )}
            </div>

            {d.facilities.length > 0 && (
              <div className="sidebar-card">
                <div className="sidebar-card-title">Facilities</div>
                <div className="facilities-grid">
                  {d.facilities.map((f) => (
                    <span className="facility-badge" key={f}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {nextStops.length > 0 && (
              <div className="sidebar-card">
                <div className="sidebar-card-title">Suggested next stops</div>
                {nextStops.map((next) => (
                  <Link href={`/distilleries/${next.slug}`} className="next-stop-card" key={next.slug}>
                    <div>
                      <div className="next-stop-name">{next.name}</div>
                      <div className="next-stop-dist">{next.region}</div>
                    </div>
                    <span className="next-stop-add">&rarr;</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && d.gallery && (
        <div
          className="dist-lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${d.name} photo gallery`}
        >
          <button
            type="button"
            className="dist-lightbox-close"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close photo"
          >
            &times;
          </button>
          {d.gallery.length > 1 && (
            <button
              type="button"
              className="dist-lightbox-nav dist-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i - 1 + d.gallery!.length) % d.gallery!.length));
              }}
              aria-label="Previous photo"
            >
              &larr;
            </button>
          )}
          <div className="dist-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            <Image
              src={d.gallery[lightboxIndex]}
              alt={`${d.name} photo ${lightboxIndex + 1}`}
              fill
              unoptimized
              style={{ objectFit: "contain" }}
            />
          </div>
          {d.gallery.length > 1 && (
            <button
              type="button"
              className="dist-lightbox-nav dist-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i + 1) % d.gallery!.length));
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
