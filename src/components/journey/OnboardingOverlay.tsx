"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { TripTiming } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Second rebuild, 19 July 2026 (same day as the first - the first attempt
// dropped the darkening entirely in favour of a bare gold dot, which
// turned out to be the wrong call). Current design:
// - The page darkens everywhere except a spotlight cutout around
//   whatever the current step is talking about (a pin, a stop row, a
//   toolbar button) - same mechanism the original walkthrough used.
// - A gold pulsing dot sits on/near the cutout as an extra cue.
// - The explainer box itself is FIXED (doesn't follow the cutout around
//   the page) - genuinely centered on screen by default, moving to
//   bottom-right from the "customise a day, or build your own" step
//   onward.
// - Some steps actually PERFORM the real action themselves (expand the
//   first stop, open Bowmore's popup) so the visitor watches it happen,
//   rather than just being told where to click.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v10";
const BOWMORE_SELECTOR = '[data-distillery-slug="bowmore"]';
const PIN_SPOTLIGHT_DIAMETER = 110;
const RECT_PADDING = 8;

interface CutoutTarget {
  selector?: string;
  id?: string;
  shape: "circle" | "rect";
  /** Once Bowmore's popup is open, expand the cutout to cover both the
   *  pin and the popup together (as one combined rect), not just the
   *  tiny pin. */
  includePopupFor?: string;
}

interface Step {
  icon: string;
  text: string;
  cutout?: CutoutTarget;
  openPopupSlug?: string;
  /** Dispatched once when this step becomes active - lets the step
   *  perform the real action itself (e.g. expanding the first stop) so
   *  the visitor sees it done, not just pointed at. Not reversed when
   *  leaving the step - the result should stay visible afterward. */
  autoActionEvent?: string;
  /** If the person actually performs the real action being demonstrated
   *  (clicks the real pin, the real toolbar button) rather than clicking
   *  the tour's own "Next", the tour advances too. */
  advanceOn?: { selector?: string; id?: string };
  /** Where the fixed explainer box sits for this step. Defaults to
   *  "center" (genuinely centered on screen) if omitted. */
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
};

const JOURNEY_TIME_STEP: Step = {
  icon: "⏱️",
  text: "See your total journey time.",
  cutout: { id: "onboard-journey-summary", shape: "rect" },
  autoActionEvent: "onboarding:expand-journey-summary",
  advanceOn: { id: "onboard-journey-summary" },
};

// Placeholder target - there's no live Days Hub nav link yet (as of 19
// July 2026, the Hub isn't in live navigation, per the agreed sequencing
// of finishing infrastructure/content before go-live). This step can't
// actually be wired up until that link exists. Flagged rather than
// pointing at nothing or fabricating a fake target.
const ADD_DAYS_STEP: Step = {
  icon: "📖",
  text: "Explore and add more days here.",
  cutout: { id: "onboard-nav-days-hub", shape: "rect" }, // TODO: id doesn't exist yet
  advanceOn: { id: "onboard-nav-days-hub" },
};

// Skipped for "today" visitors - there's no date control to point at
// (the header shows a static "📅 Today" badge instead), and picking
// travel dates isn't a relevant action for someone visiting today anyway.
const DATES_STEP: Step = {
  icon: "📅",
  text: "Pick your dates.",
  cutout: { id: "onboard-header-dates", shape: "rect" },
};

const ACCOMMODATION_STEP: Step = {
  icon: "🛏️",
  text: "Book your stay.",
  cutout: { id: "onboard-toolbar-row", shape: "rect" },
  advanceOn: { selector: '[data-category-id="places-to-stay"]' },
};

// Transition line + explainer box moves to bottom-right from here on.
const DISTILLERY_STEP: Step = {
  icon: "🥃",
  text: "...to customise a day, or totally build your own — tap any distillery to see details, then add it to your trip yourself.",
  cutout: { selector: BOWMORE_SELECTOR, shape: "circle", includePopupFor: "bowmore" },
  openPopupSlug: "bowmore",
  advanceOn: { selector: '[data-add-distillery="bowmore"]' },
  boxPosition: "right",
};

const LOCAL_FEATURES_HUB_STEP: Step = {
  icon: "🌊",
  text: "Explore local features.",
  cutout: { id: "onboard-nav-local-features", shape: "rect" },
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
  steps.push(ACCOMMODATION_STEP, DISTILLERY_STEP, LOCAL_FEATURES_HUB_STEP, LOCAL_FEATURES_OVERLAY_STEP);
  return steps;
}

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
  const [cutoutRect, setCutoutRect] = useState<Rect | null>(null);
  const [cutoutIsCircle, setCutoutIsCircle] = useState(false);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = !alreadySeen && !dismissed;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (!active) return;

    function update() {
      if (!currentStep.cutout) {
        setCutoutRect(null);
        return;
      }
      const el = findElement(currentStep.cutout);
      let resolvedCutout: Rect | null = null;
      let isCircle = false;

      if (el) {
        const r = el.getBoundingClientRect();
        if (currentStep.cutout!.shape === "circle") {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          resolvedCutout = {
            top: cy - PIN_SPOTLIGHT_DIAMETER / 2,
            left: cx - PIN_SPOTLIGHT_DIAMETER / 2,
            width: PIN_SPOTLIGHT_DIAMETER,
            height: PIN_SPOTLIGHT_DIAMETER,
          };
          isCircle = true;

          if (currentStep.cutout!.includePopupFor) {
            const popupEl = document.querySelector(".leaflet-popup");
            if (popupEl) {
              resolvedCutout = unionRect(resolvedCutout, toRect(popupEl.getBoundingClientRect(), RECT_PADDING));
              isCircle = false;
            }
          }
        } else {
          resolvedCutout = toRect(r, RECT_PADDING);
        }
      }

      setCutoutRect(resolvedCutout);
      setCutoutIsCircle(isCircle);
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

  // Opens/closes Bowmore's real popup, and/or fires this step's own
  // auto-action (e.g. expanding the first stop) - both let the visitor
  // watch the real thing happen rather than just being told where to
  // click. Auto-actions are deliberately not reversed on cleanup - their
  // result should stay visible into later steps too.
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
    };
  }, [active, currentStep]);

  // Following through on the real action advances the tour too, not just
  // clicking the tour's own "Next".
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
      <div className="onboarding-dark-layer" aria-hidden="true" />

      {cutoutRect && (
        <div
          className={"onboarding-highlight" + (cutoutIsCircle ? " onboarding-highlight-circle" : "")}
          style={{ top: cutoutRect.top, left: cutoutRect.left, width: cutoutRect.width, height: cutoutRect.height }}
          aria-hidden="true"
        />
      )}

      {cutoutRect && (
        <div
          className="onboarding-marker"
          style={{ top: cutoutRect.top + cutoutRect.height / 2, left: cutoutRect.left + cutoutRect.width / 2 }}
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
