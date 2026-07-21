# Deferred Features

Product decisions that have been deliberately parked, not overlooked. Logged here so they're easy to revisit properly rather than getting built piecemeal or forgotten.

## Login / Save Trips

**Status:** Deferred, not scoped.

Trip state currently lives in-session only (`TripContext`), with no persistent user accounts. Not an oversight — a deliberate decision not to build toward this unprompted. Revisit when there's a clear driver (e.g. accommodation booking going live, which would make persistence genuinely necessary rather than nice-to-have).

## Gamification

**Status:** Deferred, not scoped.

Broader gamification (route-planning stats, booking streaks, distillery "bingo" style completion tracking) was an early brainstorm idea, not committed to. Don't build toward this unprompted.

### Logged idea for future review: first Hub Day badge

**Context:** During scoping of the Pre-Designed Days Hub (July 2026), a lightweight idea surfaced: a small badge/moment when a visitor adds their *first* Hub Day to their trip (as opposed to the plain, always-on "from: [Day Name]" source tag on added stops, which **is** in scope for the Hub and isn't gamification — it's just provenance labelling).

- **Trigger:** first Hub Day added to a visitor's trip.
- **Nature:** one-off milestone moment, not an ongoing mechanic (no streaks, no counters, no leaderboard implied by this idea alone).
- **Decision at the time:** keep the Hub itself to the plain source tag only; hold the badge idea here for whenever the broader gamification decision gets revisited on its own terms, rather than let it slip in unprompted through an unrelated feature.

## Shorter tour summaries for the map's Add-tour picker

**Status:** Logged for future work, not scoped/started.

**Context:** 21 July 2026 — the distillery pin's "+ Add" flow (the tour-picker modal in `Workspace.tsx`, `.tour-picker-*` in `journey-extra.css`) shows each tour's full `Tour.description` field from Airtable on its card. The feature itself landed well, but the descriptions are written as proper visitor-facing copy (often 2–4 sentences) and read as a touch long for a quick-scan picker card, compared to something built for a compact choice.

**Suggested approach:** Add a new "Short Summary" field to the Tours table in Airtable — one tight sentence per tour — rather than truncating client-side, keeping Airtable as the golden source. The existing `Description` field stays as-is, unchanged, for wherever it's already used (e.g. distillery pages). Update the tour-picker modal to read the new short field, with a client-side truncation of `Description` as a fallback only for tours where the short field hasn't been populated yet, so nothing looks broken mid-rollout. Content follows the normal process: draft in chat → Mark's review → independent second-pass review → Airtable as Status: Draft.
