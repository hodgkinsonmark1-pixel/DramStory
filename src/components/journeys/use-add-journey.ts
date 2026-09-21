"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTrip, type StoredTrip } from "@/lib/trip-context";
import type { Journey } from "@/lib/types";

/**
 * Taking a Journey, in one place (12 Sep 2026).
 *
 * WHY A HOOK RATHER THAN A COMPONENT. The same action now has three
 * surfaces: the sticky rail on desktop, the bottom bar on a phone, and
 * the navy block at the foot of the page. They look nothing alike and
 * they live in different components, but what they DO has to be
 * identical - including the parts that are easy to get wrong, like never
 * writing a Journey into the row that holds the trip you were already
 * planning. Three copies of that would drift within a fortnight.
 *
 * So the behaviour lives here and the components decide only how it
 * looks.
 */

/** Journey -> a complete trip, as a plain object.
 *
 *  Mirrors what the original button produced through
 *  resetTrip/initDays/addStop/completeIntake, down to the `day-1` / `Day 1`
 *  id and label scheme initDays uses, so a trip created here is
 *  indistinguishable from one built by hand.
 *
 *  Only distillery stops are carried: a beach or a walk is not
 *  itinerary-stop-shaped in the trip data model, so it stays descriptive
 *  content on the page rather than being half-represented in a trip. */
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

export type AddStatus = "idle" | "saving" | "added" | "error";

/** Where "Make it your own" goes. resume=1 skips the intake questions,
 *  which this trip has already answered. */
const PLANNER_HREF = "/journey?resume=1";

export function useAddJourney(journey: Journey) {
  const trip = useTrip();
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<AddStatus>("idle");
  /** Signed out, with a trip already on the go: adding would overwrite
   *  it, so we ask first rather than quietly destroying it. */
  const [collision, setCollision] = useState(false);
  /** Remembers whether the interrupted action was heading for the
   *  planner, so resolving the collision resumes what was asked for
   *  rather than silently doing the other thing. */
  const [pendingPlanner, setPendingPlanner] = useState(false);

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

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;
  const hasDays = !!journey.days && journey.days.length > 0;

  /** Replaces this browser's single trip. Signed OUT only - signed in,
   *  nothing is ever replaced, because there is always somewhere else to
   *  put it. */
  function replaceLocalTrip(openPlanner = false) {
    trip.replaceTrip(journeyToStoredTrip(journey));
    setCollision(false);
    setStatus("added");
    if (openPlanner) router.push(PLANNER_HREF);
  }

  async function add(openPlanner = false) {
    if (!hasDays) return;
    setStatus("saving");

    // Asked fresh rather than trusting `email`: a tab left open can hold
    // a stale session, and a failed insert is a worse answer than simply
    // taking the signed-out path.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Nothing to lose if this browser's trip is empty - just take it.
      if (trip.days.length === 0) {
        replaceLocalTrip(openPlanner);
        return;
      }
      setStatus("idle");
      setPendingPlanner(openPlanner);
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
    if (openPlanner) router.push(PLANNER_HREF);
  }

  return {
    /** False for a Journey with no Days - there is nothing to take. */
    hasDays,
    status,
    collision,
    /** Null when signed out, and undefined-ish until `checked` is true -
     *  worth waiting for, because a wrong answer about where somebody's
     *  trip is kept is worse than a beat of silence. */
    email,
    checked,
    loginHref,
    plannerHref: PLANNER_HREF,
    pendingPlanner,
    add,
    replaceLocalTrip,
    cancelCollision: () => setCollision(false),
  };
}
