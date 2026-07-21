"use client";

import { useState } from "react";
import Link from "next/link";
import type { Distillery, LocalEvent } from "@/lib/types";
import { REGIONS } from "@/lib/journey-options";

// Same editorial curation DiscoverDistilleries used to show as its own
// full section - now a compact preview column here instead, since that
// standalone section was merged into "Get to know Islay".
const EDITORIAL: Record<string, { tag: string; description: string }> = {
  ardbeg: { tag: "Editor's Pick", description: "The peatiest dram on Islay — and the most celebrated." },
  kilchoman: { tag: "Hidden Gem", description: "Islay's only farm distillery. Intimate, authentic, unmissable." },
  ardnahoe: { tag: "Newest Opening", description: "Opened 2019 — already turning heads with its unpeated spirit." },
};

function formatEventDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function FeaturedContent({
  distilleries,
  localEvents,
}: {
  distilleries: Distillery[];
  localEvents: LocalEvent[];
}) {
  // Region tabs (July 2026, revised 21 July 2026 for MVP scope). Only
  // Islay has live distillery/event data today, and the MVP decision
  // (see business plan, "Scope Decision: Islay & Jura Only Until
  // Complete") is that no other region name is shown anywhere on the
  // live site while that's true - so the tab row itself is inactivated
  // (not deleted) below whenever there's only one live region to choose
  // from, same treatment as Q2's region-picker. REGIONS still lists all
  // 5 up front, so switching a second region on is just flipping its
  // `live` flag - the tab row reappears automatically once there's
  // something real to switch between.
  const liveRegions = REGIONS.filter((r) => r.live);
  const [activeRegionId, setActiveRegionId] = useState(liveRegions[0]?.id ?? REGIONS[0].id);
  const activeRegion = REGIONS.find((r) => r.id === activeRegionId) ?? REGIONS[0];

  const featuredDistilleries = Object.keys(EDITORIAL)
    .map((slug) => distilleries.find((d) => d.slug === slug))
    .filter((d): d is Distillery => !!d);

  const upcomingEvents = [...localEvents]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 3);

  return (
    <section className="featured-section">
      <h2 className="how-title">Get to know {activeRegion.label}</h2>

      {liveRegions.length > 1 && (
        <div className="featured-region-tabs">
          {liveRegions.map((r) => (
            <button
              key={r.id}
              className={"q-card featured-region-tab" + (r.id === activeRegionId ? " selected" : "")}
              onClick={() => setActiveRegionId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {activeRegion.live ? (
        <>
          <div className="featured-col-title">Distilleries</div>
          <div className="discover-grid featured-compact-grid">
            {featuredDistilleries.map((d) => {
              const editorial = EDITORIAL[d.slug];
              return (
                <Link href={`/distilleries/${d.slug}`} className="discover-card" key={d.slug}>
                  <div className="discover-card-image" style={{ backgroundImage: `url(${d.image})` }} />
                  <div className="discover-card-body">
                    <div className="discover-card-tag">{editorial.tag}</div>
                    <div className="discover-card-name">{d.name}</div>
                    <p className="discover-card-desc">{editorial.description}</p>
                    <div className="discover-card-footer">
                      <span className="discover-card-meta">
                        {d.region} &middot; Est. {d.founded}
                      </span>
                      <span className="discover-card-link">Explore &rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href="/distilleries" className="featured-view-all">
            View all distilleries &rarr;
          </Link>

          <div className="featured-col-title">Events &amp; Experiences</div>
          {upcomingEvents.length > 0 ? (
            <div className="featured-events-list">
              {upcomingEvents.map((e) => (
                <div className="featured-event-card" key={e.id}>
                  <div className="featured-event-date">
                    {formatEventDate(e.date)}
                    {e.endDate && e.endDate !== e.date ? ` – ${formatEventDate(e.endDate)}` : ""}
                  </div>
                  <div className="featured-event-body">
                    <div className="featured-event-name">{e.name}</div>
                    <div className="featured-event-meta">
                      {e.location}
                      {e.price ? ` · ${e.price}` : ""}
                    </div>
                  </div>
                  {e.link && (
                    <a href={e.link} target="_blank" rel="noreferrer" className="featured-event-link">
                      Details &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="featured-coming-soon">
              <p>Fèis Ìle dates, distillery masterclasses, and island festivals will appear here once confirmed.</p>
            </div>
          )}

          <Link href="/local-features" className="featured-view-all">
            Explore Local Features &rarr;
          </Link>
        </>
      ) : (
        <div className="featured-coming-soon">
          <p>{activeRegion.label} is on the roadmap — Islay &amp; Jura is fully built and ready to explore in the meantime.</p>
        </div>
      )}
    </section>
  );
}
