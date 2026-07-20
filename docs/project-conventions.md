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
- **Day narrative standard** (Hub Days specifically): one whole-day paragraph,
  plain over descriptive, concrete over vague, warmth earned at the close,
  only named/sourced tours, inline `[label](/path)` links matching the live
  record's name exactly. Full detail: `day-narrative-standard.md`.

## Process

- **Draft in chat -> Mark's review and iteration -> an independent
  second-pass review (a genuine check, not a rubber stamp) -> only then
  pushed to Airtable.**
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
- **Type-check and lint before every commit.**
- **Browser automation (screenshots) doesn't reliably work against this
  site** - confirmed not a site bug after direct investigation, more likely a
  limitation of the automation tooling itself. Screenshots from Mark remain
  the reliable way to review anything visual. Full detail:
  `technical-notes.md`.

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
| `business-plan.md` | Core objective, monetization sequencing, accommodation strategy, partnership opportunities |
| `project-conventions.md` (this file) | The map to all of the above |
