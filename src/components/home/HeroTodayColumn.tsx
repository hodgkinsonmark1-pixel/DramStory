"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Distillery, LocalFeature } from "@/lib/types";
import { AREAS } from "@/lib/areas";
import { useTrip } from "@/lib/trip-context";
import { buildTodaySchedule, formatClockTime, type TodayStop } from "@/lib/today-schedule";

/** Same matchMedia pattern as HeroDreamingColumn.tsx - starts false to
 *  avoid an SSR/hydration mismatch, accepting the same brief pre-effect
 *  flash those already do. */
const MOBILE_BREAKPOINT = 768;

/**
 * State two's "on Islay today" column (docs/hero-handoff.md §4.2, Phase
 * 4 of §9) - stops with the arrival time each would have if the visitor
 * left now. All ranking/schedule maths lives in today-schedule.ts;
 * this component is the render layer over it plus the client-only
 * "what time is it right now" clock, refreshed every minute so the
 * column doesn't silently go stale on a tab left open.
 */
export function HeroTodayColumn({
  todayNear,
  distilleries,
  localFeatures,
}: {
  todayNear: string;
  distilleries: Distillery[];
  localFeatures: LocalFeature[];
}) {
  const router = useRouter();
  const trip = useTrip();
  const [now, setNow] = useState<Date | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null; // client-only clock - nothing honest to show before mount

  const village = AREAS.find((a) => a.slug === todayNear) ?? AREAS[0];
  const schedule = buildTodaySchedule({ now, village, distilleries, localFeatures });
  const distilleryStopCount = schedule.stops.filter((s) => s.kind === "distillery").length;

  const headerTitle =
    distilleryStopCount === 0
      ? "Getting late for a distillery today"
      : `Time for ${distilleryStopCount === 1 ? "one distillery" : `${distilleryStopCount} distilleries`}`;

  return (
    <div className="hero-days-column">
      <div className="hero-days-header">
        <span className="hero-days-header-title">{headerTitle}</span>
        <span className="hero-days-header-total">
          {formatClockTime(schedule.nowMinutes)} now · sunset {formatClockTime(schedule.sunsetMinutes)}
        </span>
      </div>

      {schedule.stops.length === 0 ? (
        <div className="hero-days-empty">
          {/* 11 Aug 2026: reworded off "before dark" - the zero-distillery
              case is now driven by time-of-day tour scheduling
              (today-schedule.ts's distilleryBudget), not by sunset, so it
              can easily be broad daylight (a June evening) when this
              shows. "For today" instead keeps it honest either way. */}
          Most tours have wrapped up for today from here - worth checking tomorrow, or see what&apos;s nearby on the
          map.
        </div>
      ) : (
        schedule.stops.map((stop) => <TodayStopRow key={`${stop.kind}-${stop.slug}`} stop={stop} />)
      )}

      <div className="hero-today-note">
        <div className="hero-today-note-kicker">Before you drive</div>
        <p className="hero-today-note-body">
          Tour times change through the season and tours do sell out — ring ahead or check the distillery&apos;s own
          site. We can tell you what&apos;s near and what fits; we can&apos;t tell you what&apos;s free.
        </p>
      </div>

      {/* 11 Aug 2026, Mark's request: zoom the map to where the visitor
          actually said they are (village, not the site-wide Port Ellen
          default) and skip the onboarding walkthrough - its demo pin/
          "customise a day" steps assume a planning/dreaming visit with
          time to spare, not someone checking what fits right now.
          showAll=1 so every category (not just Distilleries) shows,
          matching "see what's nearby" above rather than a narrower
          default. Sets mapView before navigating (same TripProvider
          instance survives the client-side route change, so no
          localStorage round-trip needed) rather than mislabelling this
          as timing=today, which would need a distillery-level location
          TodayLocationStep expects but todayNear (village-level) can't
          honestly provide - see Workspace.tsx's skipWalkthrough prop. */}
      {isMobileViewport ? (
        // 11 Aug 2026, Mark's follow-up after the dreaming map fix:
        // this link had the exact same problem - the real /journey map
        // assumes a mouse. Same treatment as HeroDreamingColumn's mobile
        // branch: reuse the DreamingMap/DreamingShortlistSection pair via
        // a dedicated page instead, centred on today's own village
        // rather than a dream area. See /today/build.
        <Link href="/today/build" className="hero-days-foot">
          See what&apos;s nearby on the map →
        </Link>
      ) : (
        <Link
          href="/journey?showAll=1&walkthrough=skip"
          className="hero-days-foot"
          onClick={(e) => {
            e.preventDefault();
            trip.setMapView({ lat: village.lat, lng: village.lng, zoom: 14 });
            router.push("/journey?showAll=1&walkthrough=skip");
          }}
        >
          View on the interactive map →
        </Link>
      )}
    </div>
  );
}

function TodayStopRow({ stop }: { stop: TodayStop }) {
  return (
    <div className="hero-today-row">
      <div className="hero-today-row-time">
        <div className="hero-today-row-clock">{formatClockTime(stop.arriveMinutes)}</div>
        <div className="hero-today-row-label">{stop.label}</div>
      </div>
      <div className="hero-today-row-body">
        <div className="hero-today-row-top">
          <span className="hero-today-row-name">{stop.name}</span>
          {stop.kind === "distillery" && (
            <Link href={stop.href} className="hero-today-row-check">
              Check →
            </Link>
          )}
        </div>
        <div className="hero-today-row-meta">{stop.meta}</div>
      </div>
    </div>
  );
}
