"use client";

import { useMemo } from "react";
import { Spectral, Instrument_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { Area, LocalFeature } from "@/lib/types";
import { useTrip } from "@/lib/trip-context";
import { buildAccommodationBookingLink } from "@/lib/accommodation-links";
import { truncateSummary } from "@/lib/text";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import styles from "./area.module.css";

// Fonts loaded ONLY here (next/font scopes the generated @font-face + CSS
// variable to whatever applies the className below) - deliberately not
// added to the root layout, so this redesign stays scoped to the Areas
// template per Mark's steer not to touch any other page.
const spectral = Spectral({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-spectral" });
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
});

/** Great-circle distance in miles - same small local copy convention as
 *  the previous template (see git history), kept per-file rather than
 *  reaching into the data layer from a UI component. */
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
  return mi < 0.15 ? "0.1" : mi.toFixed(1);
}

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// Local Features whose Category marks them as somewhere to eat/drink -
// used both to size the glance bar's "Eating out" fact and to keep the
// "What else is around you" grid distillery/food-free per the design's
// content rule (distilleries live in the day plan; food/drink lives in
// the In The Village card).
const FOOD_DRINK_CATEGORIES = new Set(["pub", "cafe", "restaurant"]);

/** Glance bar's "Eating out" fact, derived from the real count of linked
 *  in-village food/drink features rather than invented - follows the
 *  design handoff's own suggested qualitative scale. */
function eatingOutFact(count: number): string {
  if (count >= 3) return "Plenty, all walkable";
  if (count === 2) return "Two pubs";
  if (count === 1) return "One pub";
  return "Nothing — eat where you stay";
}

const KIND_BADGES: Record<LocalFeature["category"], string> = {
  beach: "Beach",
  walk: "Walk",
  "bike-route": "Bike route",
  "local-gem": "Local gem",
  "historic-site": "History",
  "attraction-gem": "Attraction",
  pub: "Pub",
  cafe: "Cafe",
  restaurant: "Restaurant",
  golf: "Golf",
  spa: "Spa",
  transport: "Transport",
};

/** Small corner photo-attribution tag - same [label](url) markdown-link
 *  convention and visual treatment as the previous template's PhotoCredit
 *  (each page keeps its own small copy per this codebase's existing
 *  pattern, rather than sharing one). */
