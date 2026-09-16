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
 * WHAT IT WATCHES, in one scroll pass (rewritten 16 Sep 2026 - it was two
 * IntersectionObservers, and see the effect below for why it is not):
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
 * THE MAP IS ALSO FLICKABLE on its own, with arrows that move it and
 * nothing else, so you can look ahead at day four while still reading day
 * one. Scrolling hands control back to the page.
 *
 * MOBILE is the same component and the same state: CSS drops the rail,
 * promotes the map to a full-width band above the days, and turns the
 * action into a bottom bar. The bar appears only after day one has gone
 * past - and it gates on the day READ, not the day flicked to, because
 * looking ahead is not reading, and an ask before anyone has read a
 * single day is the thing this page's whole structure argues against.
 *
 * Falls back gracefully with no JavaScript: the map renders, the overlay
 * names day one, and the ask is a plain link to the block at the foot.
 * Nothing here is required to read the page.
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
  /** A day chosen with the arrows, which overrides the one being read
   *  until the reader scrolls again (Mark, 16 Sep 2026: "I'd like the map
   *  to be standalone flickable").
   *
   *  Two inputs, one at a time, rather than two permanent sources of
   *  truth: while this is set the map is yours to flick through; the
   *  moment you scroll it clears and the map goes back to following the
   *  day you are reading. Nothing has to reconcile, because only one of
   *  them is ever in charge. */
  const [manualDay, setManualDay] = useState<number | null>(null);
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

    /* Scrolling hands control back to the page. Not throttled and not
       inside recompute on purpose: it must happen on the first scroll
       event, before the next frame, or the map would show the flicked day
       for a beat after the reader has started moving. Setting null when
       it is already null is free - React bails on an unchanged value. */
    function onScroll() {
      setManualDay(null);
      schedule();
    }

    // Scheduled rather than called: setting state straight from an effect
    // body cascades a render, which is what react-hooks/set-state-in-effect
    // is there to stop.
    schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const dayCount = dayAreas.length;
  /** What the map and the badge are showing: the flicked day if there is
   *  one, otherwise the day being read. */
  const shownDay = Math.min(Math.max(manualDay ?? currentDay, 1), Math.max(dayCount, 1));
  const area = dayAreas[shownDay - 1];

  /** Flick the map. Deliberately does NOT move the page - the map is a
   *  thing you can look through on its own while reading day one.
   *
   *  Takes a step rather than a destination, and computes it inside the
   *  updater. Two quick clicks land in the same React batch and would
   *  otherwise both read the same render's day and both resolve to the
   *  same answer: three presses moved the map two days. */
  function stepDay(delta: number) {
    setManualDay((prev) => {
      const next = (prev ?? currentDay) + delta;
      return next < 1 || next > dayCount ? prev : next;
    });
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
          {/* The map is flickable on its own - these move it and nothing
              else. Scrolling gives control back to the page. */}
          <div className="jr-map-nav">
            <button
              type="button"
              className="jr-map-nav-btn"
              onClick={() => stepDay(-1)}
              disabled={shownDay <= 1}
              aria-label="Previous day on the map"
            >
              &lsaquo;
            </button>
            <span className="jr-map-nav-count" aria-hidden="true">
              {shownDay}/{dayCount}
            </span>
            <button
              type="button"
              className="jr-map-nav-btn"
              onClick={() => stepDay(1)}
              disabled={shownDay >= dayCount}
              aria-label="Next day on the map"
            >
              &rsaquo;
            </button>
          </div>
        </div>
        <div className="jr-map-holder">
          <JourneyRouteMap stops={stops} base={base} focusDay={shownDay} />
          <div className="jr-map-badge">
            <span className="jr-map-badge-day">Day {ordinalWord(shownDay)}</span>
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
