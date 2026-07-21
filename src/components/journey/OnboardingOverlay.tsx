"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { TripTiming } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Third pass, 19 July 2026 (same day). Current design, refined again per
// screenshot feedback:
// - A single "highlight" element does the darkening AND the reveal in
//   one go, via a huge box-shadow spread (the classic spotlight-cutout
//   trick) - not a separate always-on dark layer plus a tinted box.
//   The revealed area shows through at full brightness, with a gold
//   border wrapped around it.
// - The pulsing gold dot is reserved for CIRCLE targets (map pins)
//   only - rect targets (panels, buttons, rows) rely on the border
//   alone, no dot.
// - For the demo distillery step, once the real popup opens, the
//   highlight itself expands to cover pin + popup together (so the
//   popup text is legible, not dark) - but the dot stays anchored to
//   the pin's own center throughout, not drifting to the merged rect's
//   center.
// - The explainer box is fixed (doesn't follow the page), genuinely
//   centered by default, moving to bottom-right from the "customise a
//   day, or build your own" step onward.
// - Some steps perform the real action themselves (expand the first
//   stop, expand the journey summary, open the demo distillery's popup)
//   so the visitor watches it happen.
//
// 21 July 2026: demo pin switched from Bowmore to Port Ellen distillery,
// since the map now opens zoomed to the default day's Port Ellen-area
// route (Laphroaig/Lagavulin/Ardbeg) rather than the island-wide view -
// Bowmore would be off-screen at that zoom. Storage key bumped so
// returning visitors see the corrected walkthrough at least once.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v12";
const DEMO_DISTILLERY_SLUG = "port-ellen";
const DEMO_DISTILLERY_SELECTOR = `[data-distillery-slug="${DEMO_DISTILLERY_SLUG}"]`;
const PIN_SPOTLIGHT_DIAMETER = 110;
const RECT_PADDING = 8;

interface CutoutTarget {
  selector?: string;
  id?: string;
  shape: "circle" | "rect";
  /** Once the demo distillery's popup is open, expand the highlight to
   *  cover both the pin and the popup together (as one combined rect) -
   *  but the dot itself stays pinned to the original pin position,
   *  computed separately below. */
  includePopupFor?: string;
  /** Union this target's rect with another element's rect too - e.g.
   *  the "explore all distilleries and local features" step highlights
   *  both nav links together, not just one. */
  alsoInclude?: { selector?: string; id?: string };
}

interface Step {
  icon: string;
  text: string;
  cutout?: CutoutTarget;
  openPopupSlug?: string;
  /** Dispatched once when this step becomes active - lets the step
   *  perform the real action itself so the visitor sees it done. */
  autoActionEvent?: string;
  /** Dispatched when leaving this step - reverses the auto-action (e.g.
   *  collapsing the stop/summary back down), mirroring how the demo
   *  distillery's popup closes again on cleanup. Per 19 July 2026
   *  feedback: unlike the first pass, the result should NOT stay
   *  visible into later steps. */
  autoActionReverseEvent?: string;
  advanceOn?: { selector?: string; id?: string };
  boxPosition?: "center" | "right";
}

const TRIP_SO_FAR_STEP: Step = {
  icon: "🗺️",
  text: "Your trip so far — see your day come to life.",
  cutout: { id: "onboard-sidebar", shape: "rect" },
};

const EXPAND_STOP_STEP: Step = {
  icon: "🔎",
  text: "Expand a stop to see the details.",
  cutout: { id: "onboard-first-stop", shape: "rect" },
  autoActionEvent: "onboarding:expand-first-stop",
  autoActionReverseEvent: "onboarding:collapse-first-stop",
};

const JOURNEY_TIME_STEP: Step = {
  icon: "⏱️",
  text: "See your total journey time.",
  cutout: { id: "onboard-journey-summary-panel", shape: "rect" },
  autoActionEvent: "onboarding:expand-journey-summary",
  autoActionReverseEvent: "onboarding:collapse-journey-summary",
  advanceOn: { id: "onboard-journey-summary" },
};

// Placeholder target - there's no live Days Hub nav link yet (as of 19
// July 2026, the Hub isn't in live navigation, per the agreed sequencing
// of finishing infrastructure/content before go-live). Flagged rather
// than pointing at nothing or fabricating a fake target.
const ADD_DAYS_STEP: Step = {
  icon: "📖",
  text: "Explore and add more days here.",
  cutout: { id: "onboard-nav-days-hub", shape: "rect" }, // TODO: id doesn't exist yet
  advanceOn: { id: "onboard-nav-days-hub" },
};

