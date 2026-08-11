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

## North East Area page

**Status:** Logged for future work, not scoped/started.

**Context:** 11 Aug 2026 — the desktop hero's dreaming column (`docs/hero-handoff.md` §4.3, `HeroDreamingColumn.tsx`) anchors three of its four "drawn to" areas to a real, live `/areas/[slug]` page (Port Ellen for the peated south, Bowmore for the middle, Port Charlotte for the west) via each area's "WHERE YOU'D BASE YOURSELF" card. The fourth, "the north east" (Caol Ila, Ardnahoe, Bunnahabhain), has no equivalent — its own natural village, Port Askaig, was deliberately dropped from every area/accommodation picker site-wide on 8 Aug 2026 (`src/lib/areas.ts`'s own header comment) and was never built as a real Area page. Rather than link to a page that doesn't exist, the card is simply omitted for that one area — a visible gap in an otherwise-symmetrical set of four.

**Suggested approach:** Build a fourth Area page for the north east, same content shape as the existing three (Port Ellen/Bowmore/Port Charlotte) — either revisit Port Askaig itself as a real, bookable base, or pick whichever village best represents that stretch of coast (worth a real decision, not a default). Once live, `DREAM_AREA_BASE_SLUG` in `HeroDreamingColumn.tsx` just needs the one new entry (`"north-east": "<slug>"`) to pick it up — no other code change needed. Content follows the normal process: draft in chat → Mark's review → independent second-pass review → Airtable as Status: Draft.

## Trip summary actions: "Save as a tour" / "Email this trip to myself"

**Status:** Deferred, not scoped - buttons present but inert.

**Context:** 11 Aug 2026, Mark flagged this for the backlog. `/trip` (`TripReview.tsx`) has always shown both actions per the copy deck, each disabled with `aria-disabled="true"` rather than hidden, alongside the note "Saving and emailing are coming soon - for now, this page is yours to bookmark." Same root gap as the existing **Login / Save Trips** entry above: there's no persistent user account/session to save a trip against, and no email-sending infrastructure anywhere in the codebase yet, so neither button can be wired up honestly without that groundwork first.

**Suggested approach:** Revisit both alongside the Login / Save Trips decision above - "Save as a tour" almost certainly needs the same persistence answer that decision lands on. "Email this trip to myself" doesn't strictly need an account (a one-off send doesn't require login), but does need a transactional email provider wired in (nothing currently sends email from the site) and a real "what does the email contain" design pass (a formatted version of this same trip summary, presumably). Worth scoping as its own small piece of work independent of the login decision, if a driver for it shows up first.
