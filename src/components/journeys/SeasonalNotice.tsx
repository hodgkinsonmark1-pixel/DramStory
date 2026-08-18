"use client";

import { useTrip } from "@/lib/trip-context";
import { seasonalNoticeFor, todayIsoLocal } from "@/lib/seasonal";
import type { SeasonalWindow } from "@/lib/types";

/**
 * A tour's seasonal note, shown BESIDE the stop it belongs to and only
 * when it actually applies to this visitor - see seasonalNoticeFor for
 * the rule, which is the substance of this feature. This component is
 * only the presentation of it, shared by the day page (inside the stop
 * card) and a journey's day cards, so the two can never disagree about
 * when a note is worth showing.
 *
 * Renders nothing until the trip has hydrated from localStorage
 * (`trip.ready`). That is deliberate on two counts: the visitor's dates
 * are the first input to the rule and they don't exist on the server, and
 * "today" read during a server render is the server's today. Both would
 * be a hydration mismatch, and both would show the wrong answer for one
 * paint - on a notice whose entire job is to be right about dates.
 */
export default function SeasonalNotice({
  seasonal,
  label,
  className,
}: {
  seasonal: SeasonalWindow | undefined;
  /** Names the tour this is about. Needed on a journey day card, where
   *  the stops are a single line of names and the note would otherwise
   *  float free of the one it concerns. Omitted on the day page, where
   *  the notice already sits inside that stop's own card. */
  label?: string;
  className: string;
}) {
  const trip = useTrip();
  if (!trip.ready) return null;

  const notice = seasonalNoticeFor(seasonal, trip.tripDates, todayIsoLocal());
  if (!notice) return null;

  return (
    <div className={className}>
      {label && <span className="seasonal-notice-label">{label}</span>}
      {/* The lead exists only when the visitor's own dates put them in
          this window, and it goes first because that - not the note's
          content - is what makes it worth reading now. */}
      {notice.lead && <strong>{notice.lead} </strong>}
      {notice.note}
    </div>
  );
}