// Skipped for "today" visitors - there's no date control to point at.
const DATES_STEP: Step = {
  icon: "📅",
  text: "Pick your dates.",
  cutout: { id: "onboard-header-dates", shape: "rect" },
};

const ACCOMMODATION_STEP: Step = {
  icon: "🛏️",
  text: "Book your stay.",
  cutout: { selector: '[data-category-id="places-to-stay"]', shape: "rect" },
  advanceOn: { selector: '[data-category-id="places-to-stay"]' },
};

// Split into two steps 21 July 2026 (per feedback - was one bubble
// doing two jobs). Transition line + explainer box moves to
// bottom-right from here on; no cutout of its own, just narration
// ahead of the real pointer-at-a-distillery step that follows.
const CUSTOMISE_STEP: Step = {
  icon: "🥃",
  text: "...to customise a day, or totally build your own.",
  boxPosition: "right",
};

const DISTILLERY_STEP: Step = {
  icon: "🥃",
  text: "...tap any distillery to see details, then add it to your trip yourself.",
  cutout: { selector: DEMO_DISTILLERY_SELECTOR, shape: "circle", includePopupFor: DEMO_DISTILLERY_SLUG },
  openPopupSlug: DEMO_DISTILLERY_SLUG,
  advanceOn: { selector: `[data-add-distillery="${DEMO_DISTILLERY_SLUG}"]` },
  boxPosition: "right",
};

const LOCAL_FEATURES_HUB_STEP: Step = {
  icon: "🌊",
  text: "Explore all distilleries and local features.",
  cutout: { id: "onboard-nav-local-features", shape: "rect", alsoInclude: { id: "onboard-nav-distilleries" } },
  advanceOn: { id: "onboard-nav-local-features" },
  boxPosition: "right",
};

const LOCAL_FEATURES_OVERLAY_STEP: Step = {
  icon: "🌿",
  text: "...or see them right on the map.",
  cutout: { id: "onboard-toolbar-row", shape: "rect" },
  advanceOn: { selector: '[data-category-id="natural-features"]' },
  boxPosition: "right",
};

function buildSteps(timing: TripTiming): Step[] {
  const steps: Step[] = [];
  if (timing !== "today") steps.push(TRIP_SO_FAR_STEP);
  steps.push(EXPAND_STOP_STEP, JOURNEY_TIME_STEP, ADD_DAYS_STEP);
  if (timing !== "today") steps.push(DATES_STEP);
  steps.push(ACCOMMODATION_STEP, CUSTOMISE_STEP, DISTILLERY_STEP, LOCAL_FEATURES_HUB_STEP, LOCAL_FEATURES_OVERLAY_STEP);
  return steps;
}

