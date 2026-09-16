"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import JourneyRouteMap, { type RouteMapStop } from "@/components/journeys/JourneyRouteMap";
import { ordinalWord } from "@/lib/journey-derivations";
import { useAddJourney } from "./use-add-journey";
import type { Journey } from "@/lib/types";

/**
 * The right-hand rail on /journeys/[slug] (18 Aug 2026, to the build
 * spec). Two things live in it and nothing else: a map card that names
 * whichever day is currently in view, and ONE navy call to action.
 *
 * The rail is sticky and ENDS when the day list ends - that is a CSS
 * fact (the rail is a grid child whose track is the day column's height,
 * with `position: sticky` inside it), not something this component
 * measures.
 *
 * WHAT IT WATCHES, and why there are two observers rather than one:
 *
 *  - `[data-jr-day]` - every day card. The most recently crossed one is
 *    the day the map labels. Deliberately "most recently crossed going
 *    down" rather than "most visible": on a long day card the visible
 *    fraction of the NEXT card overtakes it well before the reader has
 *    finished the one they are on, and the map would run a day ahead of
 *    the text beside it.
 *  - `#jr-ask` - the full navy block at the foot of the page. The spec's
 *    rule is that only one ask is ever on screen, so the rail's slim
 *    action hides the moment the block it points at is visible. Without
 *    this the reader gets the same sentence twice, six inches apart.
 *
 * MOBILE is the same component and the same state: CSS drops the rail,
 * promotes the map to a full-width band above the days, and turns the
 * action into a bottom bar. The bar appears only after day one has gone
 * past - `currentDay >= 1` - because an ask before anyone has read a
 * single day is the thing this page's whole structure is arguing
 * against.
 *
 * Falls back gracefully with no JavaScript and no IntersectionObserver:
 * the map renders, the overlay simply names day one, and the action is a
 * plain link that is always shown. Nothing here is required to read the
 * page.
 */
