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

## Natural Features content model (Beach / Walk / Bike Route / Local Gem)

**Rule: every field below is a required part of the standard, not an optional extra.** Machir Bay and Saligo Bay were both built incrementally, with fields like Best Time to Visit, Wildlife & Seasonal Highlights, Mobile Signal Note, and a third "Good to Know" bullet added as afterthoughts rather than part of the original build. That inconsistency is exactly what this section exists to prevent going forward - every new Natural Feature record should ship complete against this list the first time, not need a follow-up pass to catch up to the standard.

**Required fields for every record:**

- `Why Visit` - short punchy hook, one line
- `Description` ("What to Expect") - emotional, sensory scene-setting, not just a functional summary
- `History` (+ Source + Last Verified) - only if there's a genuine, verifiable story; don't force one where none exists
- `Safety & Tide Notes` (+ Source + Last Verified) + `Tide Times URL` - required for any coastal feature; hard-fact rigour, no softening real danger
- `Great For` tags - must stay consistent with Safety & Tide Notes (never tag Swimming somewhere that's flagged unsafe)
- `Highlights` ("Good to Know") - aim for **at least 3 bullets** for visual balance in the layout, each one a genuinely distinct fact not covered elsewhere on the page
- `Wildlife & Seasonal Highlights` (+ Source + Last Verified) - what's actually likely to be seen and when, sourced from NatureScot/RSPB/SOC, not generic filler
- `Best Time to Visit` - season/tide/light-dependent guidance; this is also what populates the 5th Quick Facts box, so leaving it blank visibly shortchanges the page (4 boxes instead of 5)
- `Parking`, `Accessibility`, `Opening Hours` - written so the *first clause* (before the first comma/semicolon) stands alone as a useful short answer, since the Quick Facts strip truncates to that point
- `Nearest Facilities` - same truncation rule as above: lead with the useful part (location/distance), not a restatement of the field's own purpose
- `What to Bring`
- `Mobile Signal Note` - honest, checkable against Ofcom's coverage checker
- `Pairs Well With` - a genuine cross-link (nearby distillery, related record), written as a sentence, not just a bare reference
- `Hero Image` (single) + `Gallery` (remainder) - required before a page is considered finished; a record without photos is incomplete, not just "pending"

**Process:** draft all fields together against this checklist, run the second-pass review (duplication check + fact-check against sources), present for approval, then write to Airtable in one pass - not field-by-field as gaps get noticed after the fact.

