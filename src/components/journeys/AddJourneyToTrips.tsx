"use client";

import Link from "next/link";
import type { Journey } from "@/lib/types";
import { useAddJourney } from "./use-add-journey";

/**
 * The ask at the foot of /journeys/[slug] (12 Sep 2026).
 *
 * TWO ACTIONS, NOT TWO BUTTONS. "Add this trip as is" is the filled
 * button; "Make it your own" is a quieter text action beneath it. That
 * distinction is the whole point, and it is what makes this different
 * from the August pair that had to be removed: two equal buttons forced
 * a choice before anyone knew what either did. One primary action with a
 * demoted alternative is the same pattern this page already uses for
 * "Or start differently" below the rule.
 *
 * The two serve genuinely different people. Someone who reads the
 * Journey and thinks "that, exactly that" should be one click from
 * having it, and should not be dropped into a map editor to prove it.
 * Someone who wants to move things around should not have to add it,
 * find it, and then open it.
 *
 * NEITHER DESTROYS ANYTHING. Both create a NEW named trip, so whatever
 * was already being planned stays in its own row. The only exception is
 * a signed-out browser, which has one slot - and that case asks first,
 * because it genuinely cannot be non-destructive.
 *
 * THE "kept in this browser" LINE IS GONE (Mark, 12 Sep 2026). The offer
 * to sign in now belongs at the moment it matters - opening the planner,
 * before any work has been done - rather than as a footnote under a
 * button. Signed-out visitors who add and stay on the page are still
 * covered by the site-wide save bar once the trip is worth keeping; see
 * TripSavePrompt.
 */
export default function AddJourneyToTrips({ journey, note }: { journey: Journey; note: string }) {
  const {
    hasDays,
    status,
    collision,
    email,
    loginHref,
    pendingPlanner,
    add,
    replaceLocalTrip,
    cancelCollision,
  } = useAddJourney(journey);

  if (!hasDays) return null;

  if (status === "added") {
    return (
      <div className="jr-ask-action">
        <p className="jr-ask-added">
          <span className="jr-ask-added-tick" aria-hidden="true">
            &#10003;
          </span>{" "}
          Added{email ? " to your trips" : ""} &mdash; {journey.name} is ready to edit.
        </p>
        <Link href="/trip" className="jr-ask-button jr-ask-button-link">
          View trip &rarr;
        </Link>
      </div>
    );
  }

  if (collision) {
    return (
      <div className="jr-ask-action">
        <p className="jr-ask-collision-title">You already have a trip on the go.</p>
        <p className="jr-ask-collision-body">
          Signed out, this browser only holds one. Sign in and you can keep both &mdash; yours and
          this one, side by side.
        </p>
        <Link href={loginHref} className="jr-ask-button jr-ask-button-link">
          Sign in and keep both &rarr;
        </Link>
        {/* The destructive option stays available, but it has to be read
            and chosen rather than being what the big button does.
            pendingPlanner carries through whichever action was
            interrupted, so "Make it your own" still ends in the planner. */}
        <button
          type="button"
          onClick={() => replaceLocalTrip(pendingPlanner)}
          className="jr-ask-collision-replace"
        >
          Replace my current trip with this one
        </button>
        <button type="button" onClick={cancelCollision} className="jr-ask-collision-cancel">
          Cancel
        </button>
      </div>
    );
  }

  const busy = status === "saving";

  return (
    <div className="jr-ask-action">
      {/* SIDE BY SIDE SINCE 26 SEP 2026 (Mark). The alternative used to
          sit stacked beneath the button with its note under that again,
          three rows deep into an already tall block. Beside it, the two
          routes read as the choice they are - take it as it stands, or
          open it up - rather than as a button followed by an afterthought.
          Demotion is carried by weight and colour, not by distance. */}
      <div className="jr-ask-action-row">
        <button
          type="button"
          onClick={() => add(false)}
          className="jr-ask-button"
          disabled={busy}
        >
          {busy ? "Adding…" : "Add this trip as is →"}
        </button>

        {/* Still a text action, not a second filled button. */}
        <span className="jr-ask-alt-action">
          <button
            type="button"
            onClick={() => add(true)}
            className="jr-ask-secondary"
            disabled={busy}
          >
            Make it your own &rarr;
          </button>
          <span className="jr-ask-note">{note}</span>
        </span>
      </div>

      {status === "error" && (
        <p className="jr-ask-error">
          Couldn&rsquo;t add that just now. Your own trip is untouched &mdash; try again in a moment.
        </p>
      )}
    </div>
  );
}
