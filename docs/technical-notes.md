# Technical Notes

Developer-facing findings about how the site actually behaves - things worth
knowing before debugging the same issue twice. Distinct from
`deferred-features.md` (parked product decisions) and
`content-sourcing-standards.md` (content sourcing rules).

## Airtable data fetches have their own cache, separate from page-level ISR

**Found:** 16 July 2026, while investigating why corrected Local Feature
coordinates (MacTaggart Leisure Centre, Round Church of Bowmore) weren't
showing up on the live map after a fresh deployment.

**The behaviour:** `src/lib/airtable.ts` fetches use:

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
- Don't assume "I redeployed, so it must be fresh" for anything reading
  through `src/lib/airtable.ts`. If content looks stale right after a
  redeploy, this is the first thing to check before assuming the Airtable
  data itself is wrong.
- If content needs to be live immediately (not "within the hour"), the
  options are: force a Vercel redeploy with the build cache cleared, or
  reduce/adjust the `revalidate` window for time-sensitive fields, or add
  on-demand revalidation (`revalidatePath`/`revalidateTag`) tied to the
  relevant Airtable webhook/update path, if that becomes worth the
  engineering effort later.
- This is not a bug in the data - it's a caching layer worth knowing about
  before spending time re-checking coordinates, field values, etc. that are
  already correct.

## The site never reaches a quiet state for scripted browser automation

**Found:** 17 July 2026, while trying to screenshot the live site and a
Vercel preview branch deployment via Claude's browser automation tooling.

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
