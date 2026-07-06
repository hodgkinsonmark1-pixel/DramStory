"use client";

import Image from "next/image";
import Link from "next/link";
import { useTrip } from "@/lib/trip-context";
import type { Distillery } from "@/lib/types";

interface DistilleryPageClientProps {
  distillery: Distillery;
  nextStops: Distillery[];
}

export default function DistilleryPageClient({ distillery: d, nextStops }: DistilleryPageClientProps) {
  const trip = useTrip();

  const stopDays = trip.ready ? trip.findStopDays(d.slug) : [];
  const inJourney = stopDays.length > 0;
  const totalStops = trip.days.reduce((sum, day) => sum + day.stops.length, 0);

  // Tours are added to Day 1 by default when visiting a distillery's own
  // page directly (outside an active /journey session there's no "current
  // day" to target) - initDays no-ops if a trip already exists.
  function addTour(tourName: string) {
    trip.initDays(1);
    const tour = d.tours.find((t) => t.name === tourName);
    const alreadySelected = trip.days[0]?.stops.find((s) => s.distillery.slug === d.slug)?.tour?.name === tourName;
    trip.setTourForStop(0, d, alreadySelected ? undefined : tour);
  }

  function toggleAddDistillery() {
    trip.initDays(1);
    if (inJourney) {
      trip.removeStop(0, d.slug);
    } else {
      trip.addStop(0, d);
    }
  }

  const selectedTourName = trip.days[0]?.stops.find((s) => s.distillery.slug === d.slug)?.tour?.name;

  return (
    <div className="distillery-page page">
      <Link href={totalStops > 0 ? "/journey?resume=1" : "/distilleries"} className="dist-back-bar">
        <span>&larr; {totalStops > 0 ? "Back to your journey" : "Back to distilleries"}</span>
        {totalStops > 0 && <span className="dist-back-stops">{totalStops} stop{totalStops > 1 ? "s" : ""}</span>}
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

      <div className="distillery-body">
        <div className="dist-grid">
          <div>
            <div className="dist-section">
              <div className="dist-section-title">About {d.name}</div>
              <p className="dist-p" style={{ fontStyle: "italic", marginBottom: 12 }}>
                {d.tagline}
              </p>
              <p className="dist-p">{d.description}</p>
            </div>

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
    </div>
  );
}
