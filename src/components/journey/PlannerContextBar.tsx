"use client";

/**
 * Planner context bar (Days/Trip flow Phase 5, docs/days-trip-flow-
 * handoff.md §3.5, §10 "Planner"). The one new element the design doc
 * asks for on the existing /journey workspace: "‹ Back · Day 2 loaded
 * from a day plan — Ardbeg, on Foot. Change anything; it saves back to
 * your trip. · Reset to the original · Save day".
 *
 * Only rendered by Workspace.tsx when BOTH are true: the planner was
 * opened via the /trip "Make this day my own" hand-off (resume=1) AND
 * the currently active day still traces back to a real Hub Day
 * (sourceHubDaySlug resolves via getDays()) - a day built from scratch
 * has no "original" to reset to or provenance to state, so it gets no
 * bar at all, per the task brief.
 */
export default function PlannerContextBar({
  dayNumber,
  title,
  onBack,
  onReset,
  onSaveDay,
}: {
  dayNumber: number;
  title: string;
  onBack: () => void;
  onReset: () => void;
  onSaveDay: () => void;
}) {
  return (
    <div className="planner-context-bar">
      <div className="planner-context-bar-row">
        {/* §7: back links state their destination in the accessible name,
            not just "Back". */}
        <button
          type="button"
          className="planner-context-back"
          onClick={onBack}
          aria-label="Back to my trip"
        >
          ‹ Back
        </button>
        <div className="planner-context-actions">
          <button type="button" className="planner-context-reset" onClick={onReset}>
            Reset to the original
          </button>
          <button type="button" className="planner-context-save" onClick={onSaveDay}>
            Save day
          </button>
        </div>
      </div>
      <p className="planner-context-provenance">
        <strong>Day {dayNumber} loaded from a day plan</strong> — {title}. Change anything; it saves back to your
        trip.
      </p>
    </div>
  );
}
