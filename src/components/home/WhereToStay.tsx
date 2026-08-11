import Link from "next/link";
import type { Area, FeaturedStay } from "@/lib/types";

/**
 * "Where to stay" grid - Areas + Featured hotels. Moved here from the
 * /journey workspace's own below-map section (11 Aug 2026, Mark's
 * request, following the site pivot away from the old planner-first
 * flow) - that section is hidden on /journey now that it's a secondary
 * page, so this content lives on the homepage instead, same markup/CSS
 * classes (.discover-grid/.discover-card, shared site-wide) as before.
 */
export default function WhereToStay({ areas, featuredStays }: { areas: Area[]; featuredStays: FeaturedStay[] }) {
  return (
    <div className="below-map-section">
      <h2 className="how-title">Where to stay</h2>

      <div className="discover-group-label">Areas</div>
      <div className="discover-grid">
        {areas.map((a) => (
          <Link href={`/areas/${a.slug}`} className="discover-card" key={`area-${a.slug}`}>
            <div className="discover-card-image" style={a.heroImageUrl ? { backgroundImage: `url(${a.heroImageUrl})` } : undefined} />
            <div className="discover-card-body">
              <div className="discover-card-tag">Area</div>
              <div className="discover-card-name">{a.name}</div>
              {a.whyHook && <p className="discover-card-desc">{a.whyHook}</p>}
              <div className="discover-card-footer">
                <span className="discover-card-meta">Islay</span>
                <span className="discover-card-link">Explore &rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="discover-group-label">Featured hotels</div>
      <div className="discover-grid">
        {featuredStays.map((s) => (
          <Link href={`/stays/${s.slug}`} className="discover-card" key={`stay-${s.slug}`}>
            <div className="discover-card-image" style={s.heroImageUrl ? { backgroundImage: `url(${s.heroImageUrl})` } : undefined} />
            <div className="discover-card-body">
              <div className="discover-card-tag">Hotel</div>
              <div className="discover-card-name">{s.name}</div>
              {s.whyStay && <p className="discover-card-desc">{s.whyStay}</p>}
              <div className="discover-card-footer">
                <span className="discover-card-meta">{s.style || "Featured stay"}</span>
                <span className="discover-card-link">View &rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
