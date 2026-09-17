# Accounts, saved trips and badges — plan for review

**Status:** draft for Mark's review. No code written. Nothing in this document
is settled until he has marked it up.

**Date:** 3 September 2026

---

## 0 · The constraint that shapes everything below

> **Count places, never measures.**

Every badge, counter and milestone in this plan records somewhere a visitor
**went**. None records anything they **drank**.

This is not squeamishness. The CAP Code's governing principle for alcohol
marketing is that it must not "imply, condone or encourage immoderate,
irresponsible or anti-social drinking", and a mechanic that rewards a rising
number of measures does exactly that. The Portman Group's digital guidance
points the same way.

It is also the right call on voice. DramStory sells the island and the road.
"Nine of ten distilleries on Islay" is a travel achievement a whisky person
already keeps in their head. "Thirty drams" is a different product, and not
one worth building.

Two rules follow from it:

- **No streaks, no leaderboards.** Streaks reward frequency, and frequency of
  alcohol-related activity is the wrong thing to incentivise even when the
  thing being counted is technically travel.
- **18+ has to mean something at registration**, since badges are a logged-in
  feature and the under-18 targeting rules bear on anything shareable.

---

## 1 · What an account is for

In priority order:

1. **The trip survives the device.** Planned on a laptop on Sunday, in your
   pocket on Islay on Thursday. This is the whole case; everything else is
   secondary.
2. **Several named trips.** "May with Dad", "Fèis Ìle 2027". A library, not a
   single working document.
3. **A reason to come back after the trip.** Marking distilleries visited is
   the only feature here that pulls someone back once they are home, which is
   also when they are most likely to plan the next one.

**What an account is NOT for:** gating the planner. A signed-out visitor keeps
everything they have today. The two-minute booking objective does not get a
login screen in front of it.

---

## 2 · Provider

**Recommendation: Supabase** — magic-link auth and Postgres from one vendor.

The reasoning is narrow. "Whatever the auth provider gives me" works for user
records, but trips are not user records: a multi-day itinerary with stops and
notes will outgrow the few KB of metadata Clerk stores per user. Supabase gives
both from one account, which keeps it genuinely single-vendor rather than auth
in one place and a database bolted beside it.

**Cost:** free tier covers 50,000 monthly active users, 500MB database, 1GB
file storage, auth included. That is far beyond where this site will be for a
long time. Pro is $25/month when it is needed.

**Two things to set up correctly on day one:**

- **Region: EU (London or Frankfurt).** Chosen at project creation and *not*
  changeable afterwards without a migration. Keeps the data in the UK/EU and
  removes the international-transfer question entirely.
- **The free tier pauses a project after 7 days of inactivity** — see §2.1,
  which is a solved problem but not a free one.

**Email delivery:** Supabase's built-in SMTP is rate-limited and sends from
their domain, which is wrong for magic links people are asked to trust. Use
**Resend** on its free tier with a verified `dramstory.com` sender.

### 2.1 The 7-day pause, and why a keep-alive is only half the answer

Mark's question: there may be weeks of inactivity — what counts, and can an
agent keep it awake?

**What counts as activity:** database queries, API requests, and Edge Function
invocations. **Visiting the Supabase dashboard does not count.** Neither does
traffic to dramstory.com that never touches Supabase — which, before accounts
exist, is all of it. So the quiet period is real.

**The keep-alive.** One request every seven days is enough. Recommended:

- A **Vercel Cron** job, daily, hitting an API route in this repo that runs one
  trivial Supabase query. Roughly twenty lines. It lives in the same deploy as
  the site, so it cannot drift out of sync with it.
- **Not `pg_cron`.** It runs *inside* the database, so it dies with the pause
  and does not restart — it cannot solve its own problem.
- **GitHub Actions is the obvious alternative and has a trap**: scheduled
  workflows are disabled automatically in repos with no activity for 60 days.
  Given the question was about weeks of quiet, that is exactly the failure mode
  it would be there to prevent. Vercel Cron has no such rule.

**But the pause is the smaller problem.** The free tier has **no backups**.

That is tolerable for a hobby database. It is not tolerable for the only copy
of visitors' saved trips — the thing the account exists to protect. A keep-alive
stops the project sleeping; nothing on the free tier gets the data back if it is
lost or corrupted.

**Recommendation, in two stages:**

| When | Plan | Why |
|---|---|---|
| Building, and any period with no real accounts | **Free + keep-alive cron** | Nothing to lose yet. The cron is worth building anyway; it stays useful. |
| From the first real user account | **Pro, $25/month** | Backups. Not the pause — the backups. |

