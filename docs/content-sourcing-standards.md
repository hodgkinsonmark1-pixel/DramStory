# Content Sourcing Standards

## Tours data (Airtable `Tours` table)

**Rule: only a distillery's own official website is an acceptable source for tour names, formats, and pricing.**

Third-party sources — tour resellers, travel blogs, review aggregators (e.g. distillerytours.scot, islayinfo.com, TripAdvisor, WhiskyAdvocate write-ups) — are **not** acceptable sources for this data, even as a fallback. This applies to:

- Tour names (aggregators sometimes rename or mislabel tours, or list discontinued ones)
- Prices (aggregators are frequently stale, and reseller markups don't reflect the distillery's own price)
- Whether a tour is even currently running at all (aggregators do not reliably reflect silent seasons, closures, or a distillery pausing tours entirely)

### Why this rule exists

During the initial content build (July 2026), two real problems surfaced from relying on aggregators:

1. **Isle of Jura Distillery**: aggregator sites (distillerytours.scot, TripAdvisor) listed two current, bookable tours with prices. The distillery's own site (jurawhisky.com/en-gb/distillery/our-tours/), last updated 30 June 2026, stated tours were **currently unavailable** entirely. Aggregator content was stale by at least the whole "silent"/paused period.
2. **Caol Ila and Bruichladdich**: tour pricing was sourced from distillerytours.scot and islayinfo.com respectively, rather than confirmed on the distilleries' own pages, and only caught in a later audit.

### What to do instead

- If a tour's price isn't publicly listed on the distillery's own site, record it as **unconfirmed** in the `Source` field (with a note recommending a phone/booking-system check) rather than use a number from anywhere else.
- Every `Tours` record's `Source` field should name the specific official page it was confirmed against, not just "confirmed via research."
- If a distillery's own site indicates tours are paused, reduced, or unavailable, that overrides any other source, however recent-looking.

## Broader content (Description, History, Fun Facts, Whisky Profile)

Official sources are still preferred, but reputable third-party sources (Scotch Whisky Association / Whiskipedia, Wikipedia, established whisky press) remain acceptable here, since this content is less time-sensitive than live tour bookings and benefits from cross-referencing multiple independent sources. The distinction is specifically about **live, bookable, price-bearing operational data** (Tours), where staleness has a direct, visitor-facing consequence.
