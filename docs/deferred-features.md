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

## Packed pace colour fails contrast — RESOLVED 29 Aug 2026

**Status:** Done, by the suggested approach. Left here rather than deleted because the Moderate pill below is still open and belongs with it.

**Context:** 18 Aug 2026 — the Packed pace rust (`#B5502E`) measured 4.18:1 against the pale rust pill ground it is set on, under the 4.5:1 the project's accessibility notes require at the sizes used on the day cards. Relaxed (9.64:1) and Moderate (8.90:1, after moving to `--peat`) both clear it comfortably. Not changed at the time because it's a sanctioned brand pair already used by `PacingTag`, so darkening it was a brand decision rather than a component fix.

Worth recording precisely, because the original note was loose about it: the pairing that failed was the rust as **ink**, on the pill's `#F7E6E0` ground. Light type **on** the rust was 5.06:1 and already passed. Both go up when the rust darkens, so the fix is the same either way.

**Resolution:** Mark's call, 29 Aug 2026 — darken the rust only where text is involved, keep the existing value for the 5px strips where contrast doesn't apply. The rust is now a token pair in `dramstory-legacy.css`'s `:root`: `--rust #B5502E` for fills (shape bars, strips, swatches) and `--rust-ink #9C3F27` for anything text-bearing, reusing the value `journey-extra.css`'s `--jr-packed-ink` had already arrived at. `paceAccentColour` (fills) and `paceInkColour` (text) split apart in `day-derivations.ts` so the two can't be confused again. Pill ink 4.18:1 → **5.50:1**; white on the trip-review day numeral 5.06:1 → **6.66:1**; the strips are unchanged.

## `PacingTag`'s Moderate pill fails contrast

**Status:** Logged, needs the same kind of palette decision. NOT covered by the 29 Aug fix above, which Mark scoped to Packed only.

**Context:** `PacingTag`'s Moderate pill is `--copper #B87D4B` on `--amber-pale #FBF5EA` and measures **3.19:1** — still failing, and by a wider margin than Packed ever did. Re-measured 29 Aug 2026, unchanged. It is the same shape, size and weight of type as the Packed pill that was just fixed, so it fails the same 4.5:1 line for the same reason. Note this is the pill only: the Moderate pace *label* elsewhere moved to `--peat` and reads 8.90:1.

**Suggested approach:** Same pattern as the rust — a darkened copper token for text-bearing uses, leaving `--copper` itself alone for fills and rules. `--peat` on `--amber-pale` is already in the system at 8.90:1 if a new token isn't wanted, though it costs the pill its copper identity.

## "Just dreaming" hands off to an empty planner

**Status:** Logged, real gap in the funnel.

**Context:** 18 Aug 2026 — from the homepage, "just dreaming" collects the area a visitor says they're drawn to, but "create my trip" then seeds `/journey` with three blank days and the message "Nothing added to this day yet — tap a pin on the map to start." Nothing carries over. So the one path where the visitor has actually stated an interest is the one that starts them from nothing.

**Suggested approach:** Seed the planner from the chosen area — its distilleries as candidate pins at minimum, or its representative Day pre-loaded. The area centroids and the `Day Plan` link on the Areas table already exist.

## Ardbeg silent season start date unconfirmed

**Status:** Needs confirming before June 2027.

**Context:** 18 Aug 2026 — the new seasonal-notice fields on Tours carry a window for the Classic Ardbeg Tour of 1 June – 12 July 2026. The 12 July end date is sourced from ardbeg.com; the 1 June start is an assumption that has never been confirmed. Harmless now — the window is in the past and the notice shows to nobody — but it will publish a confidently wrong closure warning next June if left. The project's own standard is that a wrong closure warning is worse than none.

**Suggested approach:** Confirm the real start date with Ardbeg, or narrow the stored window to only the sourced portion.

## Distillery page has no "not open to visitors" variant — RESOLVED 29 Aug 2026

**Status:** Done. Both records are built, `Published` is ticked on each, and both pages are live.

**Context:** 29 Aug 2026 — Laggan Bay and Portintruan are real, producing Islay distilleries that take no visitors. Their Airtable records are complete and correct, but the distillery page template assumes a visitable distillery and renders them wrong: a "Book a Tour" button over an empty tours section, an "+ Add to Journey" control, a Visit info panel with Hours / Price from / Avg visit / Parking all blank, a broken image element, and "Est. 0".

