import type { HubDay } from "@/lib/types";
import { paceTone } from "@/lib/day-derivations";

/**
 * Pace pill (Relaxed/Moderate/Packed) - pulled out of DaysHubGrid.tsx
 * (10 Aug 2026) so the homepage hero's compact day cards
 * (HeroDaysColumn.tsx) can render literally the same component instead
 * of a second hand-copied one, without pulling DaysHubGrid's whole
 * module graph (DaysTripBar, useTrip, etc.) into the homepage bundle for
 * a component that itself needs none of it - it's pure presentation
 * over a `pacing` string. Colour mapping still lives in
 * day-derivations.ts's paceTone, the one source of truth trip review's
 * own pace badges also import.
 */
export function PacingTag({ pacing }: { pacing: HubDay["pacing"] }) {
  const tone = paceTone(pacing);

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {pacing}
    </span>
  );
}