The trigger is the first person who saves a trip they would be upset to lose,
not a traffic number.

### 2.2 What Pro actually costs

**$25/month, and for this site that is the whole bill** — not a base rate that
climbs. Worth setting out, because Supabase's pricing is usage-based above the
included limits and it is fair to ask where the ceiling is.

Included at $25:

| | Included | DramStory's realistic use |
|---|---|---|
| Monthly active users | 100,000 | Tens, then hundreds |
| Database | 8 GB | Trips are JSON. Megabytes. |
| Storage | 100 GB | Nothing stored — images come from Airtable |
| Egress | 250 GB | Nowhere near |
| Edge function calls | 2M | The keep-alive cron, if that |
| **Daily backups, 7-day retention** | ✓ | **The actual reason to pay** |

The $25 includes a **$10 compute credit**, which covers one Micro instance
(1 GB RAM) — so the base compute is already paid for. Larger instances cost the
difference and are not needed here.

**The one thing to watch:** the first project is included; **additional
projects are $10/month each**. So do not spin up a separate "staging" Supabase
project without meaning to — use a second schema, or accept the $10.

At roughly £20/month, the question is not really cost. It is whether losing
every saved trip with no way to get them back is a $25 problem. It is.

---

## 3 · What we hold, and nothing more

| Table | Fields | Why |
|---|---|---|
| `users` (Supabase auth) | id, email, created_at | Provided by the platform. No name, no DOB, no address. |
| `profiles` | user_id, marketing_opt_in, opted_in_at | Consent record, kept separate from the account itself — see §6. |
| `trips` | id, user_id, name, created_at, updated_at, payload | One row per named trip. `payload` is the existing `TripAnswers` + days JSON. |
| `visits` | user_id, place_slug, place_kind, place_name, label, trip_id?, visited_on? | The badge substrate, and the diary. A place, the visitor's own label, optionally which trip and when. |

**`visits` is deliberately its own table, not a flag on a trip.** Someone can
visit a distillery they never planned, and can plan one they never reach. The
two are different facts and conflating them would make both wrong.

**`payload` as JSON is a deliberate choice.** The trip shape already exists and
already serialises — it is what `dramstory-trip-v2` holds today. Normalising
days and stops into tables buys query power nothing in this plan needs, and
costs a migration every time the trip shape changes.

---

## 4 · The flows

### 4.1 Sign in

Magic link only. No passwords means nothing to hash, reset, or leak.

1. Visitor enters email
2. Supabase sends the link via Resend
3. Link returns them to where they were, signed in
4. Session in an httpOnly cookie

Same flow for registration and return — there is no separate "sign up". First
time through creates the account.

### 4.2 The prompt to save

**Timing is the whole thing.** Prompt at the moment of investment, not at the
start. Someone with one stop has lost nothing if they close the tab. Someone
with three days planned has lost an evening.

**What is pencilled in:** a second day added, **or** a first note written on a
stop. Mark asked what else is on the table — four options, in order of how
eager they are:

| Trigger | Fires when | Verdict |
|---|---|---|
| **Second stop added** | Two things on any day | Too eager. Two taps is not yet an investment, and a prompt here reads as a toll booth on a planner that has barely started. |
| **Second day, or first note** *(pencilled)* | Either | **Recommended.** Both signals mean deliberate work rather than browsing. A note especially — nobody types a note by accident. |
| **Leaving the planner** | Navigating away with unsaved work | Catches everyone, but it is an interstitial at the exact moment somebody is trying to do something else. Reads as a trap. |
| **Return visit** | Second session with a trip in localStorage | The strongest *signal* — they came back, so the trip matters — but it arrives too late for the visitor who never gets a second session. |

**Recommendation: keep the pencilled trigger, and add the return visit as a
second, quieter prompt.** They catch different people. The first catches
someone mid-build; the second catches someone who has proved the trip matters
by coming back to it. Neither blocks anything.

**What would change my mind:** real numbers. If the first prompt is dismissed
by most people, it is too eager and should move to three days. That is a
question for analytics after launch, not a decision to agonise over now.

**Wording names what is at stake**, not what we want:

> "Three days planned. Keep them?" — not "Create an account".

**Dismissible, and it stays dismissed** for that session. Offer again on the
next visit, not the next click. It is an offer, never a wall.

### 4.3 The trip that already exists

The hardest detail, and the one most likely to be got wrong.

Someone plans for ten minutes, then registers. That work **must** survive, or
the account has cost them the thing it was meant to protect.

There is exactly one `localStorage` key (`dramstory-trip-v2`), so on first
sign-in: read it, write it as their first trip, name it from the dates or
"Your first trip", and leave localStorage in place as the signed-out fallback.

