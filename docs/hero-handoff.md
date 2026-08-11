# Desktop homepage hero — design specification

Companion to `docs/days-trip-flow-handoff.md`, which specifies the mobile
`/days` → trip flow. This document specifies the **desktop homepage hero** only.
Mobile is unchanged by it.

Reference screenshots, in `docs/design/hero/`:

| File | What it shows |
|---|---|
| `hero-01-at-rest.png` | State one — the poster, before anything is pressed |
| `hero-02-answered-planning.png` | State two, planning — days on the right, pick highlighting |
| `hero-03-today.png` | State two, on Islay today — stops with arrival times |
| `hero-04-dreaming.png` | State two, dreaming — reading, anchored to an area |

The screenshots are the visual truth. Where this document and a screenshot
disagree, follow the screenshot and tell me.

---

## 1 · Why this exists

The live homepage asks the visitor the same thing twice.

- **"Where are you in your story?"** offers three timeframes — on Islay today,
  planning a trip, just dreaming.
- **"Plan your trip"** offers a sentence — base, nights, distilleries.

Both land on `/days`. A door that opens onto a room you can already reach is not
a door, it is a second lock. The visitor has to make a choice that has no
consequence, before they have any way of telling the options apart.

There are only two honest fixes: merge the questions, or make them lead
genuinely apart. **This design merges them.** The timeframe becomes the
sentence's first clause, so there is one question, and the signal is kept rather
than thrown away.

The second problem is that the homepage describes the product instead of being
it. On a 1440px screen there is room to show the answer while the question is
still being asked — which a phone physically cannot do. That is the whole
argument for the two-state hero: **nobody has to trust that the ordering is
real, because they watch it happen.**

---

## 2 · The two states

### 2.1 State one — at rest

See `hero-01-at-rest.png`.

Full-bleed hero (existing video where present, otherwise
`public/images/journeys/islay-grand-tour-hero.jpg`) with a navy gradient over
it, roughly `rgba(26,58,74,.62)` at the top to `rgba(26,58,74,.88)` at the
bottom. Header: `public/logo-white.png` left, nav right in the live order —
Login (copper), Distilleries, Journal, Contact.

Centred over the image:

- `h1` "Where whisky adventures begin", ~54px, `--font-display`, line-height
  1.02, letter-spacing -.015em.
- Standfirst, ~17px, one line.
- The question as one sentence, ~32px, `line-height: 1.85`. The generous line
  height is not decorative — the inline triggers need vertical room or the
  underlines collide with the line below.
- One amber pill button: **Show me the days**.

Nothing else. No result cards, no secondary call to action, no scroll hint. A
visitor who never presses anything has had the poster, and that is a legitimate
outcome.

**The answers are pre-filled.** Nobody should ever face a blank form:

> I'm planning a trip, staying **at The Machrie** for **3 days**, and I'd like to
> see **any distillery**.

The Machrie is the default because it is already `FEATURED_STAYS[0]` and already
`addDay()`'s fallback in `src/lib/trip-context.tsx`. The design follows the code
that exists rather than introducing a second idea of "default base".

### 2.2 State two — answered

See `hero-02-answered-planning.png`.

Pressing **Show me the days** does **not** navigate. The hero reflows in place:

- Film narrows to the left 600px and keeps playing. It is masked, not swapped,
  and never cuts.
- The sentence is the **same DOM element** throughout — it translates left,
  scales to ~25px and re-wraps. A `YOUR ANSWERS` kicker appears above it.
- The right half becomes `--off-white` and fills with the column.
- Nav moves into the right column.

From then on every further change to an answer re-sorts the column **in place**.

### 2.3 The motion

This is the whole risk in the design. Done badly it reads as the page breaking.

| Property | Value |
|---|---|
| Duration | ~450ms |
| Easing | `cubic-bezier(.22,.68,.32,1)` |
| Sentence | One element, transformed. **Never** fade out + fade in |
| Film | Continuous playback, masked. Never re-mounted |
| Cards | Enter **after** the left settles, ~40ms stagger |
| Re-sort | Cards animate to new positions (FLIP). Never blink |
| `prefers-reduced-motion` | Snap straight to state two, no animation |

The film's continuity is what stops the change reading as navigation. If the
video re-mounts and stutters, the whole effect fails.

### 2.4 Persistence