Rather than publish that, the Distilleries table gained a `Published` checkbox — ticked on the 11 visitable distilleries, unticked on these two — and `fetchDistilleriesFromAirtable` in `src/lib/data/index.ts` now returns only ticked records. That is the entire gate: every page, map, picker and "suggested next stops" list reads through `getDistilleries()`, so an unticked distillery is absent everywhere and `/distilleries/[slug]` 404s rather than rendering broken. Note this is `Published`, **not** `Status` — `Status` is a Todo/In progress/Done content-workflow marker and is blank on 9 of the 11 live distilleries, so gating on it would hide most of the site.

**Resolution:** The variant was built as described and both records published. `/distilleries/laggan-bay` and `/distilleries/portintruan` now carry a status notice, a Visiting card that says plainly there is nothing to book, and no booking or add-to-journey affordances. Mark reviewed both on 29 Aug 2026 and kept the standard "Why you should definitely visit" heading and the Est. line as they are.

Two follow-ups came out of it and are logged separately below: the hero-image gap, and the fact that the same broken affordances survive on Isle of Jura, which this fix does not cover because Jura *is* open to visitors.

## Isle of Jura: open to visitors, but no tours to book

**Status:** Live and visibly contradictory. Not covered by the "not open to visitors" fix above.

**Context:** 29 Aug 2026 — Jura suspended tours (confirmed on jurawhisky.com, July 2026) while keeping its shop and visitor centre open. The page handles the *copy* well: there is an honest notice saying tours are unavailable, with a phone number. But `Open To Visitors` is true and there are zero linked Tours, and the template still renders a **"Book a Tour"** button anchored to `#tours`, an empty **Tours** heading with nothing beneath it, and a blank **Price from** row in Visit info. So a visitor reads "tours are unavailable", clicks the button anyway, and is dropped on an empty section.

This is the third distinct state the template has to cover, and the one nobody designed for: not "open with tours", not "not open at all", but **open with nothing bookable**. Laggan Bay and Portintruan get this right only because they are gated on `Open To Visitors: false`.

**Suggested approach:** Drive the booking affordances off whether any publishable Tours exist, not off `Open To Visitors` — the tour-count check that the not-open variant already does, applied to visitable distilleries too. Suppress the button, the empty Tours heading and the empty Price row when the count is zero, and let the existing notice carry the explanation. Worth checking no other distillery is in the same state when this is done.

## Ask Laggan Bay and Portintruan for images, and for opening dates

**Status:** Logged 29 Aug 2026. Needs Mark to make contact — nothing here is fixable from our side.

**Context:** Laggan Bay is resolved for now: Gordon Brown photographed the distillery itself on 10 June 2026 and released it CC BY-SA 2.0 via Geograph (photo 8346208), so the page has a correct, properly credited hero. But Geograph only publishes it at 640×480, which is soft across a wide hero band — every other distillery hero is 1400–1900px.

Portintruan has **no image at all**, and deliberately so. Searched Geograph and Wikimedia Commons on 29 Aug 2026: there is no freely licensed photograph of the site, and none of the Three Distilleries Pathway that runs past it. The only photograph in existence is Elixir's own, all rights reserved. A Port Ellen or Laphroaig photo was rejected as a stand-in because it would imply this distillery is visible or open, and it is neither. The page renders cleanly with the fallback band in the meantime.

Both also need opening dates. Elixir's site was re-checked on 29 Aug 2026 and still says "in-progress" and "anticipate to begin distilling in 2026", with no visitor-opening date — which is why the third-party "opened summer 2026" reports are still not followed.

**Suggested approach:** One approach to each of Ian Macleod (Laggan Bay) and Elixir (Portintruan): ask for a press image cleared for use with credit, and for a visitor-opening date. Both records' Sources fields carry the full provenance and the reasoning, so whoever picks this up does not have to reconstruct it.

## Homepage day cards: drams for the driver, and structured transport

**Status:** Both DECLINED by Mark on 30 Aug 2026, recorded here so nobody
proposes them again without knowing they were considered and turned down.
The homepage rebuild they were blocking shipped without them.

**Context.** The design mockup for the day-plans section carried two
things no record could support. The first was a **"Driver keeps N drams"**
pill. It reads as a count of distilleries, which is derivable, but it
*claims* a miniatures policy - that each distillery hands the designated
driver a dram to take away - and nothing in Distilleries, Tours or Days
records that. Deriving the number from the stop count would have produced
a figure that was arithmetically right and factually unsourced, which is
the exact failure mode `content-sourcing-standards.md` exists to prevent.
The second was a set of **structured transport fields** to replace the
prose in `Transport Clause`, so the mockup's "Taxi-able" / "Bus 450" /
"No bus route" pills could be rendered and the "Nobody has to drive"
filter counted. Bus route numbers were never held anywhere at all.

