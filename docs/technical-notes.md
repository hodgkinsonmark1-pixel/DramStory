# Technical Notes

Developer-facing findings about how the site actually behaves - things worth
knowing before debugging the same issue twice. Distinct from
`deferred-features.md` (parked product decisions) and
`content-sourcing-standards.md` (content sourcing rules).

## Airtable data fetches have their own cache, separate from page-level ISR

**Found:** 16 July 2026, while investigating why corrected Local Feature
coordinates (MacTaggart Leisure Centre, Round Church of Bowmore) weren't
showing up on the live map after a fresh deployment.

**UPDATE, 21 July 2026 - real recurrence, two fix attempts.** Mark flagged
`/distilleries` showing 9 distilleries instead of 11. Confirmed directly
in Airtable: Port Ellen and Isle of Jura were added to the Distilleries
table on 9 and 11 July, both with real Name/Slug values, and the fetch
code has no Status/Region filter that would exclude them - this was
exactly the caching gotcha below, not a code or data bug.

First attempt: shortened `next: { revalidate: 3600 } }` to
`{ revalidate: 60 }`. This did NOT fix it - checked live 3+ minutes and
one fresh production deploy after it shipped, still 9. Confirms
"redeploy alone doesn't guarantee a bust" is worse than the original
note implied: an *already-stale* Data Cache entry isn't bypassed just
because the code now asks for a shorter window: whatever governed that
entry when it was first cached keeps governing it. No CLI/API access
was available in that session to directly purge Vercel's Data Cache by
tag (`vercel cache invalidate` needs an interactive login; a
`revalidateTag` route needs a new secret env var set in Vercel first).

Second attempt: switched to `cache: "no-store"`. Also did NOT fix it -
checked live again after that deploy, still 9. This is what finally
revealed the REAL root cause wasn't the Data Cache at all: the Next.js
build output showed `/distilleries` as `○ (Static)` - a fully static
page whose data fetch runs exactly once, at build time, no matter what
caching option the underlying fetch uses. Neither of the two attempts
above could ever have worked, because they only affect re-fetch
behaviour for a page that actually re-renders - a static page never
does, after build.

Added a temporary always-dynamic diagnostic API route
(`/api/debug-distilleries`, since removed) to check, directly and live,
what Vercel's actual configured Airtable credentials return - confirmed
11 real records, Port Ellen and Isle of Jura both present, base ID
correct. This proved the data layer was fine and pointed squarely at
page-level static rendering as the real cause.

**Actual fix, two parts:**
1. `export const dynamic = "force-dynamic"` added to `/distilleries`,
   `/local-features`, and `/journal` (the three Airtable-backed index
   pages that were silently static) - forces per-request rendering
   instead of a build-time-frozen page.
2. `getDistilleries`/`getLocalFeatures`/`getJournalPosts` in
   `src/lib/data/index.ts` used a hand-rolled module-level
   `let cache: Promise<T> | null` memo. In a serverless environment a
   warm function instance survives across many separate incoming
   requests, and a plain module-level variable survives with it - so
   the first successful fetch on a given warm instance would silently
   become the answer for every later request that instance served,
   regardless of any per-fetch cache option. This would have
   undermined `force-dynamic` on its own. Replaced with React's
   `cache()` (the documented per-request dedupe primitive for exactly
   this pattern in the App Router), which cannot persist across
   separate requests the way a bare module variable does.

`cache: "no-store"` on the underlying Airtable fetch (from the second
attempt) was left in place - harmless now, and correct given these
pages are dynamic anyway. Cost is one live Airtable call per table per
request to these three pages; acceptable given low pre-launch traffic
and the Team plan quota headroom (see further down this file).

**The behaviour (as originally found, now historical - `src/lib/airtable.ts`
no longer uses a cached fetch at all, see update above):** the fetches used:

```
next: { revalidate: 3600 }
```

This is Next.js's **Data Cache**, not the page-level ISR cache. On Vercel,
the Data Cache can persist *across* deployments, not just within one - so a
fresh build/deployment does not guarantee a fresh Airtable fetch. The usual
fix for Airtable-only content changes ("push a trivial commit to bust the
ISR cache") busts the *page* cache, but does not reliably bust this
specific fetch-level cache. A record can be correct in Airtable and still
show stale data on the live site for up to an hour after the fix, even
after a redeploy.

**Practical implications:**
- As of 21 July 2026 this is moot for content freshness specifically -
  `cache: "no-store"` means every request is live, nothing to wait out.
  Still worth reading if `airtable.ts` ever moves back to a cached fetch:
  a shortened `revalidate` window does NOT reliably bust an
  *already-stale* entry (confirmed the hard way above) - only a genuinely
  new cache key (different URL/tag) or an explicit `revalidateTag` call
  does that.
- If real caching comes back, the reliable options for instant freshness
  are: on-demand revalidation (`revalidatePath`/`revalidateTag`) tied to
  an Airtable webhook, or `vercel cache invalidate --tag <name>` /
  `vercel cache dangerously-delete --tag <name> --yes` via the Vercel
  CLI (needs an interactive login, so not usable from an unattended
  session). Reducing the `revalidate` number alone is not reliable relief
  for content that's already stale, only for future entries.
- This is not a bug in the data - it's a caching layer worth knowing about
  before spending time re-checking coordinates, field values, etc. that are
  already correct.

## The site never reaches a quiet state for scripted browser automation

**Found:** 17 July 2026, while trying to screenshot the live site and a
Vercel preview branch deployment via Claude's browser automation tooling.

**UPDATE, 17 July 2026 (same day, later investigation):** the original
theory below - a continuous background script or polling interval in the
app - has been disproven. Confirmed via direct JS execution in the actual
page context: `document.readyState` is `"complete"`, zero new entries in
`performance.getEntriesByType('resource')` over a 3-second window (i.e.
genuinely no network activity), and disabling the Vercel Toolbar via
`VERCEL_PREVIEW_FEEDBACK_ENABLED=0` made no difference. The page is
verifiably idle by every measure available from inside it. The screenshot
action still fails regardless, including on the homepage (no maps, no
Hub-specific code at all) - so this is not a DramStory app bug. It looks
like a limitation in Claude's own browser-automation screenshot tooling
when working with this deployment, not something fixable from the
codebase or Vercel project settings. Leaving the original notes below for
context, but don't spend further time hunting for an app-level cause.

**The behaviour:** Screenshot/script-injection calls against dramstory.com
and its Vercel preview deployments consistently fail with a script
injection timeout ("the page is busy or mid-navigation"), even after
waiting several seconds post-navigation, and even immediately after a
fresh page load with nothing else happening. This has now been confirmed
on both production and a preview branch, so it isn't limited to whatever
production-only script might be running - something in the base page
(likely a continuous background script or polling interval, present on
every deployment) keeps the page from ever settling into an idle state
that automation tooling expects before it will act on the DOM.

**Practical implications:**
- Don't rely on being able to screenshot or script-interact with this site
  via browser automation for QA, design review, or visual comparison - it
  will very likely time out. Ask the person to check the live page
  themselves instead.
- If this becomes a real blocker (e.g. for automated visual regression
  testing later on), it's worth identifying and isolating whatever
  continuous script/polling is running - a candidate worth checking first
  is anything doing frequent client-side fetching, live map interaction
  handlers, or a dev-only overlay that isn't supposed to ship to
  production/preview at all.
