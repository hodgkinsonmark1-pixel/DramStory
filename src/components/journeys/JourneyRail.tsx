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

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-jr-day]"));
    if (cards.length === 0) return;

    // rootMargin pulls the trigger line up to roughly a third down the
    // viewport: a card counts as "the day you are on" once its top has
    // passed that line, which is where a reader's eye actually is.
    const observer = new IntersectionObserver(
      () => {
        let current = 1;
        for (const card of cards) {
          const top = card.getBoundingClientRect().top;
          if (top <= window.innerHeight * 0.34) {
            current = Number(card.dataset.jrDay) || current;
          }
        }
        setCurrentDay(current);
      },
      { threshold: [0, 0.01, 0.5, 1], rootMargin: "-33% 0px -33% 0px" }
    );
    for (const card of cards) observer.observe(card);

    const ask = document.getElementById("jr-ask");
    const askObserver = ask
      ? new IntersectionObserver(([entry]) => setAskVisible(entry.isIntersecting), { threshold: 0 })
      : undefined;
    if (ask && askObserver) askObserver.observe(ask);

    return () => {
      observer.disconnect();
      askObserver?.disconnect();
    };
  }, []);

  const area = dayAreas[currentDay - 1];

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
        <span className="jr-eyebrow jr-rail-map-eyebrow">Today, on the map</span>
        <div className="jr-map-holder">
          <JourneyRouteMap stops={stops} base={base} />
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
