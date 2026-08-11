"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTrip } from "@/lib/trip-context";
import { DREAM_AREAS } from "@/lib/dream-areas";
import { AREAS } from "@/lib/areas";
import { joinWithAnd } from "@/lib/trip-answers";
import DreamingShortlistSection from "./DreamingShortlistSection";
import type { Distillery, JournalPost, LocalFeature } from "@/lib/types";

/** Same matchMedia pattern as Workspace.tsx/Hero.tsx - starts false to
 *  avoid an SSR/hydration mismatch, accepting the same brief pre-effect
 *  flash those already do. */
const MOBILE_BREAKPOINT = 768;

/**
 * dreamArea id -> the real Area page it anchors to (areas.ts slug),
 * docs/hero-handoff.md §4.3 item 5 ("WHERE YOU'D BASE YOURSELF — Port
 * Ellen"). "north-east" has no entry: Caol Ila/Ardnahoe/Bunnahabhain's
 * own village, Port Askaig, was deliberately dropped from every
 * area/accommodation picker site-wide on 8 Aug 2026 (see areas.ts's own
 * header comment) - it isn't a real /areas/[slug] page. Rather than
 * link to a page that doesn't exist, HeroDreamingColumn simply omits
 * this one card for that area. Flagged: worth a real north-east Area
 * page eventually, matching the other three.
 */
const DREAM_AREA_BASE_SLUG: Partial<Record<string, string>> = {
  "peated-south": "port-ellen",
  "the-middle": "bowmore",
  "the-west": "port-charlotte",
};

/**
 * Naive relevance match for the Journal card (§4.3 item 3): a post
 * mentioning one of this area's own distilleries by name, newest first.
 * JUDGEMENT CALL, flagged: JournalPost carries no region/area tag in the
 * data model (only an editorial `category`), so a true curated pairing
 * like the reference screenshot's Port Ellen story isn't derivable yet -
 * this is a reasonable stand-in, not a claim of editorial curation, and
 * falls back to the single most recent post everywhere rather than
 * showing nothing.
 */
function journalPostForArea(posts: JournalPost[], distilleryNames: string[]): JournalPost | undefined {
  if (posts.length === 0) return undefined;
  const match = posts.find((p) =>
    distilleryNames.some((name) => p.title.includes(name) || p.body.includes(name))
  );
  return match ?? posts[0];
}

/**
 * State two's dreaming column (docs/hero-handoff.md §4.3, Phase 3 of
 * §9) - "cheap: existing content, re-surfaced." Every card links out to
 * real, already-live content (a real Journal post, a real Distillery,
 * a real Area page, /journey) rather than introducing anything new - the
 * only genuinely new content this phase adds is the four areas
 * themselves (dream-areas.ts, built in Phase 1) and the copy stitching
 * them together.
 */