**Do it silently.** An "import your trip?" dialogue at the moment of signing in
asks someone to make a decision about something they already believe is theirs.

**Conflict case, worth deciding now:** someone signs in on a phone that has its
own unsaved local trip, with trips already in the account. Recommendation: keep
both, adopt the local one as a new trip, never overwrite. Losing work is worse
than an extra row in the list.

---

## 5 · Badges

### 5.1 The collections

| Badge | Earned by | Total |
|---|---|---|
| Islay distilleries | Visiting | 10 open to visitors |
| Across the sound | Visiting Isle of Jura | 1 |
| The Kildalton three | Ardbeg, Lagavulin, Laphroaig | 3 |
| The Rhinns | Bruichladdich, Kilchoman | 2 |
| Beaches | Visiting | from Local Features |
| Walks | Completing | from Local Features |
| Fèis Ìle | Attending | per year |

Progress reads as **"9 of 10"** — a collection with a known end, which is what
makes it meaningful. Nothing here counts a measure.

### 5.2 How a visit is recorded

An explicit "I went" on the distillery or feature page, and on a past day in a
trip. Never inferred from planning — a planned stop is an intention, and
recording it as a visit would make the whole collection untrustworthy.

**No date required** (Mark, 3 Sep 2026). Asking "when did you go?" adds
friction to the one action the whole badge feature depends on, and most people
recording a visit are doing it from memory anyway. `visited_on` stays on the
table as **optional** — offered, never demanded.

**But a visit must be identifiable — and Mark's reason for it is the better
one.** Clarified 3 Sep 2026: a visitor may have two or three trips, so their
*records* need labelling to tell them apart. Ardbeg visited in May with his dad
is not Ardbeg visited in September on his own.

So two fields, and `label` is the important one:

- **`label` — the visitor's own words, prominent.** "With Dad", "the day it
  rained sideways", "Fèis Ìle". Offered every time a visit is recorded,
  pre-filled with the trip name where the visit came from a trip, so it costs
  nothing to accept and one tap to change.
- **`place_name`, stored alongside the slug.** A slug identifies a row; it does
  not tell a human what they are looking at, and a slug that changes in Airtable
  would otherwise orphan the visit. Storing the name as it was means the record
  still reads as "Ardbeg" in five years whatever happens to the content.

### 5.2.1 This is a diary, and that changes what it is worth

Mark, on reading the above: *"I hadn't considered the visitor using the site as
a diary, that's neat."*

Worth pausing on, because it is the most valuable thing in this section and it
arrived sideways.

A badge grid is a completion mechanic — it works once, and then it is done. A
labelled, dated record of where someone went and who they were with is
**something they come back to for its own sake**, years later, with no prompt
from us. It is also the only part of this plan that gets *more* valuable the
longer someone uses the site, rather than less.

It costs one text field. It should not be treated as decoration on the badges;
if anything the badges are the decoration on it.

**Design consequence:** the visits list needs to read as a record, not a score
— chronological, labelled, with the place and the visitor's own words, and the
badge progress as a quiet summary above it rather than the main event.

### 5.3 What we are not building

No points. No levels. No streaks. No leaderboards.

### 5.4 Sharing — download yes, public pages no

Mark's question: can someone take a badge card away as a PDF or image and post
it themselves, without us building age verification for it?

**Yes, and the distinction he is drawing is the right one.** "Sharing" is three
different things with three different risk profiles, and they should not be
decided together.

| Mechanism | Verdict | Why |
|---|---|---|
| **Download** — user saves a PDF or PNG of their own progress | **Build it** | The visitor is already an affirmed adult (§6.2 gates registration). They pull the file; they choose the audience. Nothing is published by us. |
| **One-tap post to X / Instagram** | **Not in the first cut** | We would be facilitating distribution into feeds whose audience we do not control. Defensible later, but it should be a deliberate decision. |
| **Public share URL** (`dramstory.com/b/xyz`) | **No** | An open, unauthenticated page of alcohol-adjacent content is us publishing to an audience we cannot age-check. This is the one that genuinely brings the targeting rules into scope. |

**The age-verification worry was never about the download.** It was about the
public page. Download needs no new gate.

**What the artefact must still satisfy**, because we created it even though the
visitor distributes it:

- Counts places, never measures (§0) — which the badge model already
  guarantees, so this costs nothing
- No language about drinking, only about going
- Carries the same 18+ and Drinkaware line the site footer does
- No "share this" call to action baked into the image — it is a record of where
  someone went, not a poster we have asked them to put up

