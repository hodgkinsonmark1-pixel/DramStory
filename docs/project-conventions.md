# Project Conventions

The single starting point for how this project works. Full detail lives in the
docs it points to below - this file is the map, not a replacement for any of them.

## Content standards

- **British English spelling** throughout.
- **Fun, conversational tone that reads as human-written, not AI-generated** -
  specifically avoid tells like "nestled," "boasts," "in today's world,"
  adjective-stacking, generic travel-blog cadence.
- **SEO is secondary to content quality.**
- **All factual content must be verified against official sources** - the
  distillery/venue's own site, not third-party aggregators, even as a
  fallback. Unconfirmed facts get flagged as unconfirmed, never stated as
  settled. Full detail: `content-sourcing-standards.md`.
- **No duplication** of the same fact or beat across a record's different
  fields, or between a narrative and the page it links to.
- **A food or drink venue earns a map pin only if it has a live Google card
  OR an official source a visitor can act on** (31 Aug 2026). Neither, and
  the pin is hidden by a render gate in `Workspace.tsx` - deliberately a
  render gate, not a deletion, so the record survives for future audits.
  Nine venues are currently hidden; five of those are trading and only lack
  a `Website` value. Full detail: `google-places-policy.md`.
- **Google is never the source of a pin's own data.** Its coordinates may be
  cached for 30 days only, so name, address and lat/lng always come from a
  source we are allowed to keep. Google's role is a live second opinion and
  a smoke alarm, never the golden source.
- **Google's closure signal is unreliable.** In the Aug 2026 audit it
  reported four closures and only one was real - a Scottish island's winter
  shutdown reads to Google as permanent closure. Always verify against the
  venue's own site, its social accounts and the FHIS register before
  removing anything.
- **Day narrative standard** (Hub Days specifically): one whole-day paragraph,
  plain over descriptive, concrete over vague, warmth earned at the close,
  only named/sourced tours, inline `[label](/path)` links matching the live
  record's name exactly. Full detail: `day-narrative-standard.md`.

## Process

- **Draft in chat -> Mark's review and iteration -> an independent
  second-pass review (a genuine check, not a rubber stamp) -> only then
  pushed to Airtable.** The second pass earns its place: on the Google
  Places work it caught a fault that would have made every food pin a dead
  click on first deploy, after the author had already self-reviewed twice.
- **Check claims by loading the page, not by trusting the source that
  produced them.** Every verification failure in the Aug 2026 session had
  the same shape: reporting what a search result, a subagent or a green
  build tick said, rather than opening the thing. Dead URLs went live
  unopened; a Google listing for a hotel was attached to a restaurant pin
  without looking at the card; production was declared broken on a
  measurement taken in a stale browser. "Did you actually look?" is a fair
  question to ask of any claim that something works.
- **Airtable is the golden source of content** - Days, Distilleries, Tours,
  Local Features live there, not hardcoded in the codebase. (One deliberate,
  flagged exception: the default-day-flow seed, hardcoded pending the real
  Day->itinerary resolution being built.)
- New content starts as **Status: Draft**, not Live.

## Technical / git workflow

- **Feature branches for anything non-trivial** - built, tested, and
  previewed before ever touching `main`/production.
- **GitHub PAT handling**: clone/push with the token in the URL, then
  immediately strip it back out via `git remote set-url` - never leave it
  sitting in the remote config.
- **Airtable-only content changes need a cache-busting commit to `main`** to
  show up live. Note: the underlying Next.js Data Cache can persist *across*
  deployments, not just within one - a fresh redeploy doesn't always
  guarantee instant freshness. Full detail: `technical-notes.md`.
- **Coordinate verification hierarchy**: What3words first if a business
  publishes its own code, postcodes.io second, a clearly-labeled reasoned
  estimate last - a manual step each time, not automatic.
- **Type-check and lint before every commit.** An assistant without working
  shell access cannot do this - if a permission prompt for shell commands
  appears, allow it, or code arrives unverified. Say so plainly when it has
  not been checked rather than letting a green Vercel build stand in for it:
  a successful build proves the types compile, nothing more.
- **`git checkout main && git pull` before creating any branch.** `main`
  moves between sessions. Merge `main` back into a feature branch before
  trusting its preview, or you are testing something production will never
  look like.
- **Never `git add -A` in this clone.** Windows CRLF line endings make git
  see ~160 unchanged files as modified; staging them commits a 47,000-line
  phantom diff. Stage `src` and `docs` explicitly, or use `ship.ps1` at the
  repo root, which does the whole commit-and-push in one command and clears
  stale `.git/index.lock` files first.
- **Browser automation DOES work against this site** (corrected 31 Aug
  2026). Screenshots, clicks and JavaScript evaluation all worked reliably
  for a full session of testing against both preview and production. The
  earlier note that it did not appears to have been wrong.
- **Clustered map pins only enter the DOM when they are in the viewport,
  and the map restores a saved view from `localStorage`.** Both mistakes
  were made in one day: a stale zoom-19 view made a working food layer look
  empty, and led to a false report that production was broken. Before
  concluding that pins are missing, check the map's zoom and centre, and
  clear site data. Verify from a fresh navigation, never from
  `localStorage.clear()` followed by a reload - that white-screens the page.

## Business fundamentals

- **Core objective**: build a perfect trip and reach a genuine booking
  decision in under two minutes.
- **Top-level principle**: everything must be intuitive, add value, be
  accurate, and be emotive where appropriate.
- **Monetization sequencing**: accommodation/vehicle affiliate income first,
  distillery affiliate income second, wider region expansion later.
  Full detail: `business-plan.md`.

## Where things live

| Doc | Covers |
|---|---|
| `content-sourcing-standards.md` | Sourcing rules, required fields per record type, photo requirements |
| `day-narrative-standard.md` | The Hub Day narrative bar, with before/after examples |
| `brand-voice.md` | How to actually write for this site - tone, honesty, never-fabricate rules |
| `content-structure-conventions.md` | Page/template structure as currently built - distillery pages, Classic Journey day template, Local Features Hub |
| `deferred-features.md` | Product ideas deliberately parked, not forgotten |
| `technical-notes.md` | Real findings about how the site actually behaves (caching, automation limits) |
| `google-places-policy.md` | What Google Places may and may not be used for: the non-Google-maps restriction, what may be stored, the two API keys, attribution, cost |
| `business-plan.md` | Core objective, monetization sequencing, accommodation strategy, partnership opportunities |
| `project-conventions.md` (this file) | The map to all of the above |
