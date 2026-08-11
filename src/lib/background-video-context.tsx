"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface BackgroundVideoContextValue {
  stepVisible: boolean;
  setStepVisible: (visible: boolean) => void;
  maskWidthPx: number | null;
  setMaskWidthPx: (widthPx: number | null) => void;
}

const BackgroundVideoContext = createContext<BackgroundVideoContextValue | null>(null);

/**
 * Shared visibility state for the single persistent hero/intake background
 * video (see SiteBackgroundVideo for the full reasoning). Defaults to
 * visible=true since the homepage Hero - the site's actual entry point -
 * wants it showing from first paint; Workspace (the map step) is the one
 * place that explicitly turns it off.
 *
 * maskWidthPx (docs/hero-handoff.md §2.2/§2.3) is the second signal added
 * for the hero's state-two reflow: null means full-bleed (state one, or
 * any other screen), a pixel width narrows the video to that many pixels
 * from the left via clip-path (see SiteBackgroundVideo) - "masked, not
 * swapped, never cuts", i.e. the same single <video> keeps playing
 * underneath, only the visible region changes.
 */
export function BackgroundVideoProvider({ children }: { children: React.ReactNode }) {
  const [stepVisible, setStepVisible] = useState(true);
  const [maskWidthPx, setMaskWidthPx] = useState<number | null>(null);
  return (
    <BackgroundVideoContext.Provider value={{ stepVisible, setStepVisible, maskWidthPx, setMaskWidthPx }}>
      {children}
    </BackgroundVideoContext.Provider>
  );
}

function useBackgroundVideoContext() {
  const ctx = useContext(BackgroundVideoContext);
  if (!ctx) {
    throw new Error("useBackgroundVideoContext must be used within a BackgroundVideoProvider");
  }
  return ctx;
}

/**
 * Call from any screen that wants the shared background video shown while
 * it's mounted (Hero, TodayLocationStep, LocationStep, InterestsStep) - or
 * with `false` from a screen that should actively hide it (Workspace).
 *
 * Deliberately just a visibility flag, not mount/unmount of the video
 * itself - SiteBackgroundVideo lives once in the root layout and stays
 * mounted the whole time, so toggling this only pauses/fades it rather
 * than tearing it down and restarting the loop from frame zero.
 */
export function useBackgroundVideoVisible(visible: boolean) {
  const { setStepVisible } = useBackgroundVideoContext();
  useEffect(() => {
    setStepVisible(visible);
  }, [setStepVisible, visible]);
}

/** Read-only access for SiteBackgroundVideo itself. */
export function useBackgroundVideoStepState() {
  return useBackgroundVideoContext().stepVisible;
}

/**
 * Call from Hero while its state-two reflow is showing (planning only,
 * docs/hero-handoff.md §9 Phase 2) with the left panel's width in pixels,
 * or `null` when state one (or any other timeframe without a built
 * reflow yet) applies. Resets to null on unmount so leaving "/" doesn't
 * leave a stale mask behind for whatever screen the video is next shown
 * on - same defensive reasoning as useBackgroundVideoVisible not being
 * the sole gate (SiteBackgroundVideo's own routeAllows check).
 */
export function useBackgroundVideoMask(widthPx: number | null) {
  const { setMaskWidthPx } = useBackgroundVideoContext();
  useEffect(() => {
    setMaskWidthPx(widthPx);
    return () => setMaskWidthPx(null);
  }, [setMaskWidthPx, widthPx]);
}

/** Read-only access for SiteBackgroundVideo itself. */
export function useBackgroundVideoMaskState() {
  return useBackgroundVideoContext().maskWidthPx;
}