**What was done instead**, and why it is better rather than merely
cheaper: where a day's `Transport Clause` mentions a bus, the card links
out to Argyll and Bute Council's own Islay and Jura bus section - the
transport authority that sets the timetable. The site therefore never
states a departure, a route number or a frequency it would have to
maintain, and cannot go stale when the council reissues the timetable.
That was Mark's own reasoning for the approach. Note the council
publishes the 450/451 timetable as a DATED PDF whose URL changes on each
reissue, so the link deliberately points at the section page, not the
file. See `BUS_TIMETABLE_URL` in `src/components/home/HomeDayPlans.tsx`
for the verified URL and why the tidier-looking variants 404 and 403.

**If this is ever revisited:** the honest version of the drams pill needs
a per-distillery field sourced from each distillery's own site, not an
inference from stop counts. The "Nobody has to drive" filter currently
reads the `Transport Clause` prose with the same test `journeyClaimStats`
uses (a clause starting "car" means a car), which is brittle by nature
and known to be - it returns five days today, and it is documented as
conservative: "Car, or walk it from Port Ellen" counts as needing a car
even though it is walkable.

<!-- Homepage journeys/days sections: Airtable content synced 30 Aug 2026
     (Grand Tour Card Description ten -> nine distilleries; Port Ellen day
     Hook corrected). Touched to bust the ISR cache so the branch preview
     renders the new values - see docs/technical-notes.md on why an
     Airtable-only change needs a commit behind it. -->

## Four more mapped fields that nothing reads

**Status:** Found 30 Aug 2026 by auditing all 56 fields on the Journey and
HubDay types against their consumers. Two others found in the same pass
(`gettingThereNote`, `beforeYouBookRows`) were removed from the codebase
and their Airtable columns renamed with a RETIRED marker and a
description saying where to write instead. These four are left mapped
pending Mark's call.

- `Journey.source`
- `Journey` accommodation range fields are NOT in this list - they read
  fine via destructuring in `journeyAccommodationRange`, which a naive
  `.fieldName` grep misses. Worth knowing before running this audit again.
- `HubDay.durationBowmore` - the whole-day length measured from Bowmore.
  Mapped, never rendered; `durationPortEllen` is the one in use.
- `HubDay.mapFeatures` - distinct from the local `mapFeatures` variable
  in DayScreen.tsx, which is computed from `featureStops` and is what
  actually reaches the map.
- `HubDay.source`

**Why this matters more than tidiness.** A field an editor can fill and
no reader can see is the same failure that cost us more than half of
every Accommodation Note (see the firstSentence note in
journey-derivations.ts). The copy passes review, ships, and nothing on
the page shows it is missing. `assertNothingDropped` catches the
truncation case; it cannot catch a field that was never rendered at all.

**Suggested approach:** for each, decide render or retire. Retiring means
removing the mapping AND renaming the Airtable column, because removing
the mapping alone still leaves a column that invites authoring. The two
already done are the worked example.

<!-- Grand Tour journey copy rewritten 30 Aug 2026 against the field
     ownership map: Intro, Card Description, Route Summary, Claim,
     Accommodation Note, Night Notes and the Getting Here car row. Each
     of the five repeated facts now has exactly one authored owner, and
     two of them (the night count and the distillery count) have none at
     all because the code already states both. Airtable-only change, so
     this commit exists to bust the ISR cache. -->

<!-- Day four narrative close rewritten 30 Aug 2026 - it ended on the
     same thirteen words as its own Hook. Airtable-only, so this commit
     exists to bust the ISR cache. -->

<!-- Card Note written for all four Featured Stays 30 Aug 2026.
     Airtable-only, so this commit exists to bust the ISR cache. -->

<!-- Practicalities: D & N MacKenzie replaced by Cresswell Cars 31 Aug
     2026, succession confirmed by matching address and phone on the
     firm own site. Airtable-only, so this commit busts the ISR cache. -->

## Commission disclosure, and the sixteen dead links in the footer

**Status:** Logged 31 Aug 2026, when the first visibly-marked affiliate
link went live on the homepage. Needs Mark. Two of these are legal
rather than editorial.

**What now earns commission, and what says so.** The "Before you go" car
hire card links to Discover Cars, which pays DramStory a commission. It
is marked in place — the row carries "we earn a commission" beside the
name and the anchor carries `rel="sponsored nofollow"` — driven by the
`Affiliate` checkbox on the Practicalities table. That treatment is
deliberate and should be the pattern for every paid link added later:
Islay Car Hire and Cresswell Cars sit directly above it and pay nothing,
and `/journeys/[slug]` states outright that "nothing here is paid to
DramStory". An unmarked commission link between unpaid ones does not just
mislead about that link — it makes every other recommendation on the site
harder to believe.