- State two persists for the session and across return visits. A returning
  visitor lands in state two, not back at the poster — once you have seen days,
  the poster is a downgrade.
- The button reveals once. After that, `See all fifteen days →` at the foot of
  the column is what carries people to `/days`.
- Answers persist site-wide (see §7).

---

## 3 · The sentence

Four clauses, each an inline dropdown trigger styled as the sentence's own
words: copper underline (`inset 0 -3px 0` in `--copper`), `--amber-light` text,
`▾` caret. They must read as words, not as form controls — that is the entire
charm of the device, and a select element with a chrome border destroys it.

### 3.1 Clause 1 — timeframe

Three options. **Each changes the shape of the sentence and the kind of thing
the column returns.** This is the justification for the clause existing; if all
three returned day cards in a different order, it should be cut.

| Option | Sentence becomes | Column returns |
|---|---|---|
| I'm planning a trip *(default)* | four clauses | **days** |
| I'm on Islay today | two clauses | **stops with times** |
| I'm just dreaming | two clauses | **reading** |

### 3.2 Clause 2 — base

`staying at/in …`. Note the preposition changes: **at** a hotel, **in** an area.

A sheet in two groups:

- **Featured places to stay** — the four in `src/lib/featured-stays.ts`, The
  Machrie first and default, each with one line on why you would choose it.
- **Or just an area** — Port Ellen, Bowmore, Port Charlotte.

Setting a base **must** call `setAccommodationFromDay(0, acc, "all")` so the
answers and the itinerary can never disagree. This is the single most common
source of state bugs in this design.

Only present in the planning state.

### 3.3 Clause 3 — nights

2 to 6+. Only present in the planning state.

### 3.4 Clause 4 — distillery picks

Multi-select, all eleven.

> **Picks rank the list. They never filter it.**

Nothing is ever hidden. Half the value of this product is the day somebody did
not know to ask for, and a filter that returns two results throws that away.
This rule is repeated in the mobile handoff and is the one most likely to be
"helpfully" broken.

Only present in the planning state.

---

## 4 · The three columns

### 4.1 Planning — days

See `hero-02-answered-planning.png`.

**Header.** `THE DAYS WITH KILCHOMAN · 2` when picks exist, otherwise
`CLOSEST TO THE MACHRIE`. Right-aligned: `15 days in all`. Both `nowrap`.
2px `--navy` bottom border.

**Pick highlighting** — identical rules to mobile, §4.2 of the days handoff. The
desktop column is the same component with more room, not a second
implementation:

- Matching days lift above an `EVERYTHING ELSE` divider.
- Each match gets a 1.5px `--amber-light` border and an `★ Includes Kilchoman`
  banner on `--amber-pale`.
- The picked name is tinted wherever it appears in the route line —
  `--amber-pale` background, 4px radius, 1px 5px padding.

**Card.** Pace tag (Relaxed `--green-deep`, Moderate amber, Packed rust), drive
time and price on one `nowrap` line, title ~22px display, one-line hook.

**Foot.** `See all fifteen days →` in `--copper`.

### 4.2 On Islay today — stops with times

See `hero-03-today.png`.

Sentence: `I'm on Islay today, near Port Ellen.` Two clauses. Nights and picks
disappear entirely.

**Read the clock; do not ask for it.** The time of day is something the browser
knows. Use it, plus sunset, published tour durations and the existing
`estimatedDriveMinutes()` in `src/lib/drive-time.ts`, to decide how many
distilleries fit — then say so in the header: `TIME FOR TWO DISTILLERIES`, with
`14:20 now · sunset 20:52` alongside.

Each row shows the arrival time that stop would have if the visitor left now:

```
14:32  if you go now    Ardbeg
                        12 min from you · Classic tour runs 60 min, from £22.50
                        · usually last entry late afternoon          [Check →]

15:44  after Ardbeg     Lagavulin
                        5 min back along the road · Classic tour 60 min, from
                        £22 · the second of your two                 [Check →]

17:00  if there's light Kildalton Cross
                        12 min further east · free, no booking · a quiet end
```

**Claim nothing about availability.** No live feeds, no "4 places left", no
"fully booked". Published durations and prices only. Carry an amber note:

> **Before you drive.** Tour times change through the season and tours do sell
> out — ring ahead or check the distillery's own site. We can tell you what's
> near and what fits; we can't tell you what's free.

