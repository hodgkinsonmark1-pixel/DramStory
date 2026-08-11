"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBackgroundVideoStepState, useBackgroundVideoMaskState } from "@/lib/background-video-context";

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
  const maskWidthPx = useBackgroundVideoMaskState();
  const videoRef = useRef<HTMLVideoElement>(null);

  const routeAllows = pathname === "/" || pathname === "/journey";
  const visible = routeAllows && stepVisible;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!visible) {
      el.pause();
      return;
    }
    // play() returns a Promise that rejects if interrupted by a fast
    // subsequent pause (e.g. rapid step changes right after
    // navigation) - safe to ignore, the pause/play calls themselves
    // are what matters, not this promise settling.
    const tryPlay = () => el.play().catch(() => {});
    tryPlay();
    // Belt-and-braces retries for the cases where that first attempt
    // can't actually start playback and nothing else would ever retry:
    // - Chrome defers the media fetch entirely while the page is hidden
    //   (background tab / hidden window), so a load that began hidden
    //   only progresses once the page becomes visible.
    // - Some environments (e.g. iOS Low Power Mode, battery savers)
    //   block even muted programmatic autoplay until a user gesture.
    const onVisibility = () => {
      if (!document.hidden && el.paused) tryPlay();
    };
    const onFirstPointer = () => {
      if (el.paused) tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onFirstPointer, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onFirstPointer);
    };
  }, [visible]);

  return (
    <>
      {/* autoPlay lets the browser start the (muted, inline) loop as soon
          as enough data arrives, without waiting for hydration + the
          play() effect above - the effect remains the authority for
          pausing/resuming on step and route changes. */}
      <video
        ref={videoRef}
        // Hero's state-two reflow (docs/hero-handoff.md §2.2/§2.3): masks
        // the SAME playing video down to its left maskWidthPx rather than
        // swapping in a cropped clip or a static frame - "masked, not
        // swapped, and never cuts". clip-path (not width, which would
        // change the video's own layout box and could affect other
        // absolutely-positioned siblings) - the element keeps its full
        // width and position, only the painted region changes, which is
        // also what makes this smoothly transition-able.
        className={"site-background-video" + (maskWidthPx != null ? " masked" : "")}
        style={{
          opacity: visible ? 1 : 0,
          ...(maskWidthPx != null ? { clipPath: `inset(0 calc(100% - ${maskWidthPx}px) 0 0)` } : {}),
        }}
        aria-hidden="true"
        tabIndex={-1}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        poster="https://images.pexels.com/videos/13610011/alcohol-bar-drink-drinks-13610011.jpeg?auto=compress&cs=tinysrgb&w=1920"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      {/* Base footage is Mark's own edit of "Laphroaig - Hollow By The Bay"
          by North Sea Air (dir. Graeme Maclean), Vimeo, licensed CC BY 3.0 -
          permits commercial use and derivative works, credit required.
          Shown/hidden in lockstep with the video itself (same `visible`),
          positioned the same way .journey-hero-credit is for photo credits
          elsewhere on the site. */}
      {visible && (
        <a
          className="site-background-video-credit"
          href="https://vimeo.com/117012900"
          target="_blank"
          rel="noreferrer"
        >
          Footage: "Hollow By The Bay" by North Sea Air (CC BY)
        </a>
      )}
    </>
  );
}
