"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Distillery, LocalFeature } from "@/lib/types";
import { AREAS } from "@/lib/areas";
import { buildTodaySchedule, formatClockTime, type TodayStop } from "@/lib/today-schedule";

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
  const [now, setNow] = useState<Date | null>(null);

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
          Nothing left that would comfortably finish before dark from here - worth checking tomorrow, or see what&apos;s
          nearby on the map.
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

      <Link href="/journey" className="hero-days-foot">
        View on the interactive map →
      </Link>
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