**Build note:** generate it server-side with `next/og` (`ImageResponse`) rather
than a client-side canvas. It is already available on Vercel, renders from the
same data the profile page reads, and produces a PNG at a fixed size that
looks the same everywhere. PDF only if Mark specifically wants print — the
image is what actually gets posted.

---

## 6 · Legal

Two separate regimes. They get conflated; they should not be.

### 6.1 Data protection (UK GDPR)

**You are the controller.** Supabase and Resend are processors. Using them
moves the infrastructure, not the accountability. Concretely, this means:

| Obligation | What it means here |
|---|---|
| Lawful basis — account | **Contract.** The email is necessary to provide the service. No consent box. |
| Lawful basis — marketing | **Consent.** Separate, unticked, recorded with a timestamp. This is why `profiles` exists. |
| Data minimisation | Email, trips, visits. Nothing else. Every field not collected is one that cannot leak. |
| Right to erasure | A working "delete my account" that removes trips and visits too, not just the login. |
| Right to access | Export trips and visits as JSON. Cheap to build now, miserable to retrofit. |
| Breach notification | 72 hours to the ICO. Needs a written procedure, not an intention. |
| Processor agreements | Supabase and Resend both publish DPAs — accept and file them. |
| Transfers | Solved by choosing an EU region. |

**ICO registration and the data protection fee.** Mark asked what this is.

Every UK organisation that processes personal data for a commercial purpose
must register with the Information Commissioner's Office and pay an annual
**data protection fee**. It is not a licence you apply for and might be refused
— it is a register you put yourself on, and a bill you pay. Not paying when
liable is itself an offence.

- **Tier 1 — £52/year**, for organisations with turnover up to £632,000 or no
  more than 10 staff. That is DramStory Ltd.
- A £5 discount usually applies for direct debit.
- Some not-for-profits are exempt. A limited company running an affiliate
  business is not.

**When it starts mattering:** the moment the first email address is stored. The
site today holds no personal data, so there is nothing to register yet — but
Phase 0, the newsletter, is what triggers it. Register before that ships, not
after.

The ICO publishes a self-assessment to confirm the tier. Worth running rather
than assuming, but Tier 1 is the near-certain answer.

### 6.2 Alcohol marketing

- No mechanic that counts or rewards consumption (§0)
- 18+ affirmation at registration that actually gates
- Marketing email must not imply, condone or encourage immoderate drinking —
  which includes badge-progress nudges, if those ever go out by email
- No badge or account content directed at, or likely to appeal to, under-18s
- Downloadable badge cards are fine and need no extra gate (§5.4); a public,
  unauthenticated share page is the thing that would need one, and is not built

### 6.3 The legal pages

The site has Privacy Policy, Terms of Use, Cookie Policy and Affiliate
Disclosure links in the footer. **All four need writing or rewriting against
what the site actually does now** — accounts are only part of it:

- **Privacy policy** — does not currently mention accounts at all. Needs the
  table in §6.1, the processors named, retention periods, and how to exercise
  each right.
- **Terms of use** — account terms, acceptable use, what happens to a trip if
  an account is deleted, no warranty on tour times and prices (which change),
  and the affiliate relationship stated plainly.
- **Cookie policy** — the session cookie is strictly necessary and needs no
  consent. Anything analytical does. Worth auditing what is actually set today
  before writing this, rather than describing an intention.
- **Affiliate disclosure** — Hotels.com and Booking.com relationships,
  disclosed at the point of the link as well as on the page.

**These should be written by, or at minimum reviewed by, someone qualified.**
I can draft them and mark every assumption, but a plausible-sounding privacy
policy that is wrong is worse than none — it is a representation to your users
about what you do with their data.

---

## 7 · The newsletter

The footer signup is live-looking and **not wired to anything** — the form is
there, the emails go nowhere. That is the worst of both worlds: it collects an
expectation it cannot meet, and anyone who typed their address is owed an email
that will never arrive.

Folding it into this plan rather than treating it separately, because it shares
the same infrastructure and exactly the same obligations.

### 7.1 How it works

| Step | What happens |
|---|---|
| 1 | Visitor enters email in the footer form |
| 2 | Row written to `subscribers` — `status: pending` |
| 3 | Resend sends a confirmation email |
| 4 | They click the link → `status: confirmed`, `confirmed_at` set |
| 5 | Nothing is ever sent to a `pending` address |

**Double opt-in, deliberately.** It costs one email and it buys three things:
proof of consent that stands up, a list free of typos and malicious signups,
and deliverability that does not degrade because of addresses that never wanted
you. Single opt-in is legal; double is defensible.

### 7.2 Table

