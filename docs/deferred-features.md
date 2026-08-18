# Deferred Features

Product decisions that have been deliberately parked, not overlooked. Logged here so they're easy to revisit properly rather than getting built piecemeal or forgotten.

## Login / Save Trips

**Status:** No longer parked — Mark confirmed on 18 Aug 2026 that a visitor account is the next thing to be built. Needs scoping.

Trip state currently lives in-session only (`TripContext`), with no persistent user accounts. Not an oversight — a deliberate decision not to build toward this unprompted. Revisit when there's a clear driver (e.g. accommodation booking going live, which would make persistence genuinely necessary rather than nice-to-have).

**Update, 18 Aug 2026:** the driver has arrived. Mark has confirmed a visitor account is next up. The journey page's "Put this trip in my planner" button has already shipped as a deliberate placeholder — its sub-line says the trip is kept on this device — and is structured so that account-backed saving replaces it without a redesign. The **Trip summary actions: "Save as a tour" / "Email this trip to myself"** entry lower down depends on the same decision and should be picked up with it.

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

## Tour comparison page or article

**Status:** Logged for future work, not scoped. Requested by Mark 18 Aug 2026, explicitly to follow completion of the tour verification pass.

**Context:** 18 Aug 2026 — the Tours table holds 30 tours across the ten Islay distilleries, with names, prices, durations and a new `Verification` flag. That's now enough comparable data to answer questions a visitor genuinely asks and no whisky site answers well: what the cheapest way into each distillery costs, which are tasting-only versus a real walk through production, which are accessible, which admit under-18s, which include a take-home sample. Entry prices alone run from £15 (Ardnahoe) to £250 (Port Ellen, the only tour it runs). Mark's open question is whether this belongs as a live comparison page or as a Journal article — an article ages more gracefully and carries editorial voice; a live page stays current automatically because it reads Airtable, but invites direct price comparison in a way that may not suit distillery relationships.

**Suggested approach:** Decide the format first, since it changes the work substantially. Either way it should be generated from Airtable rather than written by hand, so it can't drift from the tour records. Don't start until the verification pass is complete — three tours remain unverified (Ardbeg's History & Heritage Walk, Lagavulin's Warehouse No.3, Port Ellen's Atlas of Smoke) and two placeholder-flagged tours were deleted on 18 Aug precisely because they didn't exist.

## Are cocktail and gin sessions day-plan stops?

**Status:** Needs a decision, not scoped.

**Context:** 18 Aug 2026 — verification against official sites added two experiences that are legitimately bookable but are not distillery tours: Bowmore's Old Fashioned Alchemy (£35, 45 min, cocktail-making in the visitor centre) and Bruichladdich's The Botanist Cocktail Class (£45, 90 min, gin cocktails plus a look at The Botanist's distillation). Both belong in the Tours table as real bookings. Neither is obviously something the planner should offer as a stop inside a whisky day — but both are exactly the kind of thing a group with a non-whisky-drinker might want. Currently they sit in the table and would be selectable like any other tour.

**Suggested approach:** Probably a `Kind` or `Category` field on Tours (tour / tasting / class) rather than a boolean, since tasting-only experiences are already a meaningful third case and the day page copy already distinguishes them. Decide once rather than case by case as more appear.

## Packed pace colour fails contrast

**Status:** Logged, needs a palette decision from Mark.

**Context:** 18 Aug 2026 — the Packed pace rust (`#B5502E`) with light text measures 4.18:1, under the 4.5:1 the project's accessibility notes require at the sizes used on the day cards. Relaxed (9.64:1) and Moderate (8.90:1, after moving to `--peat`) both clear it comfortably. Not changed because it's a sanctioned brand pair already used by `PacingTag`, so darkening it is a brand decision rather than a component fix. Separately, `PacingTag`'s own Moderate pill (copper on `--amber-pale`) measures 3.19:1.

**Suggested approach:** Darken the rust for text-bearing uses only, keeping the existing value for the 5px strips where contrast doesn't apply.

## "Just dreaming" hands off to an empty planner

**Status:** Logged, real gap in the funnel.

**Context:** 18 Aug 2026 — from the homepage, "just dreaming" collects the area a visitor says they're drawn to, but "create my trip" then seeds `/journey` with three blank days and the message "Nothing added to this day yet — tap a pin on the map to start." Nothing carries over. So the one path where the visitor has actually stated an interest is the one that starts them from nothing.

**Suggested approach:** Seed the planner from the chosen area — its distilleries as candidate pins at minimum, or its representative Day pre-loaded. The area centroids and the `Day Plan` link on the Areas table already exist.

## Ardbeg silent season start date unconfirmed

**Status:** Needs confirming before June 2027.

**Context:** 18 Aug 2026 — the new seasonal-notice fields on Tours carry a window for the Classic Ardbeg Tour of 1 June – 12 July 2026. The 12 July end date is sourced from ardbeg.com; the 1 June start is an assumption that has never been confirmed. Harmless now — the window is in the past and the notice shows to nobody — but it will publish a confidently wrong closure warning next June if left. The project's own standard is that a wrong closure warning is worse than none.

**Suggested approach:** Confirm the real start date with Ardbeg, or narrow the stored window to only the sourced portion.
