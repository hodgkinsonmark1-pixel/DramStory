"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { LocalFeature } from "@/lib/types";
import { truncateSummary } from "@/lib/text";

interface LocalFeaturesGridProps {
  features: LocalFeature[];
}

// The Hub's own scope, per how it was specced: the static, non-retail
// content types - natural features, historic sites, leisure and transport.
// Deliberately excludes pub/cafe/restaurant (Places to Eat) - those stay
// pin-only on the map, no hub listing, per the site's USP.
// Each tab maps to one or more underlying Local Feature categories, same
// multi-category-per-tab pattern already used for "Golf & Spa" in the trip
// planner (src/lib/journey-options.ts) - added 3 August 2026 to combine
// Walks/Bike Rides (2 bike routes felt thin as their own tab) and to add a
// Leisure tab (Golf/Spa/Attraction Gem were previously excluded entirely -
// only Mactaggart Leisure Centre, Machrie Golf Links and Bothan Jura Wild
// Sauna live there today, one record each).
const HUB_TABS: { label: string; values: LocalFeature["category"][] }[] = [
  { label: "Beaches", values: ["beach"] },
  { label: "Hike & Bike", values: ["walk", "bike-route"] },
  { label: "Local Gems", values: ["local-gem"] },
  { label: "Historic Sites", values: ["historic-site"] },
  { label: "Leisure", values: ["golf", "spa", "attraction-gem"] },
  { label: "Transport", values: ["transport"] },
];

const CATEGORY_LABEL: Record<string, string> = {
  beach: "Beach",
  walk: "Walk",
  "bike-route": "Bike Ride",
  "local-gem": "Local Gem",
  "historic-site": "Historic Site",
  transport: "Transport",
  golf: "Golf",
  spa: "Spa",
  "attraction-gem": "Leisure",
};

export default function LocalFeaturesGrid({ features }: LocalFeaturesGridProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeValues = useMemo(
    () => (activeTab ? HUB_TABS.find((t) => t.label === activeTab)?.values ?? null : null),
    [activeTab]
  );

  const inScope = useMemo(
    () => features.filter((f) => HUB_TABS.some((t) => t.values.includes(f.category))),
    [features]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inScope.filter((f) => {
      const categoryMatch = !activeValues || activeValues.includes(f.category);
      const queryMatch =
        !q || f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [inScope, activeValues, query]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)), [filtered]);

  return (
    <div>
      <div className="dist-filter-bar">
        <div className="dist-filter-group" style={{ flex: 1, minWidth: 220 }}>
          <input
            type="text"
            className="dist-sort-select"
            style={{ width: "100%" }}
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="dist-filter-group">
          <span className="dist-filter-label">Type</span>
          <button className={"filter-btn" + (activeTab === null ? " active" : "")} onClick={() => setActiveTab(null)}>
            All
          </button>
          {HUB_TABS.map((t) => (
            <button
              key={t.label}
              className={"filter-btn" + (activeTab === t.label ? " active" : "")}
              onClick={() => setActiveTab(activeTab === t.label ? null : t.label)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dist-result-count">
        {sorted.length} feature{sorted.length === 1 ? "" : "s"}
        {(activeTab || query) && " matching your search"}
      </div>

      {sorted.length === 0 ? (
        <div className="dist-empty-state">
          Nothing matches that search.{" "}
          <button
            className="dist-clear-link"
            onClick={() => {
              setActiveTab(null);
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="dist-grid">
          {sorted.map((f) => (
            <Link key={f.id} href={`/explore/${f.slug}`} className="dist-card">
              <div className="dist-card-image">
                {f.heroImageUrl ? (
                  <Image src={f.heroImageUrl} alt={f.name} fill style={{ objectFit: "cover" }} unoptimized />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--off-white)" }} />
                )}
              </div>
              <div className="dist-card-body">
                <div className="dist-card-meta">
                  {f.icon} {CATEGORY_LABEL[f.category] ?? f.category}
                </div>
                <h2 className="dist-card-name">{f.name}</h2>
                <p className="dist-card-tagline">
                  {f.pinSummary ?? truncateSummary(f.whyVisit ?? f.description)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