`subscribers` — `id`, `email`, `status`, `source`, `created_at`,
`confirmed_at`, `unsubscribed_at`

**Deliberately separate from `profiles.marketing_opt_in`.** A subscriber is not
an account holder, and an account holder who ticks the marketing box is not a
newsletter signup. Two different consents, given at two different moments,
recorded separately — deduplicated at send time, not in the schema.

### 7.3 The legal part

A standalone newsletter signup is **consent**, not soft opt-in. Soft opt-in
under PECR is narrow — it needs the address to have been collected during a
sale or negotiations for a similar product, and a footer form is neither.

That means:

- **The form must say what they are signing up for**, at the point of the form,
  not on a linked page. It currently says "Whisky adventures, distillery
  stories and craft itineraries — delivered monthly", which is genuinely good
  and should survive.
- **No pre-ticked anything.** Entering the address and pressing Subscribe is
  the consent act.
- **Record what they consented to and when** — that is what `source` and
  `confirmed_at` are for.
- **Unsubscribe in every single email**, one click, no login, no "tell us why".
- **Content rules apply** (§6.2): a whisky newsletter is alcohol marketing.
  It must not imply, condone or encourage immoderate drinking, and must not be
  targeted at or likely to appeal to under-18s.

### 7.4 Existing addresses — none, and that is worth having confirmed

**Confirmed by Mark, 3 Sep 2026: the site has not been visited and nobody has
completed the form.** So there is no legacy list, no addresses captured without
a consent record, and nothing to re-permission or discard.

Recorded here rather than left implicit, because "we think there might be a few
old signups somewhere" is the thing that quietly poisons a mailing list later.
Every address in `subscribers` will have arrived through the double opt-in in
§7.1, with a timestamp. The list starts clean and provably so.

The same fact removes the only real objection to building this now: there is no
one waiting on an email that never came.

---

## 8 · Phasing

**Phase 1 — accounts and sync.** Supabase project, magic link, session, one
trip per user synced. The save prompt. localStorage migration. Delete and
export. Privacy policy updated. *This is a shippable product on its own.*

**Phase 2 — named trips.** The library, renaming, switching, deleting. Trip
list UI.

**Phase 3 — visits and badges.** The `visits` table, the "I went" action, badge
progress on a profile page, and the downloadable badge card (§5.4).

**Phase 4 — marketing consent.** The account's own opt-in, deduplicated against
the newsletter list.

**Phase 0 — the newsletter (§7).** Listed last, buildable first. It needs the
Supabase project and Resend, and nothing else in this plan — no auth, no
sessions, no trips. It is the smallest possible use of the same infrastructure,
which makes it a good way to prove the setup works before accounts depend on
it. It also stops the footer form collecting expectations it cannot meet, which
is a live problem rather than a planned feature.

> ### ⛔ BLOCKING PREREQUISITES FOR PHASE 0
>
> Both must be done **before** the first email address is stored, not after.
>
> - [ ] **Register with the ICO and pay the data protection fee.** Tier 1,
>   £52/year (£5 off by direct debit). Liable from the moment personal data is
>   processed commercially — which is the moment the mailing list takes its
>   first address. Not paying when liable is an offence, and this is the single
>   easiest thing in the whole plan to forget, because nothing in the code will
>   remind you. Run the ICO's fee self-assessment, register, then put the
>   registration number into the privacy policy.
> - [ ] **Publish the privacy policy and cookie policy** (drafts in
>   `docs/legal/`). Collecting an address without a live privacy notice is a
>   breach on day one.

Phase 1 alone justifies the account. Phases 3 and 4 are where the commercial
value is, and neither works without 1.

---

## 9 · Open questions for Mark

1. **ICO fee** — explained in §6.1. Tier 1, £52/year, due before Phase 0 ships.
   Only action is to run the ICO's self-assessment and register.
2. **Free tier pausing** — answered in §2.1. Remaining decision is only *when*
   to move to Pro, and the recommendation is: at the first real account, for
   the backups rather than the pause.
3. **The save-prompt trigger** — options set out in §4.2. Recommendation is to
   keep the pencilled one and add a quieter return-visit prompt. Confirm or
   pick another.
4. **Visited-place recording** — closed. No date required, optional if offered;
   `place_name` stored for legibility and an optional `label`. One reading to
   confirm, noted at the end of §5.2.
5. **Legal pages** — Mark said draft them here. Drafts are in `docs/legal/`,
   every assumption marked, for professional review before publication.
6. **Newsletter** — closed. Not live, no existing addresses (§7.4), absorbed as
   §7 and buildable first as Phase 0.
