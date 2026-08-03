"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBackgroundVideoStepState } from "@/lib/background-video-context";

/**
 * The single, persistent background video for the intake experience -
 * homepage Hero plus the /journey question screens (TodayLocationStep,
 * and the currently-inactivated LocationStep/InterestsStep, kept ready
 * for when a second region reactivates them - see JourneyFlow).
 *
 * Rendered ONCE here in the root layout, not per-screen. Next's App
 * Router keeps a shared layout mounted across client-side navigations
 * between routes that use it, and Hero already moves to /journey via
 * router.push (a soft navigation) - so this single <video> element
 * survives that hop (and the reverse) without unmounting. That fixes the
 * old "video restarts on every screen transition" problem at the root,
 * rather than working around it with a static-image stand-in (see the
 * former BackgroundImage.tsx, since removed).
 *
 * Visibility is the AND of two independent signals:
 * - stepVisible (BackgroundVideoContext) - set by whichever screen
 *   currently wants it shown, unset by Workspace.
 * - routeAllows (this component's own pathname check) - a safety net so
 *   the video is never actually playing or visible on any other route,
 *   regardless of stale context state (e.g. leaving via the header logo
 *   or a distillery link without Workspace's cleanup running first).
 *
 * Paused (not unmounted) when hidden, and resumed (not restarted) when
 * shown again - so Hero -> today-location genuinely continues the same
 * loop mid-way through, rather than two independently-timed plays of the
 * same file that happen to line up by coincidence.
 */
export default function SiteBackgroundVideo() {
  const pathname = usePathname();
  const stepVisible = useBackgroundVideoStepState();
  const videoRef = useRef<HTMLVideoElement>(null);

  const routeAllows = pathname === "/" || pathname === "/journey";
  const visible = routeAllows && stepVisible;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (visible) {
      // play() returns a Promise that rejects if interrupted by a fast
      // subsequent pause (e.g. rapid step changes right after
      // navigation) - safe to ignore, the pause/play calls themselves
      // are what matters, not this promise settling.
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [visible]);

  return (
    <video
      ref={videoRef}
      className="site-background-video"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
      tabIndex={-1}
      muted
      loop
      playsInline
      preload="auto"
      poster="https://images.pexels.com/videos/13610011/alcohol-bar-drink-drinks-13610011.jpeg?auto=compress&cs=tinysrgb&w=1920"
    >
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  );
}