export default function JourneyRail({
  journey,
  stops,
  base,
  routeSummary,
  dayAreas,
  askHref,
  askLabel,
  askNote,
}: {
  /** The Journey this rail belongs to. Added 12 Sep 2026, when the rail's
   *  ask stopped being a signpost and became the action itself. */
  journey: Journey;
  stops: RouteMapStop[];
  base?: { name: string; lat: number; lng: number };
  routeSummary: string;
  /** One entry per day, index-aligned with the day cards' own
   *  data-jr-day numbers (which are 1-based). The Day's `Area Note`, or
   *  undefined where the record hasn't got one - in which case the
   *  overlay shows the day alone rather than an invented place. */
  dayAreas: (string | undefined)[];
  askHref: string;
  askLabel: string;
  askNote: string;
}) {
  const [currentDay, setCurrentDay] = useState(1);
  const [askVisible, setAskVisible] = useState(false);
  /* Its own instance, separate from the one in the navy block. They do
     not share a state machine, which is why the two surfaces are never
     shown at once - see askVisible below. */
  const addJourney = useAddJourney(journey);

  /* WHY THIS IS A SCROLL LISTENER AND NOT TWO IntersectionObservers
     (16 Sep 2026).

     It used to be observers, and the day badge never once changed. It sat
     on "Day one" for the whole page - confirmed by scrolling the length
     of the Grand Tour on the preview and watching it not move.

     The reason was one line: the effect queried [data-jr-day], and if it
     found nothing it returned. No observer was created, nothing retried,
     and the rail was frozen for the life of the page. A single query at a
     single moment decided whether the feature existed at all.

     Recomputing from scroll removes that entirely. There is no setup step
     to miss, the cards are re-queried each time (four elements - the cost
     is nothing), and a day added or removed later is picked up for free.
     rAF-throttled, so it runs at most once a frame however fast the wheel
     spins, and passive so it never blocks scrolling.

     The rule it implements is unchanged: the day you are on is the last
     one whose top has crossed a line about a third down the viewport -
     "most recently crossed", not "most visible". On a long day card the
     visible fraction of the NEXT card overtakes it well before the reader
     has finished the one they are on, and the map would run a day ahead
     of the text beside it. */
  useEffect(() => {
    let frame = 0;

    function recompute() {
      frame = 0;

      const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-jr-day]"));
      if (cards.length > 0) {
        const line = window.innerHeight * 0.34;
        let current = 1;
        for (const card of cards) {
          if (card.getBoundingClientRect().top <= line) {
            current = Number(card.dataset.jrDay) || current;
          }
        }
        setCurrentDay(current);
      }

      /* One ask on screen at a time: the rail's slim action hides the
         moment the full navy block it points at is visible, or the reader
         gets the same offer twice, six inches apart. */
      const ask = document.getElementById("jr-ask");
      if (ask) {
        const box = ask.getBoundingClientRect();
        setAskVisible(box.top < window.innerHeight && box.bottom > 0);
      }
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(recompute);
    }

    // Scheduled rather than called: setting state straight from an effect
    // body cascades a render, which is what react-hooks/set-state-in-effect
    // is there to stop.
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const area = dayAreas[currentDay - 1];
  const dayCount = dayAreas.length;

  /** Scroll the day spine to a day and let the observer do the rest.
   *  Lands the card just above the trigger line so it registers as the
   *  day you are on the moment it arrives. */
  function goToDay(day: number) {
    if (day < 1 || day > dayCount) return;
    const card = document.querySelector<HTMLElement>(`[data-jr-day="${day}"]`);
    if (!card) return;

    const top = card.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.28;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = window.scrollY;

    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });

    /* Smooth scrolling is not honoured everywhere, and where it is
       ignored the scroll is dropped entirely rather than falling back to
       a jump - the arrows then look broken while the page sits exactly
       where it was. Found on the preview, 16 Sep 2026: a plain
       scrollTo(0, n) moved the page and the identical call with
       behavior:"smooth" did nothing at all.
       So: ask for smooth, then check we actually went somewhere, and
       jump if we did not. An instant arrival beats no arrival. */
    if (!reduced) {
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - from) < 2) window.scrollTo(0, top);
      }, 250);
    }
  }

  /* The rail's ask ADDS the trip now (12 Sep 2026) rather than scrolling
     to the block that does. Someone who has decided on day three should
     not have to travel to the foot of the page to say so.

     Still a link, not a button, and the href is still the anchor: with
     no JavaScript the click does exactly what it always did and scrolls
     to the full ask. preventDefault only fires once there is a handler
     to take over. Same reasoning as the rest of this component, which
     was written to degrade rather than break.

     The collision case is deliberately thinner here than in the block.
     The rail is a shortcut; "replace what I have" destroys work and
     belongs with the full explanation at the foot of the page, not in a
     sticky bar. */
  const busy = addJourney.status === "saving";
  const ask =
    addJourney.status === "added"
      ? { href: "/trip", label: "View trip →", note: `${journey.name} is in your trips.` }
      : addJourney.collision
        ? {
            href: addJourney.loginHref,
            label: "Sign in to keep both →",
            note: "You already have a trip in this browser.",
          }
        : { href: askHref, label: busy ? "Adding…" : askLabel, note: askNote };

  function handleAskClick(event: MouseEvent<HTMLAnchorElement>) {
    // Added and collision are real destinations - let them navigate.
    if (addJourney.status === "added" || addJourney.collision) return;
    event.preventDefault();
    addJourney.add(false);
  }

  const askInner = (
    <>
      <span className="jr-rail-ask-label">{ask.label}</span>
      <span className="jr-rail-ask-note">{ask.note}</span>
    </>
  );

  return (
    <aside className="jr-rail">
      <div className="jr-rail-map">
        <div className="jr-rail-map-head">
          <span className="jr-eyebrow jr-rail-map-eyebrow">Today, on the map</span>
          {/* Arrows step the DAY, by scrolling the spine rather than by
              setting state here. The observer above is the single source
              of truth for which day you are on, and two things writing
              that would drift the moment you used an arrow and then
              scrolled. This way the map, the badge and the page always
              agree, because only one thing ever decides. */}
          <div className="jr-map-nav">
            <button
              type="button"
              className="jr-map-nav-btn"
              onClick={() => goToDay(currentDay - 1)}
              disabled={currentDay <= 1}
              aria-label="Previous day"
            >
              &lsaquo;
            </button>
            <span className="jr-map-nav-count" aria-hidden="true">
              {currentDay}/{dayCount}
            </span>
            <button
              type="button"
              className="jr-map-nav-btn"
              onClick={() => goToDay(currentDay + 1)}
              disabled={currentDay >= dayCount}
              aria-label="Next day"
            >
              &rsaquo;
            </button>
          </div>
        </div>
        <div className="jr-map-holder">
          <JourneyRouteMap stops={stops} base={base} focusDay={currentDay} />
          <div className="jr-map-badge">
            <span className="jr-map-badge-day">Day {ordinalWord(currentDay)}</span>
            {area && <span className="jr-map-badge-area">{area}</span>}
          </div>
        </div>
        {routeSummary && <p className="jr-rail-map-caption">{routeSummary}</p>}
      </div>

      {/* ONE ask, and only while the full block is off screen. */}
      <Link
        href={ask.href}
        onClick={handleAskClick}
        className={askVisible ? "jr-rail-ask jr-rail-ask-hidden" : "jr-rail-ask"}
        aria-hidden={askVisible}
        aria-disabled={busy}
        tabIndex={askVisible ? -1 : undefined}
      >
        {askInner}
      </Link>

      {/* Phone only (CSS). Same link, same rule, plus "not before day
          one has been read". */}
      <Link
        href={ask.href}
        onClick={handleAskClick}
        className={
          askVisible || currentDay < 1 ? "jr-mobile-ask jr-rail-ask-hidden" : "jr-mobile-ask"
        }
        aria-hidden={askVisible}
        aria-disabled={busy}
        tabIndex={askVisible ? -1 : undefined}
      >
        {askInner}
      </Link>
    </aside>
  );
}
