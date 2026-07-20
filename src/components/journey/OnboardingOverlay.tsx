"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { TripTiming } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Rebuilt 19 July 2026: a fixed, always-in-the-same-place explainer box
// (bottom-center by default, moving to bottom-right from the "customise a
// day, or build your own" step onward) plus a separate gold dot that
// travels independently to whatever the current step is talking about.
// No full-screen darkening/cutout - the dot alone is the indicator, so
// the real page stays fully visible and interactive underneath at all
// times (nothing here has ever blocked a real click, before or after
// this rebuild).
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v9";
const BOWMORE_SELECTOR = '[data-distillery-slug="bowmore"]';

interface DotTarget {
  selector?: string;
  id?: string;
}

interface Step {
  icon: string;
  text: string;
  /** Omit for a step with no specific target (e.g. the opening line,
   *  before the dot first appears). */
  dot?: DotTarget;
  openPopupSlug?: string;
  /** If the person actually performs the real action being demonstrated
   *  (clicks the real pin, the real "+Add" button, the real toolbar
   *  button) rather than clicking the tour's own "Next", the tour
   *  advances too. */
  advanceOn?: DotTarget;
  /** Where the fixed explainer box sits for this step. Defaults to
   *  "center" (bottom-center) if omitted. */
  boxPosition?: "center" | "right";
}

const TRIP_SO_FAR_STEP: Step = {
  icon: "🗺️",
  text: "Your trip so far — see your day come to life.",
};

const EXPAND_STOP_STEP: Step = {
  icon: "🔎",
  text: "Expand a stop to see the details.",
  dot: { id: "onboard-first-stop-collapse" },
  advanceOn: { id: "onboard-first-stop-collapse" },
};

const JOURNEY_TIME_STEP: Step = {
  icon: "⏱️",
  text: "See your total journey time.",
  dot: { id: "onboard-journey-summary" },
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
  dot: { id: "onboard-nav-days-hub" }, // TODO: id doesn't exist yet
  advanceOn: { id: "onboard-nav-days-hub" },
};

// Skipped for "today" visitors - there's no date control to point at
// (the header shows a static "📅 Today" badge instead), and picking
// travel dates isn't a relevant action for someone visiting today anyway.
const DATES_STEP: Step = {
  icon: "📅",
  text: "Pick your dates.",
  dot: { id: "onboard-header-dates" },
};

const ACCOMMODATION_STEP: Step = {
  icon: "🛏️",
  text: "Book your stay.",
  dot: { selector: '[data-category-id="places-to-stay"]' },
  advanceOn: { selector: '[data-category-id="places-to-stay"]' },
};

// Transition line + explainer box moves to bottom-right from here on.
const DISTILLERY_STEP: Step = {
  icon: "🥃",
  text: "...to customise a day, or totally build your own — tap any distillery to see details, then add it to your trip yourself.",
  dot: { selector: BOWMORE_SELECTOR },
  openPopupSlug: "bowmore",
  advanceOn: { selector: '[data-add-distillery="bowmore"]' },
  boxPosition: "right",
};

const LOCAL_FEATURES_HUB_STEP: Step = {
  icon: "🌊",
  text: "Explore local features.",
  dot: { id: "onboard-nav-local-features" },
  advanceOn: { id: "onboard-nav-local-features" },
  boxPosition: "right",
};

const LOCAL_FEATURES_OVERLAY_STEP: Step = {
  icon: "🌿",
  text: "...or see them right on the map.",
  dot: { selector: '[data-category-id="natural-features"]' },
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

function toRect(r: DOMRect): Rect {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function OnboardingOverlay({ timing }: { timing: TripTiming }) {
  const STEPS = useMemo(() => buildSteps(timing), [timing]);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [dotRect, setDotRect] = useState<Rect | null>(null);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = !alreadySeen && !dismissed;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (!active) return;

    function update() {
      if (!currentStep.dot) {
        setDotRect(null);
        return;
      }
      const el = findElement(currentStep.dot);
      setDotRect(el ? toRect(el.getBoundingClientRect()) : null);
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // Targets can mount a beat after this component does (map markers,
    // popup opening) - retry briefly rather than giving up on one query.
    const retry = setInterval(update, 300);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(retry);
    };
  }, [active, step, currentStep]);

  // Opens/closes Bowmore's real popup to match the step that talks about
  // adding it to the journey.
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

  // Following through on the real action advances the tour too, not just
  // clicking the tour's own "Next" - delegated at the document level so
  // it still works even if the target element mounts after this effect
  // runs (a popup's "+Add" button, for instance).
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
