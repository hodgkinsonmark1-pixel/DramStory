"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedStay } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
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

/** A "distance from" field parsed into the sidebar's Getting Here row
 *  shape: place-name link, drive-time figure, mileage subline, with any
 *  long trailing caveat (e.g. Port Ellen's closure) carried as a second
 *  subline rather than dropped. Returns null when the text doesn't follow
 *  the authored "... (about X minutes) ... [Label](/path)" pattern, so
 *  the caller can fall back to rendering the raw text - a hotel whose
 *  fields are written differently degrades gracefully. */
interface ParsedDistance {
  /** e.g. "15–20 min" */
  headline: string;
  /** e.g. "Around 8–9 miles by road." */
  sub: string;
  link?: { label: string; href: string };
  /** Long caveat clause (capitalised, full stop) shown as a second
   *  subline - e.g. the Port Ellen closure note. */
  overflow?: string;
}

function parseDistance(text: string): ParsedDistance | null {
  let working = text.trim();

  const linkMatch = working.match(/\[([^\]]+)\]\(([^)]+)\)/);
  const link = linkMatch ? { label: linkMatch[1], href: linkMatch[2] } : undefined;
  if (linkMatch) working = working.replace(linkMatch[0], "").trim();

  const timeMatch = working.match(/\(about\s+([^)]+?)\s*min(?:ute)?s?\)/i);
  if (!timeMatch) return null;
  const headline = `${timeMatch[1].trim()} min`;
  working = working.replace(timeMatch[0], "").replace(/\s{2,}/g, " ").trim();
  // Tidy punctuation stranded by the removals ("by road ." etc.).
  working = working.replace(/\s+([.,])/g, "$1").replace(/^[\s.,;–—-]+/, "").replace(/[\s.]+$/, "");

  // A long clause after an em-dash (like Port Ellen's closure note)
  // becomes its own second subline; a short aside ("— Bridgend sits on
  // the direct route north") stays inline. Same 60-char cut-off as the
  // previous tile treatment.
  const emDashIndex = working.indexOf(" — ");
  let sub = working;
  let overflow: string | undefined;
  if (emDashIndex !== -1) {
    const tail = working.slice(emDashIndex + 3).trim();
    if (tail.length > 60) {
      sub = working.slice(0, emDashIndex).trim();
      overflow = tail.charAt(0).toUpperCase() + tail.slice(1);
      if (!/[.!?]$/.test(overflow)) overflow += ".";
    }
  }
  if (sub && !/[.!?]$/.test(sub)) sub += ".";

  return { headline, sub, link, overflow };
}

interface FeaturedStayClientProps {
  stay: FeaturedStay;
}

/** Simplified two-column hotel template (06 Aug 2026, Mark's mockup):
 *  hero on top, then a sticky sidebar card (At a Glance / Facilities /
 *  Getting Here / booking CTAs) beside the editorial column (Why Stay,
 *  Eating & Drinking, "A Night in [Year]" band, gallery). The previous
 *  template's sticky booking bar, Plan Your Days, Visit Info tiles,
 *  Distilleries from your door and closing CTA were removed with it -
 *  the data model (planYourDays, nearestDistilleries, etc.) is untouched
 *  and the removed components are recoverable from git history. */