function subscribe(): () => void {
  return () => {};
}
function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}
function getServerSnapshot(): boolean {
  return true;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findElement(target: { selector?: string; id?: string }): Element | null {
  if (target.selector) return document.querySelector(target.selector);
  if (target.id) return document.getElementById(target.id);
  return null;
}

function toRect(r: DOMRect, padding = 0): Rect {
  return { top: r.top - padding, left: r.left - padding, width: r.width + padding * 2, height: r.height + padding * 2 };
}

function unionRect(a: Rect, b: Rect): Rect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

export default function OnboardingOverlay({ timing }: { timing: TripTiming }) {
  const STEPS = useMemo(() => buildSteps(timing), [timing]);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const [highlightIsCircle, setHighlightIsCircle] = useState(false);
  const [dotRect, setDotRect] = useState<Rect | null>(null);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = !alreadySeen && !dismissed;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (!active) return;

    function update() {
      if (!currentStep.cutout) {
        setHighlightRect(null);
        setDotRect(null);
        return;
      }
      const el = findElement(currentStep.cutout);
      if (!el) {
        setHighlightRect(null);
        setDotRect(null);
        return;
      }

      const r = el.getBoundingClientRect();
      let resolved: Rect;
      let isCircle = false;
      let dot: Rect | null = null;

      if (currentStep.cutout.shape === "circle") {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        resolved = {
          top: cy - PIN_SPOTLIGHT_DIAMETER / 2,
          left: cx - PIN_SPOTLIGHT_DIAMETER / 2,
          width: PIN_SPOTLIGHT_DIAMETER,
          height: PIN_SPOTLIGHT_DIAMETER,
        };
        isCircle = true;
        // The dot always stays anchored to the pin's own center, even if
        // the highlight itself grows to include a popup below.
        dot = resolved;

        if (currentStep.cutout.includePopupFor) {
          const popupEl = document.querySelector(".leaflet-popup");
          if (popupEl) {
            resolved = unionRect(resolved, toRect(popupEl.getBoundingClientRect(), RECT_PADDING));
            isCircle = false;
          }
        }
      } else {
        resolved = toRect(r, RECT_PADDING);
        if (currentStep.cutout.alsoInclude) {
          const otherEl = findElement(currentStep.cutout.alsoInclude);
          if (otherEl) {
            resolved = unionRect(resolved, toRect(otherEl.getBoundingClientRect(), RECT_PADDING));
          }
        }
      }

      setHighlightRect(resolved);
      setHighlightIsCircle(isCircle);
      setDotRect(dot);
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const retry = setInterval(update, 300);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(retry);
    };
  }, [active, step, currentStep]);

  useEffect(() => {
    if (!active) return;
    if (currentStep.openPopupSlug) {
      window.dispatchEvent(
        new CustomEvent("onboarding:open-distillery-popup", { detail: { slug: currentStep.openPopupSlug } })
      );
    }
    if (currentStep.autoActionEvent) {
      window.dispatchEvent(new CustomEvent(currentStep.autoActionEvent));
    }
    return () => {
      if (currentStep.openPopupSlug) {
        window.dispatchEvent(
          new CustomEvent("onboarding:close-distillery-popup", { detail: { slug: currentStep.openPopupSlug } })
        );
      }
      if (currentStep.autoActionReverseEvent) {
        window.dispatchEvent(new CustomEvent(currentStep.autoActionReverseEvent));
      }
    };
  }, [active, currentStep]);

  useEffect(() => {
    if (!active || !currentStep.advanceOn) return;
    const { selector, id } = currentStep.advanceOn;
    const matchSelector = selector ?? (id ? `#${id}` : null);
    if (!matchSelector) return;

    function handleClick(e: MouseEvent) {
      if ((e.target as HTMLElement).closest(matchSelector!)) {
        if (step === STEPS.length - 1) {
          setDismissed(true);
          window.localStorage.setItem(STORAGE_KEY, "1");
        } else {
          setStep((s) => s + 1);
        }
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [active, step, currentStep, STEPS.length]);

  if (!active) return null;

  function dismiss() {
    setDismissed(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  const isLast = step === STEPS.length - 1;
  const boxPosition = currentStep.boxPosition ?? "center";

  return (
    <>
      {highlightRect ? (
        <div
          className={"onboarding-highlight" + (highlightIsCircle ? " onboarding-highlight-circle" : "")}
          style={{ top: highlightRect.top, left: highlightRect.left, width: highlightRect.width, height: highlightRect.height }}
          aria-hidden="true"
        />
      ) : (
        <div className="onboarding-dark-layer" aria-hidden="true" />
      )}

      {dotRect && (
        <div
          className="onboarding-marker"
          style={{ top: dotRect.top + dotRect.height / 2, left: dotRect.left + dotRect.width / 2 }}
          aria-hidden="true"
        >
          <span className="onboarding-marker-ping" />
          <span className="onboarding-marker-dot" />
        </div>
      )}

      <div
        className={"onboarding-card onboarding-card-fixed" + (boxPosition === "right" ? " onboarding-card-right" : " onboarding-card-center")}
        role="dialog"
        aria-label="Your Trip, Ready to Go"
      >
        <button className="onboarding-dismiss" onClick={dismiss} aria-label="Dismiss">
          &times;
        </button>
        <div className="onboarding-heading">Your Trip, Ready to Go</div>
        <div className="onboarding-icon">{currentStep.icon}</div>
        <p className="onboarding-text">{currentStep.text}</p>
        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={"onboarding-dot" + (i === step ? " active" : "")} />
            ))}
          </div>
          <div className="onboarding-actions">
            {step > 0 && (
              <button className="onboarding-back" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
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
