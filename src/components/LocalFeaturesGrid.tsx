"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { LocalFeature } from "@/lib/types";

interface LocalFeaturesGridProps {
  features: LocalFeature[];
}

// The Hub's own scope, per how it was specced: the static, non-retail
// content types - natural features plus historic sites and transport.
// Deliberately excludes attraction-gem/golf/spa (Local Attractions'
// retail-adjacent bucket) and pub/cafe/restaurant (Places to Eat) - those
// stay pin-only on the map, no hub listing, per the site's USP.
const HUB_CATEGORIES: { label: string; value: LocalFeature["category"] }[] = [
  { label: "Beaches", value: "beach" },
  { label: "Walks", value: "walk" },
  { label: "Bike Rides", value: "bike-route" },
  { label: "Local Gems", value: "local-gem" },
  { label: "Historic Sites", value: "historic-site" },
  { label: "Transport", value: "transport" },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  HUB_CATEGORIES.map((c) => [c.value, c.label.replace(/s$/, "")])
);

export default function LocalFeaturesGrid({ features }: LocalFeaturesGridProps) {
  const [activeCategory, setActiveCategory] = useState<LocalFeature["category"] | null>(null);
  const [query, setQuery] = useState("");

  const inScope = useMemo(
    () => features.filter((f) => HUB_CATEGORIES.some((c) => c.value === f.category)),
    [features]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inScope.filter((f) => {
      const categoryMatch = !activeCategory || f.category === activeCategory;
      const queryMatch =
        !q || f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [inScope, activeCategory, query]);

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
          <button className={"filter-btn" + (activeCategory === null ? " active" : "")} onClick={() => setActiveCategory(null)}>
            All
          </button>
          {HUB_CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={"filter-btn" + (activeCategory === c.value ? " active" : "")}
              onClick={() => setActiveCategory(activeCategory === c.value ? null : c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dist-result-count">
        {sorted.length} feature{sorted.length === 1 ? "" : "s"}
        {(activeCategory || query) && " matching your search"}
      </div>

      {sorted.length === 0 ? (
        <div className="dist-empty-state">
          Nothing matches that search.{" "}
          <button
            className="dist-clear-link"
            onClick={() => {
              setActiveCategory(null);
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
                <p className="dist-card-tagline">{f.whyVisit ?? f.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
