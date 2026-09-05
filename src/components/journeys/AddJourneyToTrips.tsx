"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTrip, type StoredTrip } from "@/lib/trip-context";
import type { Journey } from "@/lib/types";

/**
 * "Add to my trips" - the single ask on /journeys/[slug] (5 Sep 2026),
 * replacing "Put this trip in my planner".
 *
 * WHAT WAS WRONG WITH THE OLD ONE. It called trip.resetTrip() and then
 * pushed you to the map. So a visitor half way through planning their own
 * week, who opened a Journey to see what was in it, lost the lot - no
 * warning, no undo. That was defensible in August, when a browser held
 * exactly one trip and there was nowhere else to put a second. The
 * account now holds as many named trips as you like, so it is not
 * defensible any more.
 *
 * WHAT IT DOES INSTEAD: creates a NEW named trip from the Journey and
 * points this browser at it. Whatever you were planning stays exactly
 * where it was, in its own row, and you end up with both - which is what
 * somebody weighing a curated route against their own plan actually
 * wants.
 *
 * WHY IT BUILDS THE PAYLOAD RATHER THAN DRIVING TripContext. The obvious
 * implementation - seed the context and let TripSync save it - writes the
 * Journey into whichever row is currently active, which is the row we are
 * trying to protect. So the Journey becomes a StoredTrip up front, is
 * inserted as its own row, and only then does setActiveTrip point the
 * browser at it. TripSync pulls it down from there. There is no window in
 * which the Journey could land in the wrong row.
 *
 * SIGNED OUT THERE IS ONLY ONE SLOT. Named trips are an account feature;
 * a signed-out browser has a single localStorage trip. So when a
 * signed-out visitor already has days in progress, adding this Journey
 * genuinely cannot be non-destructive - and the component says so and
 * offers the way out rather than quietly overwriting. That is not a
 * consolation prize. It is the most honest sign-in prompt on the site,
 * because the reason is real and the moment is right.
 *
 * Only distillery stops are seeded, unchanged from the old component and
 * for the reason it gave: a beach or a walk is not itinerary-stop-shaped
 * in the trip data model, so it stays descriptive content on the page
 * rather than being half-represented in the workspace.
 */

/** Journey -> a complete trip, as a plain object.
 *
 *  Deliberately mirrors what the old component produced through
 *  resetTrip/initDays/addStop/completeIntake, down to the `day-1` / `Day 1`
 *  id and label scheme initDays uses, so a trip created here is
 *  indistinguishable from one built the old way. Exported because it is
 *  pure and worth testing on its own. */
export function journeyToStoredTrip(journey: Journey): StoredTrip {
  return {
    days: (journey.days ?? []).map((day, i) => ({
      id: `day-${i + 1}`,
      label: `Day ${i + 1}`,
      stops: day.stops.map((stop) => ({
        kind: "distillery" as const,
        distillery: stop.distillery,
        ...(stop.anchor ? { anchor: true } : {}),
      })),
    })),
    intake: {
      timing: "planning",
      location: { kind: "region", region: "islay" },
      interests: ["distilleries"],
    },
    currentDayIndex: 0,
    mapView: null,
    tripDates: null,
    answers: null,
  };
}

type Status = "idle" | "saving" | "added" | "error";

export default function AddJourneyToTrips({
  journey,
  note,
  deviceNote,
}: {
  journey: Journey;
  /** "Free, and you can edit it after." - the promise. */
  note: string;
  /** Where the trip is actually kept when nobody is signed in. Not a
   *  footnote: it is the sentence that makes the promise above honest. */
  deviceNote: string;
}) {
  const trip = useTrip();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  /** Signed out, with a trip already on the go: adding would overwrite
   *  it, so we ask first. */
  const [collision, setCollision] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!journey.days || journey.days.length === 0) return null;

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  /** Replaces this browser's single trip. Signed out only - signed in,
   *  nothing is ever replaced. */
  function takeOverLocalTrip() {
    trip.replaceTrip(journeyToStoredTrip(journey));
    setCollision(false);
    setStatus("added");
  }

  async function add() {
    setStatus("saving");

    // Asked fresh rather than trusting `email`: a tab left open can have
    // a stale session, and a failed insert is a worse answer than simply
    // taking the signed-out path.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Nothing to lose if this browser's trip is empty - just take it.
      if (trip.days.length === 0) {
        takeOverLocalTrip();
        return;
      }
      setStatus("idle");
      setCollision(true);
      return;
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({ user_id: user.id, name: journey.name, payload: journeyToStoredTrip(journey) })
      .select("id")
      .single();

    if (error || !data) {
      setStatus("error");
      return;
    }

    /* Point the browser at the new row and let TripSync fetch it. The
       trip that was open is untouched, in its own row. */
    trip.setActiveTrip(data.id);
    setStatus("added");
  }

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
        {!email && (
          <p className="jr-ask-device">
            {deviceNote}{" "}
            <Link href={loginHref} className="jr-ask-signin">
              Keep it on your account &rarr;
            </Link>
          </p>
        )}
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
            and chosen rather than being what the big button does. */}
        <button type="button" onClick={takeOverLocalTrip} className="jr-ask-collision-replace">
          Replace my current trip with this one
        </button>
        <button
          type="button"
          onClick={() => setCollision(false)}
          className="jr-ask-collision-cancel"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="jr-ask-action">
      <button type="button" onClick={add} className="jr-ask-button" disabled={status === "saving"}>
        {status === "saving" ? "Adding…" : "Add to my trips →"}
      </button>
      <p className="jr-ask-note">{note}</p>
      {status === "error" && (
        <p className="jr-ask-error">
          Couldn&rsquo;t add that just now. Your own trip is untouched &mdash; try again in a moment.
        </p>
      )}
      {/* Nothing until the session is known - a wrong answer about where
          someone's trip is kept is worse than a beat of silence. */}
      {checked &&
        (email ? (
          <p className="jr-ask-device">Saved to your account, on every device you sign in to.</p>
        ) : (
          <p className="jr-ask-device">
            {deviceNote}{" "}
            <Link href={loginHref} className="jr-ask-signin">
              Keep it on your account &rarr;
            </Link>
          </p>
        ))}
    </div>
  );
}