function PhotoCredit({ credit }: { credit: string }) {
  const match = credit.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const label = match ? match[1] : credit;
  const href = match ? match[2] : null;
  return (
    <div className={styles.heroCredit}>
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

interface AreaClientProps {
  area: Area;
}

/** Area page template redesign (06 Aug 2026) - full rebuild per the
 *  design handoff ("DramStory mobile experience design.zip", block 6a).
 *  Ordered around the reader's decision (qualify fast, sell the place,
 *  land the differentiator, convert) rather than around content
 *  categories - see that handoff's README for the section-by-section
 *  rationale. Scoped entirely to area.module.css + the fonts loaded
 *  above; no other template's files are touched.
 *
 *  Content note: several sections need real, sourced content this
 *  codebase doesn't have yet for every area (glance "Places to stay",
 *  booking-handoff advice). Those render an honest pending state instead
 *  of invented copy - see the Area type's doc comments for what's
 *  expected per field. */
export default function AreaClient({ area: a }: AreaClientProps) {
  const trip = useTrip();

  const foodDrink = useMemo(
    () => a.nearbyLocalFeatures.filter((f) => FOOD_DRINK_CATEGORIES.has(f.category)),
    [a.nearbyLocalFeatures]
  );
  // The four closest non-food/drink features, closest first - an
  // automatic rule (not hand-picked) so it keeps working as more areas
  // and more Nearby Local Features get added, same reasoning as Plan
  // Your Days auto-sorting by real duration rather than being curated.
  const nearby = useMemo(
    () =>
      a.nearbyLocalFeatures
        .filter((f) => !FOOD_DRINK_CATEGORIES.has(f.category))
        .map((f) => ({ feature: f, miles: milesBetween(a, f) }))
        .sort((x, y) => x.miles - y.miles)
        .slice(0, 4),
    [a]
  );

  const distilleryCount = a.distilleries.length;
  const featuredStay = a.featuredStays[0];
  const bookingUrl = buildAccommodationBookingLink(a.name);
  const stayDistanceMiles = featuredStay ? milesBetween(a, featuredStay) : undefined;

  function toggleFeature(feature: LocalFeature) {
    const alreadyAdded = trip.days.some((d) => d.stops.some((s) => s.kind === "feature" && s.feature.id === feature.id));
    if (alreadyAdded) {
      trip.days.forEach((d, i) => {
        if (d.stops.some((s) => s.kind === "feature" && s.feature.id === feature.id)) trip.removeStop(i, feature.id);
      });
      return;
    }
    trip.initDays(1);
    const dayIndex = Math.min(trip.currentDayIndex, Math.max(0, trip.days.length - 1));
    trip.addFeatureStop(dayIndex, feature);
  }
  function isFeatureAdded(feature: LocalFeature): boolean {
    return trip.ready && trip.days.some((d) => d.stops.some((s) => s.kind === "feature" && s.feature.id === feature.id));
  }

  // Mirrors DaysHubGrid's handleAddToTrip exactly (same addDay/addStop/
  // setTourForStop/addFeatureStop sequence, same deliberate choice not to
  // navigate this tab away - see that file's 22 Jul 2026 comment for why)
  // rather than reintroducing the "yanks you out of the page" bug it
  // fixed, even though the design brief's own wording says "routes to
  // the planner".
  function useThisDay() {
    if (!a.dayPlan) return;
    const day = a.dayPlan;
    const newDayIndex = trip.days.length;
    trip.addDay(day.slug);
    for (const stop of day.stops) {
      trip.addStop(newDayIndex, stop.distillery);
      if (stop.tour) trip.setTourForStop(newDayIndex, stop.distillery, stop.tour);
    }
    for (const feature of day.featureStops) {
      trip.addFeatureStop(newDayIndex, feature);
    }
    trip.setCurrentDayIndex(newDayIndex);
    window.open("/journey?resume=1", "dramstory-journey");
  }

  // Fix #2 (10 Aug 2026): was a plain /distilleries?region= Link (a
  // filtered text list, no map) - Mark asked for this to open the real
  // interactive planner map instead, panned/zoomed to this Area's region
  // with every layer switched on, same "the planner map" meaning as
  // everywhere else on the site. Seeds trip.mapView (read by MapCanvas's
  // initialView prop via Workspace - see trip-context.tsx) before
  // navigating, then opens with the same resume=1 + named-window
  // convention as useThisDay() above for consistency. showAll=1 is a new
  // one-time signal, read server-side (journey/page.tsx) into
  // JourneyFlow's initial interests, so every category defaults active
  // here instead of just Distilleries - see JourneyFlow's ALL_INTEREST_
  // CATEGORIES/showAll handling.
  //
  // Revised again (10 Aug 2026, same day) per Mark's live-testing
  // feedback with two more specific asks: (1) a village-level zoom, not
  // the wider region view the fixed lookup above produced - now centred
  // on the Area's own coordinate (not the distillery midpoint, which can
  // sit a mile or two off from the village itself) at a fixed close zoom;
  // (2) "with port ellen area selected and nothing in the left bar" -
  // read as wanting the map to open on a genuinely empty exploration day
  // with this Area set as its accommodation (so AccommodationControl
  // shows "Staying: Port Ellen"), not whatever the visitor's existing
  // trip happens to already contain. Always adds a brand-new Day for
  // this (same newDayIndex-before-addDay pattern as useThisDay() above)
  // rather than reusing the current day, since that's the only way to
  // guarantee "nothing in the left bar" regardless of prior trip state.
  function openRegionOnMap() {
    if (!a.distilleryRegion) return;
    const newDayIndex = trip.days.length;
    trip.addDay();
    trip.setAccommodation(newDayIndex, { name: a.name, lat: a.lat, lng: a.lng });
    trip.setCurrentDayIndex(newDayIndex);
    trip.setMapView({ lat: a.lat, lng: a.lng, zoom: 14 });
    window.open("/journey?resume=1&showAll=1", "dramstory-journey");
  }

  const advisorySentences = a.advisoryNotice?.split(/(?<=[.!?])\s+/) ?? [];

  return (
    <>
      <PageHeader />
      <div className={`${styles.page} ${spectral.variable} ${instrumentSans.variable}`}>
      {/* ── 1. Hero ── */}
      <div className={styles.hero}>
        {a.heroImageUrl ? (
          <Image src={a.heroImageUrl} alt={a.name} fill unoptimized className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder} />
        )}
        {a.heroImageCredit && <PhotoCredit credit={a.heroImageCredit} />}
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          {a.distilleryRegion && <div className={styles.eyebrow}>VILLAGE · {a.distilleryRegion.toUpperCase()}</div>}
          <h1 className={styles.h1}>{a.name}</h1>
          {a.whyHook && <p className={styles.subhead}>{a.whyHook}</p>}
        </div>
      </div>

      {/* ── 2. Glance bar ── */}
      <div className={styles.glanceBar}>
        <div>
          <div className={styles.glanceLabel}>Distilleries within 4 miles</div>
          <div className={styles.glanceValue}>{NUMBER_WORDS[distilleryCount] ?? distilleryCount}</div>
        </div>
        <div>
          <div className={styles.glanceLabel}>Places to stay</div>
          <div className={a.glancePlacesToStay ? styles.glanceValue : `${styles.glanceValue} ${styles.glancePending}`}>
            {a.glancePlacesToStay ?? "Coming soon"}
          </div>
        </div>
        <div>
          <div className={styles.glanceLabel}>Eating out</div>
          <div className={styles.glanceValue}>{eatingOutFact(foodDrink.length)}</div>
        </div>
      </div>

      {/* ── 3. Advisory notice ── */}
      {a.advisoryNotice && (
        <div className={styles.section}>
          <div className={styles.advisoryCard}>
            <span className={styles.advisoryBang}>!</span>
            <p className={styles.advisoryBody}>
              <span className={styles.advisoryLead}>{advisorySentences[0]}</span>{" "}
              {advisorySentences.slice(1).join(" ")}
            </p>
          </div>
        </div>
      )}

      {/* ── 4. Base here if / Look elsewhere if ── */}
      {(a.bestFor || a.notFor) && (
        <div className={styles.section}>
          <div className={styles.qualGrid}>
            {a.bestFor && (
              <div className={styles.qualCard}>
                <div className={`${styles.qualLabel} ${styles.qualLabelGood}`}>Base here if</div>
                <p className={styles.qualBody}>{a.bestFor}</p>
              </div>
            )}
            {a.notFor && (
              <div className={styles.qualCard}>
                <div className={`${styles.qualLabel} ${styles.qualLabelBad}`}>Look elsewhere if</div>
                <p className={styles.qualBody}>{a.notFor}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. What it's like to stay here ── */}
      <div className={styles.section}>
        <div className={styles.stayGrid}>
          <div>
            <h2 className={styles.h2}>What it&apos;s like to stay here</h2>
            {a.whatToExpect.split("\n\n").map((para, i) => (
              <p className={styles.stayP} key={i}>
                {para}
              </p>
            ))}
          </div>
          {a.inTheVillage.length > 0 && (
            <div className={styles.villageCard}>
              <div className={styles.villageLabel}>In the village</div>
              {a.inTheVillage.map((row) => (
                <div className={styles.villageRow} key={row.key}>
                  <span className={styles.villageKey}>{row.key}</span>
                  <span className={styles.villageVal}>{row.value}</span>
                </div>
              ))}
              {a.inTheVillageMissing && <p className={styles.villageMissing}>{a.inTheVillageMissing}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Base here and day one plans itself ── */}
      {a.dayPlan && (
        <div className={styles.section}>
          <span className={styles.dayEyebrow}>Only on DramStory</span>
          <div className={styles.headRow}>
            <h2 className={styles.h2} style={{ margin: "6px 0 0" }}>
              Base here and day one plans itself
            </h2>
            {/* Was "Open the full planner" -> useThisDay(), duplicating the
                "Use this day ->" CTA below (both did the identical
                add-to-trip action). Fix #3 (10 Aug 2026, Mark's live-
                testing feedback): relabelled "See all days" and pointed at
                a real Days list instead, sorted by proximity to this Area
                rather than performing the same action twice. */}
            <Link href={`/days?near=${a.slug}`} className={styles.sectionLink}>
              See all days →
            </Link>
          </div>
          <p className={styles.dayIntro} style={{ marginTop: 14 }}>
            {a.dayPlan.narrative.split(/(?<=[.!?])\s+/)[0]}
          </p>
          <div className={styles.dayPanel}>
            <div className={styles.dayTitle}>{a.dayPlan.name}</div>
            <div className={styles.dayPanelInner}>
              <div className={styles.stopsRow}>
                {a.dayPlan.stops.map((stop, i) => (
                  <div className={styles.stop} key={stop.distillery.slug}>
                    <div className={styles.stopTime}>Stop {i + 1}</div>
                    <div className={styles.stopName}>{stop.distillery.name}</div>
                    <div className={styles.stopNote}>
                      {stop.tour
                        ? truncateSummary(`${stop.tour.name}${stop.tour.duration ? ` — ${stop.tour.duration}` : ""}`, 60)
                        : truncateSummary(stop.distillery.tagline, 60)}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.dayRail}>
                {a.dayPlan.durationPortEllen && (
                  <>
                    <div className={styles.railLabel}>Total time</div>
                    <div className={styles.railValue}>{a.dayPlan.durationPortEllen}</div>
                  </>
                )}
                {a.dayPlan.cost && (
                  <>
                    <div className={styles.railLabel}>Tours from</div>
                    <div className={styles.railValue}>{a.dayPlan.cost}</div>
                  </>
                )}
                <button type="button" className={styles.ctaGold} onClick={useThisDay}>
                  Use this day →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. What else is around you ── */}
      {nearby.length > 0 && (
        <div className={styles.section}>
          <div className={styles.headRow}>
            <h2 className={styles.h2}>What else is around</h2>
            {a.distilleryRegion && (
              <button type="button" className={styles.sectionLink} onClick={openRegionOnMap}>
                Everything in {a.distilleryRegion} on the map →
              </button>
            )}
          </div>
          <div className={styles.nearbyGrid}>
            {nearby.map(({ feature, miles }) => {
              const added = isFeatureAdded(feature);
              return (
                <div className={styles.nearbyCard} key={feature.id}>
                  <Link href={`/explore/${feature.slug}`} className={styles.nearbyImgWrap}>
                    {feature.heroImageUrl ? (
                      <Image src={feature.heroImageUrl} alt={feature.name} fill unoptimized className={styles.nearbyImg} />
                    ) : (
                      <div className={styles.heroPlaceholder} />
                    )}
                    <span className={styles.nearbyKindBadge}>{KIND_BADGES[feature.category] ?? feature.category}</span>
                  </Link>
                  <div className={styles.nearbyBody}>
                    <Link href={`/explore/${feature.slug}`} style={{ textDecoration: "none" }}>
                      <div className={styles.nearbyName}>{feature.name}</div>
                    </Link>
                    <p className={styles.nearbyReason}>{feature.description ? truncateSummary(feature.description, 100) : ""}</p>
                    <div className={styles.nearbyFoot}>
                      <span className={styles.nearbyDist}>{formatMiles(miles)} miles</span>
                      <button
                        type="button"
                        className={added ? `${styles.nearbyAdd} ${styles.nearbyAddDone}` : styles.nearbyAdd}
                        onClick={() => toggleFeature(feature)}
                      >
                        {added ? "✓ Added" : "+ Add"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 8. Where to stay ── */}
      <div className={styles.sectionLast}>
        <h2 className={styles.h2}>Where to stay in {a.name}</h2>
        <div className={styles.staysGrid}>
          {featuredStay ? (
            <div className={styles.stayCard}>
              <div className={styles.stayImgWrap}>
                {featuredStay.heroImageUrl ? (
                  <Image src={featuredStay.heroImageUrl} alt={featuredStay.name} fill unoptimized className={styles.stayImg} />
                ) : (
                  <div className={styles.heroPlaceholder} />
                )}
                <span className={styles.featuredBadge}>Featured stay</span>
              </div>
              <div className={styles.stayCardBody}>
                <div className={styles.stayCardHeadRow}>
                  <h3 className={styles.stayName}>{featuredStay.name}</h3>
                  {stayDistanceMiles != null && (
                    <span className={styles.stayDistNote}>{formatMiles(stayDistanceMiles)} miles from the village</span>
                  )}
                </div>
                {(featuredStay.whyStay || featuredStay.description) && (
                  <p className={styles.stayBlurb}>{featuredStay.whyStay ?? truncateSummary(featuredStay.description, 220)}</p>
                )}
                {featuredStay.facilities.length > 0 && (
                  <div className={styles.chipRow}>
                    {featuredStay.facilities.map((f) => (
                      <span className={styles.chip} key={f}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.stayFoot}>
                  <span className={styles.stayFootNote}>Rates and dates on the hotel&apos;s own site</span>
                  <Link href={`/stays/${featuredStay.slug}`} className={styles.btnDark}>
                    View this stay →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.stayCard}>
              <div className={styles.stayCardBody}>
                <p className={styles.stayBlurb}>No Featured Stay set for {a.name} yet.</p>
              </div>
            </div>
          )}

          <div className={styles.handoffPanel}>
            <span className={styles.handoffLabel}>Everything else</span>
            <p className={styles.handoffLead}>
              {a.name}{" "}
              has small hotels, B&amp;Bs and self-catering cottages beyond the Featured Stay — most without live online
              booking.
            </p>
            <p className={styles.handoffBody}>Check live prices across all of them in one search, then come back and build the days around whatever you book.</p>
            {a.bookingAdvice.length > 0 ? (
              a.bookingAdvice.map((row) => (
                <div className={styles.adviceRow} key={row.key}>
                  <span className={styles.adviceKey}>{row.key}</span>
                  <span className={styles.adviceValue}>{row.value}</span>
                </div>
              ))
            ) : (
              <p className={styles.handoffPending}>Local booking advice for {a.name} is being added.</p>
            )}
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={`${styles.ctaGold} ${styles.ctaGoldFull}`}>
              Search stays on hotels.com ↗
            </a>
            <p className={styles.disclosure}>Opens a {a.name} search with your dates. We may earn a commission — it costs you nothing.</p>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </>
  );
}
