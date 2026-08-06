import Image from "next/image";
import Link from "next/link";
import type { Area } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import { buildAccommodationBookingLink } from "@/lib/accommodation-links";

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same helper as DistilleryPageClient/
 *  ExploreFeatureClient/FeaturedStayClient (each detail page keeps its
 *  own copy rather than sharing one, matching the existing pattern in
 *  this codebase). */
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

/** Great-circle distance in miles - a small local copy of the same
 *  haversine formula used elsewhere (src/lib/data/airtable-mappers.ts'
 *  distanceKm), kept separate per this codebase's existing "each
 *  page/component keeps its own small copy" convention rather than
 *  reaching into the data-layer module from a UI component. Used only to
 *  show a rough "X.X miles" figure next to each Nearby Local Feature -
 *  the underlying curation (which features are even listed) is still
 *  done by hand, verified against real coordinates, per
 *  content-sourcing-standards.md, not this calculation. */
function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatMiles(mi: number): string {
  return mi < 0.15 ? "under 0.2 miles" : `${mi.toFixed(1)} miles`;
}

// Local Features whose Category marks them as somewhere to eat/drink,
// rather than an attraction/natural feature - splits the single Nearby
// Local Features link field into the two sections the agreed content
// structure calls for (Nearby Local Features vs In-Village Food & Drink)
// without needing a second, duplicate link field in Airtable.
const FOOD_DRINK_CATEGORIES = new Set(["pub", "cafe", "restaurant"]);

interface AreaClientProps {
  area: Area;
}

/** Village/region guide page (Areas table) - first built 06 Aug 2026 for
 *  Port Ellen. Reuses the simplified two-column hotel template's classes
 *  (.stay-*, .dist-*) rather than inventing a new layout, per Mark's
 *  steer that the hotel template's plainer two-column shape (hero, sticky
 *  sidebar facts, editorial column) is the direction to build in. */