export default function FeaturedStayClient({ stay: s }: FeaturedStayClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const handleAddToTrip = useAddStayToTrip(s);

  const glanceRows = [
    { key: "Rooms", value: s.rooms },
    { key: "Types", value: s.roomTypes },
    { key: "Dogs", value: s.dogs },
    // Prefers the short area name; falls back to the fuller Setting text
    // so the row still renders for hotels without a Nearest Area set.
    { key: "Setting", value: s.nearestArea || s.setting },
  ];

  const gettingHere = [
    { fallbackLabel: "Islay Airport", value: s.distanceFromAirport },
    { fallbackLabel: "Port Askaig ferry", value: s.distanceFromPortAskaigFerry },
    { fallbackLabel: "Port Ellen ferry", value: s.distanceFromPortEllenFerry },
  ]
    .filter((t) => t.value)
    .map((t) => ({ ...t, parsed: parseDistance(t.value!) }));

  const hasGlance = glanceRows.some((r) => r.value);
  const hasHistoryHighlight = !!(s.historyHighlightYear && s.historyHighlightQuote);

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
                {s.priceFrom && <span className="hero-badge">From {s.priceFrom} / night</span>}
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
                  {glanceRows.map(
                    (r) =>
                      r.value && (
                        <div className="stay-glance-row" key={r.key}>
                          <span className="stay-glance-key">{r.key}</span>
                          <span className="stay-glance-val">{r.value}</span>
                        </div>
                      )
                  )}
                </div>
              </>
            )}

            {s.facilities.length > 0 && (
              <>
                <span className="stay-side-label">Facilities</span>
                <div className="stay-side-facilities">
                  {s.facilities.map((f) => (
                    <span className="facility-badge" key={f}>
                      {f}
                    </span>
                  ))}
                </div>
              </>
            )}

            {gettingHere.length > 0 && (
              <>
                <span className="stay-side-label">Getting here</span>
                <div>
                  {gettingHere.map((t) => (
                    <div className="stay-gh-row" key={t.fallbackLabel}>
                      {t.parsed ? (
                        <>
                          <div className="stay-gh-top">
                            {t.parsed.link ? (
                              t.parsed.link.href.startsWith("/") ? (
                                <Link href={t.parsed.link.href} className="stay-gh-name">
                                  {t.parsed.link.label}
                                </Link>
                              ) : (
                                <a href={t.parsed.link.href} target="_blank" rel="noopener noreferrer" className="stay-gh-name">
                                  {t.parsed.link.label}
                                </a>
                              )
                            ) : (
                              <span className="stay-gh-name">{t.fallbackLabel}</span>
                            )}
                            <span className="stay-gh-time">{t.parsed.headline}</span>
                          </div>
                          {t.parsed.sub && <div className="stay-gh-sub">{t.parsed.sub}</div>}
                          {t.parsed.overflow && <div className="stay-gh-sub">{t.parsed.overflow}</div>}
                        </>
                      ) : (
                        <>
                          <div className="stay-gh-top">
                            <span className="stay-gh-name">{t.fallbackLabel}</span>
                          </div>
                          <div className="stay-gh-sub">{renderWithLinks(t.value!)}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="stay-side-actions">
              {s.bookingUrl && (
                <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="stay-side-book">
                  Check availability &rarr;
                </a>
              )}
              <button type="button" onClick={handleAddToTrip} className="stay-side-add">
                + Add to my trip
              </button>
            </div>
            {s.bookingUrl && <p className="stay-side-note">Books direct with the hotel — no DramStory fee.</p>}
            {(s.websiteUrl || s.tripAdvisorUrl) && (
              <div className="stay-side-links">
                {s.websiteUrl && (
                  <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer">
                    Official website &#8599;
                  </a>
                )}
                {s.tripAdvisorUrl && (
                  <a href={s.tripAdvisorUrl} target="_blank" rel="noopener noreferrer">
                    TripAdvisor &#8599;
                  </a>
                )}
              </div>
            )}
          </aside>

          {/* ── Editorial column ── */}
          <main>
            <section>
              <span className="stay-eyebrow">Why stay here</span>
              {s.whyStay && <h2 className="stay-lede">{s.whyStay}</h2>}
              {s.description.split("\n\n").map((para, i) => (
                <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                  {renderWithLinks(para)}
                </p>
              ))}
            </section>

            {s.eatingDrinking && (
              <>
                <hr className="stay-divider" />
                <section>
                  <span className="stay-eyebrow">Eating &amp; drinking</span>
                  {s.eatingDrinking.split("\n\n").map((para, i) => (
                    <p className="dist-p" key={i} style={{ marginBottom: 12 }}>
                      {renderWithLinks(para)}
                    </p>
                  ))}
                  {s.recognition && (
                    <div className="stay-recognition">
                      <div className="stay-mini-label">Recognition</div>
                      <div className="stay-mini-value">{s.recognition}</div>
                    </div>
                  )}
                </section>
              </>
            )}

            {hasHistoryHighlight && (
              <div className="stay-history-band">
                <div className="stay-history-band-year">{s.historyHighlightYear}</div>
                <div>
                  <p className="stay-history-band-quote">{s.historyHighlightQuote}</p>
                  {s.historyHighlightSource && (
                    <p className="stay-history-band-source">From {s.historyHighlightSource}</p>
                  )}
                </div>
              </div>
            )}

            {s.gallery && s.gallery.length > 0 && (
              <section>
                <span className="stay-eyebrow">Inside the inn</span>
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
              </section>
            )}
          </main>
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