That honesty is what makes the state cheap to build **and** trustworthy. A
half-informed version that tells somebody a tour is running when it isn't is the
one mistake this site cannot afford.

**Foot.** `View on the interactive map →`, linking to `/journey` with those
stops loaded.

Sets a location for the session. Persists nowhere — it is a today thing.

### 4.3 Just dreaming — reading, anchored to an area

See `hero-04-dreaming.png`.

Sentence: `I'm just dreaming about Islay, and I'm drawn to the peated south.`

**Four areas, named by character, not by village:**

| Area | Distilleries | Centroid |
|---|---|---|
| The peated south | Laphroaig, Lagavulin, Ardbeg, Port Ellen | ~55.632, -6.145 |
| The middle | Bowmore | ~55.758, -6.289 |
| The west | Bruichladdich, Kilchoman | ~55.776, -6.383 |
| The north east | Caol Ila, Ardnahoe, Bunnahabhain | ~55.871, -6.118 |

Between them they hold all eleven. A dreamer is choosing a kind of whisky and a
kind of coast, not a village they have never been to — "the peated south" is a
real answer to *what are you drawn to*; "Port Ellen" is an answer to a question
they have not reached yet.

**Each area needs only a centroid.** That is the whole plumbing cost: when the
daydream becomes a trip, the planning state inherits a base and the days re-sort
from it. Confirm the coordinates against real distillery positions before use.

**Column contents, in order:**

1. Header `THE PEATED SOUTH · 4` with `read it, or build it`.
2. Scrollable chip row of the four areas — `flex:none; white-space:nowrap` on
   each, `overflow-x:auto` on the row, as the planner's layer strip already does.
3. **Journal** card.
4. **Distillery** card — `DISTILLERY · 4 IN THE SOUTH` with `All eleven →` on
   the right, one featured, the others named in the copy. Highlighting one
   distillery and stopping there is a dead end for somebody browsing.
5. **Area page** card — `WHERE YOU'D BASE YOURSELF — Port Ellen`. This is where
   the village appears: the area page turning a mood into a location.
6. **Navy card** — `OR START FROM NOTHING · Build it on the map`, linking to
   `/journey`.

**The newsletter does not go in the hero.** It belongs further down the page.

**No hotel in the area list.** The clause asks what you are drawn to, which is a
question about landscape. A hotel as a fifth option reads as an advert in a
sentence otherwise made of places, and it is the only option that could not fill
the column with an area page and its distilleries. The Machrie already has the
stronger placement — in the planning state the clause asks where you are
*staying*, so a hotel is a true answer, top of the featured stays and the
default. If more commercial weight is wanted, put it in the middle column as a
where-to-stay card: geography first, hotel as consequence.

---

## 5 · Tokens and styling

All colour, radii and shadows come from the `:root` block in
`src/app/dramstory-legacy.css`. **No literal hexes.**

Two mistakes that have already been made once each:

- **Cards are white with a `--stone` border AND `--shadow-card`, on an
  `--off-white` page.** If the page surface and the card border resolve to the
  same token, the cards disappear. `DaysHubGrid.tsx`'s DayCard is the reference.
- **Relaxed pace and in-trip states use `--green-light` on `--green-deep`,**
  exactly as `DaysHubGrid.tsx`'s `PacingTag` already does. There is no other
  green in this system; do not introduce one.

Sentence trigger underlines use `--copper`, not navy — on the navy hero a navy
underline is invisible, and the underline is the only cue that the words are
editable.

---

## 6 · Accessibility

- Every interactive target at least 44×44px. Set the floor on the container,
  not per-control padding.
- Every icon-only control needs an `aria-label` naming its object.
- The sentence triggers are `<button aria-haspopup="dialog" aria-expanded>`,
  not styled `<select>`s. Their accessible name must include what they set —
  "Change where you're staying: The Machrie".
- The state change must be announced. `role="status"` on a live region saying
  "Fifteen days, closest to The Machrie" when state two arrives; screen reader
  users get no benefit from a reflow they cannot see.
- Pace must not be carried by colour alone — the text label does that work
  already, so do not remove it.
- Full keyboard path: sentence triggers → sheet → button → column.
- Honour `prefers-reduced-motion` (§2.3).

---

## 7 · State

`src/lib/trip-context.tsx` already holds most of what this needs. **Extend it.
Do not build a parallel store.**

Add:

