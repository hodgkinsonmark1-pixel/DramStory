"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────────────────
// A real spotlight walkthrough, not a modal: the page behind it darkens
// everywhere except a cutout around the actual UI element each step is
// talking about, with a pulsing marker on that spot. The dark layer and
// cutout are pointer-events: none throughout - purely visual, never
// blocks a real click on the map, a pin, the sidebar, or the nav
// underneath.
//
// Steps 1-2 target the real Bowmore distillery marker specifically (via
// its data-distillery-slug attribute, set in MapCanvas.tsx) with a small
// circular spotlight, rather than the whole map region - a tighter,
// clearer "look exactly here" cue. Step 2 also opens Bowmore's real
// popup programmatically (via a custom event MapCanvas listens for) so
// "Add it to your Journey" shows the actual popup, not just a promise
// of one. Steps 3-4 keep the wider rectangular cutout over the sidebar
// and nav link, since those are whole-panel targets, not a single pin.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v3";
const BOWMORE_SELECTOR = '[data-distillery-slug="bowmore"]';
const PIN_SPOTLIGHT_DIAMETER = 110;

interface Step {
  icon: string;
  text: string;
  targetId?: string;
  targetSelector?: string;
  shape: "circle" | "rect";
  openPopupSlug?: string;
}

const STEPS: Step[] = [
  { icon: "🥃", text: "Tap a distillery to see details", targetSelector: BOWMORE_SELECTOR, shape: "circle" },
  {
    icon: "➕",
    text: "Add it to your Journey",
    targetSelector: BOWMORE_SELECTOR,
    shape: "circle",
    openPopupSlug: "bowmore",
  },
  { icon: "🗺️", text: "See your route, timings, and running cost on the left", targetId: "onboard-sidebar", shape: "rect" },
  { icon: "⚖️", text: "Compare distilleries anytime from the menu", targetId: "onboard-nav-distilleries", shape: "rect" },
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

const RECT_PADDING = 8;

function findTargetElement(step: Step): Element | null {
  if (step.targetSelector) return document.querySelector(step.targetSelector);
  if (step.targetId) return document.getElementById(step.targetId);
  return null;
}

export default function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = !alreadySeen && !dismissed;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (!active) return;

    function updateRect() {
      const el = findTargetElement(currentStep);
      if (!el) {
        // Bowmore's marker may not exist yet (map still mounting) or, for
        // a future non-Islay region, may never exist at all - fall back
        // to spotlighting the whole map rather than showing a fully dark
        // screen with nothing highlighted.
        const fallback = currentStep.shape === "circle" ? document.getElementById("onboard-map") : null;
        if (fallback) {
          const r = fallback.getBoundingClientRect();
          setUsingFallback(true);
          setRect({
            top: r.top - RECT_PADDING,
            left: r.left - RECT_PADDING,
            width: r.width + RECT_PADDING * 2,
            height: r.height + RECT_PADDING * 2,
          });
        } else {
          setRect(null);
        }
        return;
      }
      setUsingFallback(false);
      const r = el.getBoundingClientRect();
      if (currentStep.shape === "circle") {
        // Fixed-size spotlight centered on the target's actual center -
        // a real marker's own box is tiny (~32px), too small to read as
        // a deliberate "look here" spotlight at a comfortable size.
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        setRect({
          top: cy - PIN_SPOTLIGHT_DIAMETER / 2,
          left: cx - PIN_SPOTLIGHT_DIAMETER / 2,
          width: PIN_SPOTLIGHT_DIAMETER,
          height: PIN_SPOTLIGHT_DIAMETER,
        });
      } else {
        setRect({
          top: r.top - RECT_PADDING,
          left: r.left - RECT_PADDING,
          width: r.width + RECT_PADDING * 2,
          height: r.height + RECT_PADDING * 2,
        });
      }
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    // Bowmore's marker only exists once the map has actually mounted its
    // markers, which can happen a beat after this component does - retry
    // briefly rather than giving up on the first empty query.
    const retry = setInterval(updateRect, 300);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      clearInterval(retry);
    };
  }, [active, step, currentStep]);

  // Opens/closes Bowmore's real popup to match the step that talks about
  // adding it to the journey - and makes sure it's closed again on any
  // step that isn't explicitly asking for it open.
  useEffect(() => {
    if (!active) return;
    if (currentStep.openPopupSlug) {
      window.dispatchEvent(
        new CustomEvent("onboarding:open-distillery-popup", { detail: { slug: currentStep.openPopupSlug } })
      );
    }
    return () => {
      if (currentStep.openPopupSlug) {
        window.dispatchEvent(
          new CustomEvent("onboarding:close-distillery-popup", { detail: { slug: currentStep.openPopupSlug } })
        );
      }
    };
  }, [active, currentStep]);

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
            className={"onboarding-cutout" + (currentStep.shape === "circle" && !usingFallback ? " onboarding-cutout-circle" : "")}
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

      <div className="onboarding-card" role="dialog" aria-label="How to navigate">
        <button className="onboarding-dismiss" onClick={dismiss} aria-label="Dismiss">
          &times;
        </button>
        <div className="onboarding-heading">How to Navigate</div>
        <div className="onboarding-icon">{currentStep.icon}</div>
        <p className="onboarding-text">{currentStep.text}</p>
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
