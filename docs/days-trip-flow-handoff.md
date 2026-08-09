# Days → Trip flow — developer handoff

Design handoff for the mobile Days/Trip flow. Companion to `DramStory Prototype.html`
(open it in a browser — it is a working, self-contained prototype of everything below).

Written against the repo at `hodgkinsonmark1-pixel/DramStory@main`, tree `68f30a00bd86`.
Conventions from `docs/project-conventions.md` and `docs/brand-voice.md` apply throughout:
British English, honesty over salesmanship, no fabricated specifics, Airtable is the
golden source.

**Colour, radii and shadows use the real tokens** from `src/app/dramstory-legacy.css`
(`:root`, lines 6–14) — `--dark/--navy #1A3A4A`, `--amber #D4A574`, `--copper #B87D4B`,
`--off-white #F5F1E8`, `--stone #E8E2D6`, `--mist #D4C9B8`, `--slate #8A8274`,
`--peat #4A4438`, `--green-light #EAE6DC`, `--green-deep #1A3A4A`, `--radius 12px`,
`--radius-sm 8px`, `--shadow-card 0 2px 12px rgba(26,58,74,0.10)`. The prototype hard-codes
these hexes because it is a standalone file; **use the CSS variables in the build**. The
only colour outside the token set is `#B5502E` for Packed pace, which is already what
`DaysHubGrid.tsx`'s `PacingTag` uses. Relaxed pace and the in-trip state use
`--green-light` on `--green-deep`, matching `PacingTag` exactly — there is no green in
this system, and nothing in this design introduces one.

---

## 1. What this changes, in one paragraph

