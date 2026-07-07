"use client";

import { useState, useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────────────────
// Deliberately NOT a modal: no backdrop, no dimming, no blocking the page
// underneath - the person can click the map or anything else while this is
// showing. It's a small floating card, dismissible at any step, that
// remembers it's been seen (localStorage) so it never reappears after the
// first visit unless the version number below is bumped for a future
// rewrite of the steps.
//
// Reads localStorage via useSyncExternalStore rather than a
// useEffect+setState pair - the correct tool for reading external,
// client-only state without a server/client hydration mismatch (the
// server snapshot is always "not seen yet = false" so nothing renders
// during SSR, then the real client value takes over post-hydration).
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v1";

function subscribe(): () => void {
  return () => {}; // localStorage doesn't push updates - a one-time read is all this needs
}
function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}
function getServerSnapshot(): boolean {
  return true; // treat as "already seen" during SSR, so nothing flashes before hydration
}

const STEPS = [
  { icon: "🥃", text: "Tap a distillery to see details" },
  { icon: "➕", text: "Add it to your Journey" },
  { icon: "🗺️", text: "See your route, timings, and running cost on the left" },
  { icon: "⚖️", text: "Compare distilleries anytime from the menu" },
];

export default function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function dismiss() {
    setDismissed(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  if (alreadySeen || dismissed) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding-card" role="dialog" aria-label="Quick tour">
      <button className="onboarding-dismiss" onClick={dismiss} aria-label="Dismiss">
        &times;
      </button>
      <div className="onboarding-icon">{STEPS[step].icon}</div>
      <p className="onboarding-text">{STEPS[step].text}</p>
      <div className="onboarding-footer">
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={"onboarding-dot" + (i === step ? " active" : "")} />
          ))}
        </div>
        <div className="onboarding-actions">
          {!isLast && (
            <button className="onboarding-skip" onClick={dismiss}>
              Skip
            </button>
          )}
          <button className="onboarding-next" onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}>
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