export default function AreaClient({ area: a }: AreaClientProps) {
  const foodDrink = a.nearbyLocalFeatures.filter((f) => FOOD_DRINK_CATEGORIES.has(f.category));
  const attractions = a.nearbyLocalFeatures.filter((f) => !FOOD_DRINK_CATEGORIES.has(f.category));
  const bookingUrl = buildAccommodationBookingLink(a.name);
  const hasGlance = a.population != null || !!a.distilleryRegion;

  return (
    <>
      <PageHeader />

      <div className="page">
        <div className="distillery-hero">
          {a.heroImageUrl ? (
            <Image className="distillery-hero-img" src={a.heroImageUrl} alt={a.name} fill unoptimized style={{ objectFit: "cover" }} />
          ) : (
            // Graceful empty state, same pattern as the hotel/distillery
            // pages - a record can genuinely have no Hero Image yet.
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
              <span style={{ fontSize: 72 }}>🏘️</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Photo coming soon</span>
            </div>
          )}
          <div className="distillery-hero-overlay" />
          <div className="distillery-hero-content">
            <div>
              <h1 className="distillery-hero-title">{a.name}</h1>
              <div className="distillery-hero-sub">
                {a.distilleryRegion && <span className="hero-badge">{a.distilleryRegion}</span>}
                {a.population != null && <span className="hero-badge">{a.population.toLocaleString()} people</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="stay-layout">
          {/* ── Sidebar card ── */}
          <aside className="stay-side-card">
            {hasGlance && (
              <>
                <span className="stay-side-label">At a glance</span>
                <div className="stay-glance-rows">
                  {a.population != null && (
                    <div className="stay-glance-row">
                      <span className="stay-glance-key">Population</span>
                      <span className="stay-glance-val">{a.population.toLocaleString()}</span>
                    </div>
                  )}
                  {a.distilleryRegion && (
                    <div className="stay-glance-row">
                      <span className="stay-glance-key">Region</span>
                      <span className="stay-glance-val">{a.distilleryRegion}</span>
                    </div>
                  )}
                </div>
                {a.populationSource && <p className="stay-side-note">Population: {a.populationSource}.</p>}
              </>
            )}

            {a.shopsAmenities && (
              <>
                <span className="stay-side-label">Shops &amp; amenities</span>
                <p className="dist-p" style={{ marginBottom: 22 }}>
                  {renderWithLinks(a.shopsAmenities)}
                </p>
              </>
            )}

            {a.gettingHere && (
              <>
                <span className="stay-side-label">Getting here</span>
                <p className="dist-p" style={{ marginBottom: 22 }}>
                  {renderWithLinks(a.gettingHere)}
                </p>
              </>
            )}

            <div className="stay-side-actions">
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="stay-side-book">
                Search hotels.com &rarr;
              </a>
              {a.featuredStays.map((s) => (
                <Link href={`/stays/${s.slug}`} key={s.slug} className="stay-side-add">
                  View {s.name} &rarr;
                </Link>
              ))}
            </div>
          </aside>

          {/* ── Editorial column ── */}
          <main>
            <section>
              <span className="stay-eyebrow">Why base here</span>
              {a.whyHook && <h2 className="stay-lede">{a.whyHook}</h2>}
              {a.whatToExpect.split("\n\n").map((para, i) => (
                <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                  {renderWithLinks(para)}
                </p>
              ))}
            </section>

            {a.whatNotToExpect && (
              <>
                <hr className="stay-divider" />
                <section>
                  <span className="stay-eyebrow">What not to expect</span>
                  <p className="dist-p">{renderWithLinks(a.whatNotToExpect)}</p>
                </section>
              </>
            )}

            {(a.bestFor || a.notFor) && (
              <>
                <hr className="stay-divider" />
                <section className="area-best-grid">
                  {a.bestFor && (
                    <div>
                      <div className="stay-mini-label">Best for</div>
                      <p className="dist-p">{renderWithLinks(a.bestFor)}</p>
                    </div>
                  )}
                  {a.notFor && (
                    <div>
                      <div className="stay-mini-label">Not for</div>
                      <p className="dist-p">{renderWithLinks(a.notFor)}</p>
                    </div>
                  )}
                </section>
              </>
            )}

            {a.hazardCallout && (
              <div className="area-hazard-callout">
                <strong>Worth knowing:</strong> {a.hazardCallout}
              </div>
            )}

            {a.distilleries.length > 0 && (
              <>
                <hr className="stay-divider" />
                <section>
                  <span className="stay-eyebrow">Local distilleries</span>
                  <div className="area-pill-list">
                    {a.distilleries.map((d) => (
                      <Link href={`/distilleries/${d.slug}`} key={d.slug} className="area-pill">
                        {d.name}
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}

            {attractions.length > 0 && (
              <>
                <hr className="stay-divider" />
                <section>
                  <span className="stay-eyebrow">Nearby</span>
                  <div className="area-pill-list">
                    {attractions.map((f) => (
                      <Link href={`/explore/${f.slug}`} key={f.slug} className="area-pill">
                        {f.name}
                        <span className="area-pill-dist">{formatMiles(milesBetween(a, f))}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}

            {foodDrink.length > 0 && (
              <>
                <hr className="stay-divider" />
                <section>
                  <span className="stay-eyebrow">In-village food &amp; drink</span>
                  <div className="area-pill-list">
                    {foodDrink.map((f) => (
                      <Link href={`/explore/${f.slug}`} key={f.slug} className="area-pill">
                        {f.name}
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}

            {a.alternateAreas.length > 0 && (
              <>
                <hr className="stay-divider" />
                <section>
                  <p className="dist-p">
                    Not quite what you&apos;re after?{" "}
                    {a.alternateAreas.map((alt, i) => (
                      <span key={alt.slug}>
                        {i > 0 && ", "}
                        <Link href={`/areas/${alt.slug}`} className="dist-inline-link">
                          {alt.name}
                        </Link>
                      </span>
                    ))}{" "}
                    might suit better.
                  </p>
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}