`/days` today is a filterable list of Hub Days with a distillery dropdown. This design
turns the same content into a **planning flow**: the homepage asks three questions
(where you're staying, how long, which distilleries), `/days` answers them with a
ranked and grouped list, a trip accumulates in a persistent bar, a trip review page
shows the shape of the whole trip, and "Make this day my own" hands the day to the
existing `/journey` planner pre-loaded, which saves back. Nothing about the day
narratives changes — they are the asset this is built around.

---

## 2. Data model and state

### 2.1 What already exists and should be reused

`src/lib/trip-context.tsx` already covers most of this. **Do not build a parallel store.**

| Need | Existing API |
|---|---|
| Days in a trip | `days: ItineraryDay[]`, `addDay(sourceHubDaySlug?)`, `removeDay(i)` |
| Reorder days | `moveDay(index, direction)` — already re-labels positionally |
| Stops in a day | `addStop`, `addFeatureStop`, `removeStop(dayIndex, stopId)` |
| Reorder stops | `moveStop(dayIndex, stopIndex, direction)` |
| Tour choice | `setTourForStop(dayIndex, distillery, tour)` |
| Visit length | `setStopMinutes(dayIndex, id, minutes)` |
| Dates | `tripDates`, `setDateRange`, `setDateMonth`, `setDateMode` |
| Base | `accommodation` per day, `setAccommodationFromDay(i, acc, scope)` |
| Provenance | `ItineraryDay.sourceHubDaySlug` |
| Persistence | `localStorage` key `dramstory-trip-v2` + cross-tab `storage` sync |

Drive times: `estimatedDriveMinutes()` and `formatDuration()` in `src/lib/drive-time.ts`
(haversine ÷ 40 km/h, rounded to 5 min). The prototype now uses the identical formula so
numbers match. Visit lengths: `parseAvgVisitMinutes()` and `parseFeatureDurationMinutes()`.

Featured stays: `src/lib/featured-stays.ts` — The Machrie, Port Charlotte Hotel,
Ardbeg House, Bridgend Hotel, with verified coordinates. `FEATURED_STAYS[0]` (The
Machrie) is already the default for a new day, which is why the homepage default is
The Machrie — it matches what the trip context would do anyway.

### 2.2 What is new

**Answers (site-wide).** Mark has confirmed this should persist across the whole site,
not just the trip flow.

```ts
interface TripAnswers {
  base: string;              // FEATURED_STAYS slug or area id — always set
  baseKind: "hotel" | "area";
  nights: number;            // default 3
  picks: string[];           // distillery slugs — RANKING input, never a filter
}
```

Store alongside the existing trip in `dramstory-trip-v2` (a new `answers` key on
`StoredTrip`) so it inherits hydration, persistence and cross-tab sync for free.
Expose via `useTrip()`. Setting a base should call `setAccommodationFromDay(0, acc, "all")`
so the answer and the itinerary never disagree.

Site-wide consumers, in priority order: distillery pages ("22 min from The Machrie"),
area pages (compare against the chosen base), `/stays` (mark the chosen one), Local
Features. Every one of these should degrade silently when `base` is null.

**Per-day derived values.** Computed, never stored:

- `driveMinutes(day)` — base → stop₁ → … → stopₙ → base
- `dayCost(day)` — sum of chosen tour prices
- `schedule(day)` — start 09:30, alternate leg + visit, return `{ arrive, leave, dur }`
  per stop plus a `home` time
- `dayGroup(day)` — see §4.2
- `pickHits(day)` — intersection of day's distilleries with `answers.picks`

**Anchors.** A day needs to know which stops are the reason it exists — Ardbeg in
"Ardbeg, on Foot" cannot be removed without the day ceasing to be that day. Add an
`anchor` boolean on the Day Stops table in Airtable, defaulting true for distillery
stops on single-distillery days. Anchors are not droppable or swappable in the UI.

**Opening days.** `closedDays: number[]` (0 = Sunday) per distillery in Airtable. Needed
for the closure warnings in §4.4. The prototype's values are illustrative placeholders —
they must be sourced per `docs/content-sourcing-standards.md` before shipping.

---

## 3. Screens

Five screens, one thumb path, no dead ends.

```
Homepage  →  /days  →  trip review  →  a day  →  /journey (planner)  →  back to trip
```

### 3.1 Homepage — the question

A dark block directly under the hero. One sentence, three inline dropdown controls:

> I'm staying **at The Machrie** ▾ for **3 days** ▾, and I'd like to see **any distillery** ▾.

- Pre-answered on arrival. Nothing is gated; the button always works.
- Base sheet has two sections: **Featured places to stay** (the four from
  `FEATURED_STAYS`, each with one line on why you'd choose it) and **Or just an area**
  (Port Ellen, Bowmore, Port Charlotte, Port Askaig). There is deliberately **no
  "anywhere on Islay" option** — it produced an unranked list, which is the one thing
  this screen exists to avoid. The base is always a real place.
- Distilleries sheet says plainly: *This reorders the list — it never hides a day.*
- CTA: "Show me the days" → `/days`.

**No dates here.** Dates were tried on this screen and removed — too much commitment
before anyone has seen a day. They live on the trip review instead (§3.3).

### 3.2 `/days` — the answer

- **Answers bar** (dark, sticky top): `The Machrie · 3 days · any distillery` + Change.
  Deep links from search show defaults; never blank.
- **Heading**: "6 days work well from The Machrie" / "Sorted by how far you'd drive
  from your door".
- **Picked distilleries first**: if `answers.picks` is non-empty, a section titled
  *The days with your distilleries*, then a rule reading *Everything else*. Matching
  cards get a `★ Includes Laphroaig` banner, a warm border, and the picked name tinted
  within the route line.
- **Groups** (§4.2) with editorial headers and a one-line explanation each.
- **Day card**: pace tag · drive · price → title → route line → hook → one action.
  Cards are discrete bordered cards on a slightly darker page — the current flat
  stacked list reads as a queue.
- **Trip bar** (dark, sticky bottom): progress ring, `3 days · 5 distilleries · one day
  free`, `4 of 11 distilleries · £272.50pp`, Review button.

### 3.3 Trip review

Order matters — this is the sequence that tested best:

1. **Dates prompt** — dashed card: *Know your dates? Add them →* with the reason
   underneath. Once set, collapses to a summary row with Change. Writes to the existing
   `tripDates`.
2. **The shape of your trip** — one bar per day, weighted and coloured by pace, labelled
   with the date, plus a read: *Two full days back to back — consider swapping one down
   the list.*
3. **Distilleries visited** — 11 segments filling, with an editorial line (§5).
4. **Days** — number (pace-coloured) with ▲▼ to reorder, title, date, pace, drive, cost,
   stop chips with × (anchors excluded), and *Make this day my own →*.
5. **Still to sort** — the honest loose ends (§4.4).
6. **The trip in numbers** — distilleries, time on the road, indicative cost, with
   "Tours only — no travel, food or stays."

### 3.4 A day

- Header: title, date, pace, drive, cost.
- Narrative: two lines, **Read on** unfolds in place. This is the emotional payload —
  it must not be behind a navigation.
- **The day's shape**: *Starting 9:30, back by 13:10 — reorder, swap or drop anything.*
- Stops grouped under MORNING / AFTERNOON / EVENING, each showing arrival time, duration,
  name, chosen tour and price. Distillery stops open a tour sheet. Non-anchors get
  ▲ / Swap / Drop.
- Closed stop: red-tinted card, "Closed on Sundays".
- Footer: *Want to reshape it properly?* → **Make this day my own →**

### 3.5 `/journey` — pre-loaded

The planner already exists and should not be rebuilt. It needs **one new element**: a
context bar under the header.

> ‹ Back · **Day 2 loaded from a day plan** — Ardbeg, on Foot. Change anything; it saves
> back to your trip. · Reset to the original · Save to day 2

Plus, in the itinerary rail: the ANCHOR mark, and a line offering back any stop dropped
earlier ("Port Mòr was in this day plan — put it back?").

Mobile shape of the planner: the desktop rail cannot survive 390px. Map fills the
screen; the itinerary becomes a **bottom sheet with three heights** — peek (total
journey + first stop), half (the stop list with reorder), full (list + nearby). Same
`MapCanvas` logic, different container. See §6.

---

## 4. Rules

### 4.1 Ranking, never filtering

Picked distilleries **reorder** the list and surface a section at the top. They never
remove a day. The reason is commercial as much as editorial: someone who has heard of
Laphroaig and Lagavulin will plan the trip they already had in their head, and never
discover Bunnahabhain or the Jura crossing. Same principle as the existing
`TODAY_EXCLUDED_DISTILLERY_SLUGS` comment — the pool stays whole.

### 4.2 Grouping

Two label sets, chosen by whether a base is set. Using distance wording with no base
asserts a proximity the app cannot know.

**Base set** — bucket by `driveMinutes`:
| Bucket | Header | Sub |
|---|---|---|
| ≤30m | Close to your door | Little or no driving — the car can stay put |
| ≤70m | A short drive out | An hour or so on the road, all in |
| >70m | Worth the drive | A proper day out — leave early |
| ferry | Needs a ferry | The crossing sets your timings, not you |

**No base** — not a state that can occur: the base always defaults to `FEATURED_STAYS[0]`
(The Machrie), matching `addDay()`'s own fallback. Keep the pace-worded label set
(Gentle days / A fuller day / Full days / Needs a ferry) only if a future entry point can
reach `/days` with no base.

### 4.3 Pricing

Never a bare number where a choice exists. `from £22.50pp` when the cheapest tour is
selected and a dearer one is available; `£130pp · upgraded` once changed. Otherwise
`£250pp`. This stops Lagavulin reading as "the expensive day" when it is "the day with
a choice", and it matches the brand-voice rule about honesty over salesmanship.

### 4.4 Still to sort

Generated, not written. Only include what is true of this trip:

- ferry day present → check Feolin return times
- any 18+ / online-only tour → book direct, named
- a stop closed on its day's date → which day, which stop, what to do
- no dates set → add them
- accommodation for N nights at the chosen base
- how many days actually need a car

### 4.5 Edited days

Editing produces the visitor's own copy. The published Day is never mutated — Classic
Tours built on it must stay stable. Surface as a `YOUR VERSION` tag on the trip review,
with a reset. `sourceHubDaySlug` already carries the link back.

---

## 5. Interaction and motion

Restrained. No confetti, no badges, no points — that vocabulary would fight the rest of
the site. The reward is always a **fact about their trip**.

| Moment | Behaviour |
|---|---|
| Add a day | Card scales 1 → 1.05 → 1 over 420ms (`cubic-bezier(.3,1.4,.5,1)`); trip summary rises 14px and fades in over 340ms |
| Milestone | Amber bar rises above the trip bar, holds ~2.3s, fades up. `role="status"` |
| Progress ring | `stroke-dashoffset` transitions over 500ms; turns green at 100% |
| Sheet heights | `height` transition 280ms `cubic-bezier(.22,.68,.32,1)` |
| Save from planner | Green receipt bar on the trip: what changed + undo |
| Drop a stop | Ghost row with "undo" — never silent removal |

**Milestone copy** (first match wins):
- first day → *Day one. The rest is easier.*
- days === nights → *That is your 3 days filled — have a look at the shape of it.*
- days > nights → *Day 4 — one more than you planned. No harm in options.*
- ≥8 distilleries → *8 distilleries. More than most people manage in a week.*
- ≥5 distilleries → *5 distilleries now — a proper spread of the island.*
- ferry day → *A ferry day. That is a different island entirely.*
- otherwise → *Day 2 added — 1 to go.*

**Collection copy** by count: 1 → *One down. Most visitors manage three or four in a
long weekend.* · 2–3 → *A good start — three or four is a comfortable weekend.* ·
4–5 → *More than most people fit into a week here.* · 6–8 → *That is serious ground
covered. Pace yourself.* · 9–10 → *All but a couple. The last ones are the awkward
ones.* · 11 → *Every distillery on Islay. Very few people manage that in one trip.*

---

## 6. Map

Reuse `MapCanvas` — the stop data, marker rendering, drive-time maths, layer toggles and
journey total are all viewport-agnostic. What changes on mobile:

- Itinerary rail → bottom sheet, three heights.
- **`fitBounds` must offset for the sheet.** With a sheet covering the bottom 40%,
  "centred" is not centre; pins hide underneath. Use `paddingBottomRight` sized to the
  current sheet height. This is the bug every mobile map ships with once.
- Pan bounds locked to `[[55.51, -6.62], [56.02, -5.62]]`, `minZoom: 9`.
- A **"Whole day"** recentre control, plus Leaflet zoom controls.
- Reordering happens in the sheet, **never by dragging on the map** — a mis-drag that
  silently moves a stop is not recoverable by feel.
- Tapping a pin raises a card: name, `Nm from your last stop`, consequence
  (*adds a distillery to this day*), and a button naming the position —
  **+ Add after Ardbeg**, not "Add".

---

## 7. Accessibility

Non-negotiable, and cheap now:

- **44 × 44px minimum** on every interactive target. The reliable fix is a floor on the
  container (`button { min-height: 44px }`), not per-control padding — buttons centre
  their content vertically by default so nothing shifts.
- Every icon-only control needs an `aria-label` naming its object: *Remove Kildalton
  Cross from this day*, not "×". Same for every `+ Add` in a list of places.
- Pace is carried by colour in the rhythm strip — each bar needs
  `role="img" aria-label="Day 2: ferry day, Relaxed"`.
- The collection strip needs one `aria-label` listing what is filled.
- Milestone and save messages are `role="status"`.
- Visible focus: `outline: 3px solid` at 2px offset.
- Back links state their destination: *Back to my trip*, not "Back".

---

## 8. Open questions

1. **Anchors** — who decides which stop is an anchor, and does it need to be editable
   per Day in Airtable, or is "all distillery stops on a single-distillery day" enough?2. **Opening days** — where do `closedDays` come from, and who keeps them current? The
   warnings are only worth shipping if they are right; a wrong closure warning is worse
   than none.
3. **Site-wide base** — confirmed as site-wide. Which pages consume it first, and what
   does a distillery page show when it is null?
4. **Start time** — the schedule assumes 09:30. Should that be adjustable, and should
   ferry days override it?
5. **Trip length vs days added** — nothing currently stops someone adding six days to a
   three-day trip. Nudge, block, or let it ride (current design: nudge only)?
6. **Save as a tour** — is a saved trip a private artefact, a submission for review, or
   the input to a published Classic Tour? This decides whether it needs login first.
7. **Swap suggestions** — currently the five nearest non-distillery stops. Should
   distilleries be swappable too, and should suggestions be curated per Day?

---

## 9. Phasing

Mark has asked for the full flow. Suggested order within that, so each step is
independently shippable:

1. **Answers + site-wide base.** `TripAnswers` on the trip context, homepage sentence,
   answers bar. Nothing else depends on new Airtable fields.
2. **`/days` rebuild.** Grouping, ranking, picked-first section, day cards, trip bar
   with ring and milestones. Uses existing `HubDay` data only.
3. **Trip review.** Shape strip, collection, day reorder, Still to sort, numbers.
   Dates prompt wires to existing `tripDates`.
4. **Day screen.** Schedule times, tour sheet, swap, drop with undo. Needs `anchor`
   and `closedDays` in Airtable — this is the step that blocks on content.
5. **Planner context bar + save-back.** The seam. Small code, high value.
6. **Planner mobile sheet.** Largest single piece of work; worth prototyping the sheet
   for real before committing, per the note in §6.

---

## 10. Copy deck

Every string in the flow, for review in one place.

### Homepage
- `Where whisky adventures begin`
- `Islay, planned properly — by people who've driven every one of these roads.`
- `PLAN YOUR TRIP`
- `I'm staying {base} for {n} days, and I'd like to see {picks}.`
- `Answer as much or as little as you like — you'll get {n} ready-made days either way, in the order that suits you.`
- `Show me the days`

### Base sheet
- `FEATURED PLACES TO STAY` / `OR JUST AN AREA`
- The Machrie — `On the links above Laggan Bay, halfway between north and south`
- Ardbeg House — `Charlotte Street, Port Ellen — the peated south on your doorstep`
- Port Charlotte Hotel — `Victorian, on the shore — Bruichladdich and Kilchoman close by`
- Bridgend Hotel — `Where the island's roads meet — nothing is far from here`
- Port Ellen — `The south — Laphroaig, Lagavulin, Ardbeg`
- Bowmore — `The middle — everything within reach`
- Port Charlotte — `The Rhinns — Bruichladdich and Kilchoman`
- Port Askaig — `The north-east — Caol Ila, Ardnahoe, and the Jura ferry`
- anywhere on Islay — REMOVED. Base is always a real place; default is The Machrie.

### Distilleries sheet
- `DISTILLERIES YOU'D LIKE TO SEE`
- `This reorders the list — it never hides a day.`

### /days
- `YOUR ANSWERS` · `Change`
- `{n} days work well from {base}` / `{n} days, most-loved first`
- `Sorted by how far you'd drive from your door`
- `Tell us where you're staying and we'll re-sort by how far you'd drive`
- `{n} of them include {distillery}` / `a distillery you picked`
- `The days with your distilleries` — `{names} — shown first, but nothing below is hidden`
- `EVERYTHING ELSE`
- `★ Includes {names}`
- `+ Add as a day` / `✓ Day {n} of your trip · remove`
- `YOUR TRIP` · `No days yet` · `Review`

### Trip review
- `{n} days from {base}`
- `Know your dates? Add them →`
- `We'll flag anything closed on the day you're going, and which day the ferry decides.`
- `THE SHAPE OF YOUR TRIP` · `A steady rhythm — nothing back to back.`
- `Two full days back to back — consider swapping one down the list.`
- `The ferry day is first — fine, but it is the one day weather can ruin.`
- `DISTILLERIES VISITED`
- `STILL TO SORT · {n}`
- `THE TRIP IN NUMBERS` · `Tours only — no travel, food or stays.`
- `Save as a tour` · `Email this trip to myself`
- `YOUR VERSION`

### Day
- `THE DAY'S SHAPE` · `Starting 9:30, back by {time} — reorder, swap or drop anything`
- `MORNING` / `AFTERNOON` / `EVENING`
- `Read on` / `Show less`
- `ANCHOR · the reason for this day`
- `Swap` / `Drop` · `{name} dropped · undo`
- `Closed on {Day}s`
- `Want to reshape it properly?` · `Make this day my own →`
- Swap sheet: `SWAP {NAME} FOR` · `Nearby, and it keeps its place in the day.` · `Keep {name}`

### Planner
- `Day {n} loaded from a day plan — {title}. Change anything; it saves back to your trip.`
- `Reset to the original` · `Save day`
- `YOUR ITINERARY · DAY {n}` · `{time} total journey` · `Pull up ▲` / `Show the map ▼`
- `NEARBY, NOT YET IN YOUR DAY`
- `+ Add after {previous stop}`
- `{name} was in this day plan — put it back?`
- `Day {n} saved. {what changed}` · `undo`

### Standing notice (unchanged from live)
- `These are inspiration, not bookings.` Tours, prices and availability reflect what was
  confirmed at time of writing. Always check the distillery's own site for your travel
  dates before building a day around a specific tour.
