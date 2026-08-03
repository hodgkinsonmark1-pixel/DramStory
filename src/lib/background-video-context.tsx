"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface BackgroundVideoContextValue {
  stepVisible: boolean;
  setStepVisible: (visible: boolean) => void;
}

const BackgroundVideoContext = createContext<BackgroundVideoContextValue | null>(null);

/**
 * Shared visibility state for the single persistent hero/intake background
 * video (see SiteBackgroundVideo for the full reasoning). Defaults to
 * visible=true since the homepage Hero - the site's actual entry point -
 * wants it showing from first paint; Workspace (the map step) is the one
 * place that explicitly turns it off.
 */
export function BackgroundVideoProvider({ children }: { children: React.ReactNode }) {
  const [stepVisible, setStepVisible] = useState(true);
  return (
    <BackgroundVideoContext.Provider value={{ stepVisible, setStepVisible }}>
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