export function HeroDreamingColumn({
  dreamAreaId,
  distilleries,
  journalPosts,
  localFeatures,
  announce,
}: {
  dreamAreaId: string;
  distilleries: Distillery[];
  journalPosts: JournalPost[];
  /** Only used by the mobile-only map+shortlist section (11 Aug 2026) -
   *  optional so desktop's inline reveal (Hero.tsx) doesn't need to
   *  fetch/pass this just to satisfy the prop type; undefined there
   *  renders as an empty array below (see visibleFeatures), which is
   *  fine since that section never mounts on desktop anyway. */
  localFeatures?: LocalFeature[];
  /** Same contract as HeroDaysColumn's own `announce` (§6) - called once
   *  with a summary for a screen reader, only when this reveal is the
   *  visitor's own button press this session. */
  announce?: (text: string) => void;
}) {
  const trip = useTrip();
  const announcedRef = useRef(false);
  const area = DREAM_AREAS.find((a) => a.id === dreamAreaId) ?? DREAM_AREAS[0];

  // 11 Aug 2026, Mark's call after reviewing the mobile /dreaming page:
  // the real day-by-day journey builder (/journey) assumes a mouse for
  // panning/zooming and isn't fully mobile-refined yet, so mobile gets
  // its own lighter alternative here instead of "Build it on the map" -
  // a permanent-pin map (DreamingMap) plus a shortlist section
  // (DreamingShortlistSection), rather than sending a mobile visitor
  // into the full itinerary builder. Desktop's own inline reveal (this
  // same component, split-screen) is completely unaffected - only the
  // standalone mobile /dreaming page renders through here at a narrow
  // width.
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const areaDistilleries = area.distilleries
    .map((name) => distilleries.find((d) => d.name === name))
    .filter((d): d is Distillery => Boolean(d));
  const featured = areaDistilleries[0];
  const others = areaDistilleries.slice(1);

  const post = journalPostForArea(journalPosts, area.distilleries);
  const baseSlug = DREAM_AREA_BASE_SLUG[area.id];
  const baseArea = baseSlug ? AREAS.find((a) => a.slug === baseSlug) : undefined;
  // Centres the mobile map near the selected area when there's a real
  // Area to anchor to (see DREAM_AREA_BASE_SLUG above); "north-east" has
  // none, so falls back to the same Port Ellen default MapCanvas itself
  // uses island-wide.
  const mapCenter = baseArea ?? AREAS.find((a) => a.slug === "port-ellen") ?? AREAS[0];
  const visibleFeatures = localFeatures ?? [];

  useEffect(() => {
    if (!announce || announcedRef.current) return;
    announcedRef.current = true;
    announce(`Reading about the ${area.name}, ${areaDistilleries.length} distilleries`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announce]);

  return (
    <div className="hero-days-column">
      <div className="hero-days-header">
        <span className="hero-days-header-title">
          {area.name} · {areaDistilleries.length}
        </span>
        <span className="hero-days-header-total">read it, or build it</span>
      </div>

      <div className="hero-dream-chip-row" role="group" aria-label="Which area you're drawn to">
        {DREAM_AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={"hero-dream-chip" + (a.id === area.id ? " selected" : "")}
            aria-pressed={a.id === area.id}
            onClick={() => trip.setAnswersDreamArea(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>

      {post && (
        <Link href={`/journal/${post.slug}`} className="hero-dream-card">
          <div className="hero-dream-card-kicker">Journal</div>
          <h3 className="hero-dream-card-title">{post.title}</h3>
          <p className="hero-dream-card-body">{post.metaDescription}</p>
        </Link>
      )}

      {featured && (
        // Was a plain non-interactive <div> - Mark's report, 11 Aug 2026:
        // neither this card nor its "All N" link actually went anywhere.
        // "All N" was already a real Link (/distilleries) so that part
        // should have worked on its own; the card body (title/tagline)
        // had no link at all. Can't wrap the WHOLE card in one <a> though
        // - it would nest <a> inside <a> around "All N", which is invalid
        // HTML and makes click behaviour inconsistent across browsers.
        // Kept "All N" as its own separate Link (still -> /distilleries,
        // the site-wide total) and wrapped just the title/tagline in a
        // second Link to the featured distillery's own page instead.
        <div className="hero-dream-card hero-dream-card-clickable">
          <div className="hero-dream-card-kicker-row">
            {/* 11 Aug 2026, Mark's request: was "Distillery · N in
                {area}" - the singular "Distillery" sitting apart from
                the count read ambiguously (easy to misread as one
                distillery, not a count). Ties the number and the plural
                noun together instead. */}
            <span className="hero-dream-card-kicker">
              {areaDistilleries.length} {areaDistilleries.length === 1 ? "Distillery" : "Distilleries"} in {area.shortName}
            </span>
            <Link href="/distilleries" className="hero-dream-card-link">
              All {distilleries.length} →
            </Link>
          </div>
          <Link href={`/distilleries/${featured.slug}`} className="hero-dream-card-body-link">
            <h3 className="hero-dream-card-title">{featured.name}</h3>
            <p className="hero-dream-card-body">
              {featured.tagline}
              {others.length > 0 && (
                <>
                  {" "}
                  {joinWithAnd(others.map((o) => o.name))} {others.length === 1 ? "is" : "are"} the{" "}
                  {others.length === 1 ? "other" : "others"} nearby.
                </>
              )}
            </p>
          </Link>
        </div>
      )}

      {baseArea && (
        <Link href={`/areas/${baseArea.slug}`} className="hero-dream-card">
          <div className="hero-dream-card-kicker">Where you&apos;d base yourself</div>
          <h3 className="hero-dream-card-title">{baseArea.name}</h3>
        </Link>
      )}

      {isMobileViewport ? (
        <DreamingShortlistSection distilleries={distilleries} localFeatures={visibleFeatures} center={mapCenter} />
      ) : (
        <Link href="/journey" className="hero-dream-card hero-dream-card-navy">
          <div className="hero-dream-card-kicker">Or start from nothing</div>
          <h3 className="hero-dream-card-title">Build it on the map</h3>
          <p className="hero-dream-card-body">
            Every distillery, beach and bar on one map — drop stops where you like.
          </p>
        </Link>
      )}
    </div>
  );
}
