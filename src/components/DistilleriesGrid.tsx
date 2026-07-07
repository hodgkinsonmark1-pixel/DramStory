"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Distillery } from "@/lib/types";

interface DistilleriesGridProps {
  distilleries: Distillery[];
}

type SortOption = "name" | "price-asc" | "price-desc";

const PEAT_LEVELS = ["Unpeated", "Lightly Peated", "Medium Peated", "Heavily Peated"] as const;

// priceFrom is stored as "£10" - parse out the number for sorting. Falls
// back to a large number so anything unparseable sorts last rather than
// crashing the sort.
function parsePrice(priceFrom: string): number {
  const match = priceFrom.match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

export default function DistilleriesGrid({ distilleries }: DistilleriesGridProps) {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [activePeat, setActivePeat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("name");

  // Derived from real data rather than hardcoded, so a new region added to
  // Airtable shows up here automatically.
  const regions = useMemo(
    () => Array.from(new Set(distilleries.map((d) => d.region))).sort(),
    [distilleries]
  );

  const filtered = useMemo(() => {
    return distilleries.filter((d) => {
      const regionMatch = !activeRegion || d.region === activeRegion;
      // style can be a compound value like "Unpeated / Heavily Peated" -
      // substring match handles that correctly rather than requiring an
      // exact match against one bucket.
      const peatMatch = !activePeat || d.style.includes(activePeat);
      return regionMatch && peatMatch;
    });
  }, [distilleries, activeRegion, activePeat]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price-asc") copy.sort((a, b) => parsePrice(a.priceFrom) - parsePrice(b.priceFrom));
    if (sort === "price-desc") copy.sort((a, b) => parsePrice(b.priceFrom) - parsePrice(a.priceFrom));
    return copy;
  }, [filtered, sort]);

  return (
    <div>
      <div className="dist-filter-bar">
        <div className="dist-filter-group">
          <span className="dist-filter-label">Region</span>
          <button className={"filter-btn" + (activeRegion === null ? " active" : "")} onClick={() => setActiveRegion(null)}>
            All
          </button>
          {regions.map((r) => (
            <button
              key={r}
              className={"filter-btn" + (activeRegion === r ? " active" : "")}
              onClick={() => setActiveRegion(activeRegion === r ? null : r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="dist-filter-group">
          <span className="dist-filter-label">Peat level</span>
          <button className={"filter-btn" + (activePeat === null ? " active" : "")} onClick={() => setActivePeat(null)}>
            All
          </button>
          {PEAT_LEVELS.map((p) => (
            <button
              key={p}
              className={"filter-btn" + (activePeat === p ? " active" : "")}
              onClick={() => setActivePeat(activePeat === p ? null : p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="dist-filter-group dist-sort-group">
          <span className="dist-filter-label">Sort by</span>
          <select className="dist-sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
            <option value="name">Name (A-Z)</option>
            <option value="price-asc">Tour price: Low to High</option>
            <option value="price-desc">Tour price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="dist-result-count">
        {sorted.length} distiller{sorted.length === 1 ? "y" : "ies"}
        {(activeRegion || activePeat) && " matching your filters"}
      </div>

      {sorted.length === 0 ? (
        <div className="dist-empty-state">
          No distilleries match those filters. <button className="dist-clear-link" onClick={() => { setActiveRegion(null); setActivePeat(null); }}>Clear filters</button>
        </div>
      ) : (
        <div className="dist-grid">
          {sorted.map((d) => (
            <Link key={d.id} href={`/distilleries/${d.slug}`} className="dist-card">
              <div className="dist-card-image">
                <Image src={d.image} alt={d.name} fill style={{ objectFit: "cover" }} unoptimized />
              </div>
              <div className="dist-card-body">
                <div className="dist-card-meta">
                  {d.region} · {d.style}
                </div>
                <h2 className="dist-card-name">{d.name}</h2>
                <p className="dist-card-tagline">{d.tagline}</p>
                <div className="dist-card-price">Tours from {d.priceFrom}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
