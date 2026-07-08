"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────────────────
// A real spotlight walkthrough, not a modal: the page behind it darkens
// everywhere except a cutout around the actual UI element each step is
// talking about, with a pulsing marker on that spot. Critically, the dark
// layer has pointer-events: none - it's purely visual. Nothing it renders
// can block a click on the map, a pin, the sidebar, or the nav underneath,
// so this can never trap someone the way a locked modal would. Only the
// small caption card's own buttons (Next/Skip/Got it/×) are interactive.
//
// Targets real DOM elements by id (set in Workspace.tsx): the map canvas
// for steps 1-2 (both the "tap a distillery" and "add to journey" actions
// happen inside the map/its popups), the itinerary sidebar for step 3,
// and the "Distilleries" nav link for step 4.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v2";

const STEPS = [
  { icon: "🥃", text: "Tap a distillery to see details", targetId: "onboard-map" },
  { icon: "➕", text: "Add it to your Journey", targetId: "onboard-map" },
  { icon: "🗺️", text: "See your route, timings, and running cost on the left", targetId: "onboard-sidebar" },
  { icon: "⚖️", text: "Compare distilleries anytime from the menu", targetId: "onboard-nav-distilleries" },
];

function subscribe(): () => void {
  return () => {};
}
function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}
function getServerSnapshot(): boolean {
  return true; // treat as "already seen" during SSR, so nothing flashes before hydration
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export default function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = !alreadySeen && !dismissed;

  useEffect(() => {
    if (!active) return;

    function updateRect() {
      const el = document.getElementById(STEPS[step].targetId);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, step]);

  if (!active) return null;

  function dismiss() {
    setDismissed(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Darkened layer with a cutout over the current target - purely
          visual, pointer-events: none, so it never blocks a real click. */}
      <div className="onboarding-dark-layer" aria-hidden="true">
        {rect && (
          <div
            className="onboarding-cutout"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        )}
      </div>

      {/* Pulsing marker centered on the target, pointing at where to look/click. */}
      {rect && (
        <div
          className="onboarding-marker"
          style={{ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 }}
          aria-hidden="true"
        >
          <span className="onboarding-marker-ping" />
          <span className="onboarding-marker-dot" />
        </div>
      )}

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
    </>
  );
}