**The footer promises a disclosure page that does not exist.** "Affiliate
Disclosure" is `href="#"`. A dead disclosure link is worse than no link:
it looks like the page exists and is being kept out of reach. Either
write it or remove the link.

**And it is not alone.** `Footer.tsx` carries SIXTEEN `href="#"` links:

- **Legal, and the urgent ones** — Privacy Policy, Terms of Use, Cookie
  Policy, Affiliate Disclosure. The site runs a newsletter signup that
  collects email addresses and sets cookies, so the first three are not
  editorial niceties. Worth a view from someone who does this for a
  living rather than a best guess written here.
- **Journal categories** — Whisky Reviews, Travel Stories, Islay News,
  Planning Tips, Events. Every published article is currently "Planning
  Tips", so four of the five would be empty pages today; the honest fix is
  probably to render only categories that have articles in them, the same
  way the days filters only show chips that match something.
- **Company** — Work With Us, Distillery Partners, Advertise, Press.
  Distillery Partners in particular reads like an offer to distilleries
  that does not exist yet, on a site actively seeking direct property
  partnerships.
- **Social** — the four icons go nowhere, and the accounts exist.

**Suggested approach:** treat the four legal links and the four social
icons as one job — they are either real or they should not be in the
footer. The category and company links can wait, but each one that stays
dead is a visitor learning that this site's links do not work, on the one
part of the page that appears identically everywhere.

<!-- Where to stay: The Machrie relabelled Machrie and linked to the
     Bowmore area, Bridgend Hotel shortened to Bridgend, both 31 Aug
     2026. Airtable-only, so this commit busts the ISR cache. -->

## The four zones: an "Islay has four moods" homepage section, and four area pages

**Status:** Deferred 31 Aug 2026 — Mark's call, on the grounds that it is a
lot of work against other higher-value options. Not started. Mark holds
both mockups: a homepage section to sit between the day plans and Where
to stay, and a four-page PDF of full area pages, one per zone.

**What it is.** A dark section with Islay's outline on the left, the four
zones tinted with a dot at each centroid, and four cards on the right —
the peated south, the middle, the west, the north east — each with a
drive time from wherever the visitor is sleeping. Hovering a card lights
its zone; clicking goes to that zone's page. The PDF is those pages: hero
and stat bar, come-here-if / go-elsewhere-if, what the stretch is like,
the road itself, the distilleries in road order, two day plans, basing
yourself, eating, what else is here, where to go next.

**Four things block it, and none of them is the component.**

1. **The zones do not exist as records, and are not the same thing as
   Areas.** `Areas` holds three VILLAGES — Port Charlotte, Port Ellen,
   Bowmore. The mockup's areas are four ZONES, with villages sitting
   inside them ("Basing yourself here → Port Ellen"). The taxonomy
   already exists as `Distillery Region` on both Areas and Distilleries
   (South / Central / West / North Islay, plus Jura), but nothing holds a
   zone's own name, description, centroid or copy. Needs a decision
   first: a new Zones table, or Areas extended with a type field so it
   can carry both. Every other piece waits on this.

2. **The drive times need routing data we do not have.** Each card shows
   "25 min away" from the visitor's base, defaulting to Bowmore. That is
   five origins (the four Featured Stays plus the default) against four
   zone centroids — twenty routed figures. `Stay Distillery Distances`
   currently holds FOUR rows, all of them Bridgend Hotel. The approach
   already exists in `scripts/compute-journey-base-legs.mjs`, which
   routes against OSRM and stores the result; this is the same job with
   different endpoints.

3. **There is no coastline data in the repo.** Every existing map
   (`MapCanvas`, `HubDayMap`, `JourneyDayMap`, `JourneyRouteMap`) is
   Leaflet over OpenStreetMap tiles, and the spec explicitly rules tiles
   and road detail out — the point is the island's size, not navigation.
   So Islay's outline has to be sourced as a simplified polygon and
   stored, on the same ODbL basis the site already uses for pins.

4. **"Twenty-five miles end to end" needs a source.** It is the section's
   opening line and the frame for the whole idea. Commonly cited for
   Islay, which is not the same as checked.

**Scale, honestly.** The homepage section alone is a day's work once the
zones and the twenty drive times exist. The four area pages are around a
dozen distinct content blocks each, every one needing sourced copy — that
is comparable to the entire homepage rebuild of 30–31 August.

**Suggested approach:** settle the Zones-versus-Areas question before
anything else, then the twenty routed figures, then the homepage section
with the four cards linking to stub pages, then the full page template
one zone at a time. The section can ship against stub pages; it cannot
ship against no zones.
