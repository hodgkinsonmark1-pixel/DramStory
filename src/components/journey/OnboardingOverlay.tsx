"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { TripTiming } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// A real spotlight walkthrough, not a modal: the page behind it darkens
// everywhere except a cutout around the actual UI element each step is
// talking about, with a pulsing marker on that spot. The dark layer and
// cutout are pointer-events: none throughout - purely visual, never
// blocks a real click on the map, a pin, the sidebar, or the nav
// underneath.
//
// Two things are tracked separately per step, since they aren't always
// the same element:
// - the CUTOUT: what gets un-darkened (a pin, a popup, a whole panel)
// - the DOT: where the pulsing marker sits (defaults to the cutout's own
//   center, but for steps 6-7 the cutout is the whole toolbar row while
//   the dot points at one specific button within it)
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dramstory_onboarding_seen_v5";
const BOWMORE_SELECTOR = '[data-distillery-slug="bowmore"]';
const PIN_SPOTLIGHT_DIAMETER = 110;
const RECT_PADDING = 8;

interface CutoutTarget {
  selector?: string;
  id?: string;
  shape: "circle" | "rect";
  /** Step 2 only: once Bowmore's popup is open, expand the cutout to
   *  cover both the pin and the popup together (as one combined rect),
   *  not just the tiny pin - otherwise the popup itself sits outside the
   *  spotlight and reads as darkened-out. */
  includePopupFor?: string;
}

interface DotTarget {
  selector?: string;
  id?: string;
}

interface Step {
  icon: string;
  text: string;
  cutout: CutoutTarget;
  dot?: DotTarget; // omit to center the dot on the cutout itself
  openPopupSlug?: string;
  /** If the person actually performs the real action being demonstrated
   *  (clicks the real pin, the real "+Add" button, the real toolbar
   *  button) rather than clicking the tour's own "Next", the tour
   *  advances too - following through shouldn't leave someone stuck
   *  looking at a stale spotlight for an action they already took. */
  advanceOn?: DotTarget;
}

const BASE_STEPS: Step[] = [
  {
    icon: "🥃",
    text: "Tap a distillery to see details",
    cutout: { selector: BOWMORE_SELECTOR, shape: "circle" },
    advanceOn: { selector: BOWMORE_SELECTOR },
  },
  {
    icon: "➕",
    text: "Add it to your Journey",
    cutout: { selector: BOWMORE_SELECTOR, shape: "circle", includePopupFor: "bowmore" },
    openPopupSlug: "bowmore",
    advanceOn: { selector: '[data-add-distillery="bowmore"]' },
  },
  { icon: "🗺️", text: "See your route, timings, and running cost on the left", cutout: { id: "onboard-sidebar", shape: "rect" } },
  {
    icon: "⚖️",
    text: "Compare distilleries anytime from the menu",
    cutout: { id: "onboard-nav-distilleries", shape: "rect" },
    advanceOn: { id: "onboard-nav-distilleries" },
  },
  {
    icon: "🌿",
    text: "Click to see further things to explore",
    cutout: { id: "onboard-toolbar-row", shape: "rect" },
    dot: { selector: '[data-category-id="natural-features"]' },
    advanceOn: { selector: '[data-category-id="natural-features"]' },
  },
  {
    icon: "🥃",
    text: "Click Distilleries to return to main map",
    cutout: { id: "onboard-toolbar-row", shape: "rect" },
    dot: { selector: '[data-category-id="distilleries"]' },
    advanceOn: { selector: '[data-category-id="distilleries"]' },
  },
];

// Skipped for "today" visitors - there's no date control to point at
// (the header shows a static "📅 Today" badge instead), and picking
// travel dates isn't a relevant action for someone visiting today anyway.
const DATES_STEP: Step = {
  icon: "📅",
  text: "Select your travel dates",
  cutout: { id: "onboard-header-dates", shape: "rect" },
  dot: { selector: '[data-date-mode-btn="range"]' },
  advanceOn: { selector: '[data-date-mode-btn="range"]' },
};

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
  const STEPS = useMemo(() => (timing === "today" ? BASE_STEPS : [...BASE_STEPS, DATES_STEP]), [timing]);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [cutoutRect, setCutoutRect] = useState<Rect | null>(null);
  const [cutoutIsCircle, setCutoutIsCircle] = useState(false);
  const [dotRect, setDotRect] = useState<Rect | null>(null);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = !alreadySeen && !dismissed;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (!active) return;

    function update() {
      const el = findElement(currentStep.cutout);

      let resolvedCutout: Rect | null = null;
      let isCircle = false;

      if (el) {
        const r = el.getBoundingClientRect();
        if (currentStep.cutout.shape === "circle") {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          resolvedCutout = {
            top: cy - PIN_SPOTLIGHT_DIAMETER / 2,
            left: cx - PIN_SPOTLIGHT_DIAMETER / 2,
            width: PIN_SPOTLIGHT_DIAMETER,
            height: PIN_SPOTLIGHT_DIAMETER,
          };
          isCircle = true;

          // Step 2: once the popup is actually open, expand the cutout to
          // cover both pin and popup as one combined rounded-rect region.
          if (currentStep.cutout.includePopupFor) {
            const popupEl = document.querySelector(".leaflet-popup");
            if (popupEl) {
              resolvedCutout = unionRect(resolvedCutout, toRect(popupEl.getBoundingClientRect(), RECT_PADDING));
              isCircle = false;
            }
          }
        } else {
          resolvedCutout = toRect(r, RECT_PADDING);
        }
      } else if (currentStep.cutout.shape === "circle") {
        // Target not found yet (map still mounting) or doesn't exist for
        // this region - fall back to the whole map rather than a fully
        // dark screen with nothing highlighted.
        const fallback = document.getElementById("onboard-map");
        if (fallback) resolvedCutout = toRect(fallback.getBoundingClientRect(), RECT_PADDING);
      }

      setCutoutRect(resolvedCutout);
      setCutoutIsCircle(isCircle);

      // Dot position: an explicit dot target if given, else the cutout's
      // own center.
      if (currentStep.dot) {
        const dotEl = findElement(currentStep.dot);
        setDotRect(dotEl ? toRect(dotEl.getBoundingClientRect()) : resolvedCutout);
      } else {
        setDotRect(resolvedCutout);
      }
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

  // Following through on the real action (clicking the actual pin, the
  // real "+Add" button, the real toolbar button) advances the tour too,
  // not just clicking the tour's own "Next" - delegated at the document
  // level so it still works even if the target element mounts after this
  // effect runs (a popup's "+Add" button, for instance).
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

  return (
    <>
      <div className="onboarding-dark-layer" aria-hidden="true">
        {cutoutRect && (
          <div
            className={"onboarding-cutout" + (cutoutIsCircle ? " onboarding-cutout-circle" : "")}
            style={{ top: cutoutRect.top, left: cutoutRect.left, width: cutoutRect.width, height: cutoutRect.height }}
          />
        )}
      </div>

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