```ts
type Timeframe = "planning" | "today" | "dreaming";

interface TripAnswers {
  timeframe: Timeframe;
  base: string;                  // featured stay slug or area id
  baseKind: "hotel" | "area";
  nights: number;
  picks: string[];               // distillery slugs
  dreamArea?: string;            // area id, dreaming only
  todayNear?: string;            // village, today only — session-scoped
}
```

Persist in the existing `dramstory-trip-v2` key so it inherits hydration and
cross-tab sync for free.

**Deep links still work.** Someone arriving at `/days` from search with no
answers gets a sensible default list and a bar reading "anywhere on Islay". The
homepage is the front door, not the only door.

---

## 8 · Mobile does not do this

There is no room for two columns on a phone. Mobile keeps the single-question
hero and navigates to `/days` as specified in `docs/days-trip-flow-handoff.md`.

This is a desktop-only behaviour behind a breakpoint, **not a shared component**.
The sentence control itself is shared; the two-state reflow is not.

---

## 9 · Build order

Stop after each phase and show a diff summary.

**Phase 1 — the sentence.** `TripAnswers` in `trip-context`, persisted. The
sentence control with all four clauses and their sheets, in state one only.
Pressing the button still navigates to `/days`, as it does today. Ship-safe on
its own.

**Phase 2 — the reflow, planning only.** State two, the transition, the days
column, pick highlighting, and re-sort on answer change. This is the phase the
design lives or dies on.

**Phase 3 — dreaming.** Four areas and their centroids, the chip row, the
reading column, the map card. Cheap: existing content, re-surfaced.

**Phase 4 — today.** The clock maths, the stops column, the honesty note.

---

## 10 · Decisions I cannot make

1. **Does the base persist site-wide?** The design assumes yes — a distillery
   page saying "22 min from where you're staying". Cheap now, expensive later.
2. **Do trips belong to a browser or an account?** localStorage is right for
   now. Decide before "Save as a tour" ships; merging an anonymous trip into an
   account afterwards is the expensive kind of change.
3. **Which villages does the `near …` clause offer** in the today state?
4. **Are the four area centroids right?** They are estimates in §4.3 and should
   be confirmed against real distillery positions.

---

## 11 · Copy deck

Use verbatim. British English.

**State one**

- h1: `Where whisky adventures begin`
- Standfirst: `Islay, planned by people who've driven every one of these roads.`
- Kicker: `PLAN YOUR TRIP`
- Sentence: `I'm planning a trip, staying at The Machrie for 3 days, and I'd like to see any distillery.`
- Button: `Show me the days`

**State two, planning**

- Kicker: `YOUR ANSWERS`
- Note: `Change anything and the days re-order beside you. Nothing is ever hidden — fifteen, always.`
- Header: `THE DAYS WITH KILCHOMAN · 2` / `15 days in all`
- Banner: `★ Includes Kilchoman` · `★ Includes Kilchoman and Bruichladdich`
- Divider: `EVERYTHING ELSE`
- Foot: `See all fifteen days →`

**State two, today**

- Sentence: `I'm on Islay today, near Port Ellen.`
- Note: `One clause fewer than that, even — we read the clock ourselves. It's 14:20, so there's time for two distilleries if you leave now, or one at an unhurried pace.`
- Header: `TIME FOR TWO DISTILLERIES` / `14:20 now · sunset 20:52`
- Row labels: `if you go now` · `after Ardbeg` · `if there's light`
- Amber note kicker: `BEFORE YOU DRIVE`
- Amber note: `Tour times change through the season and tours do sell out — ring ahead or check the distillery's own site. We can tell you what's near and what fits; we can't tell you what's free.`
- Foot: `View on the interactive map →`

**State two, dreaming**

- Sentence: `I'm just dreaming about Islay, and I'm drawn to the peated south.`
- Note: `No dates, no obligation — but a real place, so everything beside it is anchored somewhere and turns into a plan the moment you want one.`
- Header: `THE PEATED SOUTH · 4` / `read it, or build it`
- Chips: `The peated south` · `The middle` · `The west` · `The north east`
- Card kickers: `JOURNAL` · `DISTILLERY · 4 IN THE SOUTH` · `WHERE YOU'D BASE YOURSELF` · `OR START FROM NOTHING`
- Distillery link: `All eleven →`
- Map card: `Build it on the map` / `Every distillery, beach and bar on one map — drop stops where you like.`
