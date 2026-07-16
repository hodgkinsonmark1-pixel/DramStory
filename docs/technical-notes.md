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
