# DramStory — Business Plan

**Document date:** 19 July 2026
**Status:** Living reference document — supersedes both the "Scotland Whisky Trails" 3-Eyes plan (30 June 2026) and the 12 July "DramStory — Business Plan (Updated)" version
**Review cadence:** Fortnightly (data/content accuracy) + Monthly (finance, GA, strategy)
**Author:** Mark, founder — maintained jointly with Claude as technical/editorial partner

---

## How to Use This Document

This is the single current source of truth, organised in three parts:

1. **Long-Term Vision & Strategic Direction** — where this is going, and why
2. **Operational Plan** — how the business actually runs, day to day and week to week
3. **The Five Pillars** — Customer, Marketing & Brand, Product, Team & Staffing, Finance, each in full detail

Where the 12 July version's figures and structure still hold, they're carried forward unchanged. Where reality has moved since — scope, sequencing, confirmed affiliate terms, a whole new product surface (the Pre-Designed Days Hub) — this document reflects what's actually true as of 19 July 2026.

---

# PART A: LONG-TERM VISION & STRATEGIC DIRECTION

## The Business, Restated

DramStory is a story-led trip-planning platform for whisky enthusiasts, helping them discover, plan, and book authentic, logistically sound journeys through Scotland's whisky regions — starting with Islay & Jura — monetised through affiliate commissions on accommodation, distillery referrals, and (later) vehicle rental, at zero cost to the traveller.

Core differentiator, unchanged: **this is not an information source. It's a high-intent trip-planning and booking tool.** The platform doesn't just describe Islay — it lets someone build their own journey and act on it, ideally in under two minutes from landing to a genuine booking decision.

**Top-level product principle** (sits above every other standard in this document): everything on the site must be **intuitive, add value, be accurate, and be emotive where appropriate.**

## 5-Year Vision

A replicable platform operating across multiple UK tourism niches (whisky, hiking, food, heritage, golf, coastal), with Islay & Jura as the proof-of-concept region. The underlying platform, content model, and operational playbook are designed to be repeatable to future regions once this one is genuinely proven — not before.

## Scope Decision: Islay & Jura Only Until Complete (revised 18 July 2026)

**This materially revises the 12 July plan's "5 regions in the next month" timeline.** That pace has been deliberately abandoned. The current, explicit decision: **reference only Islay and Jura for MVP go-live** — no other region names, selectors, or placeholder content anywhere on the live site. The homepage's region-picker step (previously "Q2") is being inactivated (not deleted) for exactly this reason: with only one real region, asking "where does your story take you?" is dead weight in the funnel, not a real question.

Other regions are added **step-by-step, once Islay & Jura is genuinely finished** — not landed in parallel while the flagship region is still being built out. This is a slower, more deliberate pace than the original plan assumed, prioritising depth and correctness on one region over breadth across five before any of them are proven.

## Where We Are Against That Vision

**What's proven so far:**
- The content model works and scales: distilleries, Natural Features, Journal, food/drink venues, all built to a documented editorial standard
- The two-stage review process (draft → Mark's review → independent second-pass → Airtable) holds up under real production pressure and has now been extended, successfully, to a whole new content type (Pre-Designed Days)
- The tech stack (Next.js/TypeScript/Tailwind, Airtable, Vercel, Leaflet/OpenStreetMap) is solid enough to support the Hub build and the core planner flow rework without a rebuild
- **A new product surface has been built and proven since 12 July: the Pre-Designed Days Hub** — 8 of ~15-16 planned Days complete (Bowmore Unhurried; Three Distilleries, One Road; Ardbeg on Foot; Lagavulin Unhurried; Farm to Bottle, Rhinns Peninsula; Bruichladdich, by the Loch; Kilchoman and Machir Bay; Three Legends, One Road), each sourced, drafted, and reviewed against a documented narrative standard (`day-narrative-standard.md`)
- **Accommodation affiliate status is now resolved**, closing out the single largest open risk in the 12 July plan (see Part C, Pillar 5)

**What's not yet proven:**
- Real booking conversion and affiliate commission — no live revenue data yet; accommodation links are built but not yet carrying real tracking codes
- Organic acquisition effectiveness — Instagram is ready but not yet publishing
- Whether the site's core planner flow rework (seeding a real Day into the workspace instead of opening blank) actually improves conversion — built and previewed, not yet live or measured
- Whether the single-region playbook actually ports cleanly to a second region, once one is eventually added

## Strategic Priorities, Current Sequencing (revised 18 July 2026)

This replaces the 12 July "next 2 quarters" list with the actual, more granular sequencing agreed since:

1. **Finish the remaining Hub Days content** (~7-8 of ~15-16 still to build), each through the full draft → review → second-pass process
2. **Site infrastructure and UX correctness** — navigation, back-button behaviour, links opening in new tabs where appropriate, the onboarding walkthrough rebuilt around a populated (not blank) workspace
3. **Go live**: add the Days Hub to live navigation, update the Classic Journeys so Islay has three total (the existing Grand Tour refactored onto the new Day-reference model, plus new journeys assembled from Hub Days)
4. **Integrate the accommodation solution properly** — real tracking codes, workspace-state wiring (location/dates/type pulled from what the visitor's already set, not re-asked)
5. **Complete remaining content** — Local Feature descriptions, any distilleries not yet Hub-covered
6. **Mobile design pass** — likely leaning harder on the pre-built Days than the full drag-and-build planner, given mobile visitors are expected to want a tap-and-go experience more than a build-from-scratch one
7. **Maintenance agents/processes** — formalising the fortnightly data-accuracy review as an actual recurring process, not just a stated intention
8. **Go-live marketing** — Instagram publishing, content calendar, and (further out) direct property partnerships and the IJTMG relationship

---

# PART B: OPERATIONAL PLAN

## 1. Content & Editorial Process

**Two-stage review, non-negotiable, for everything:** draft → Mark's review and iteration → independent second-pass review (a genuine check, not a rubber stamp) → only then written to Airtable, as Status: Draft. This governs distillery data, Natural Features, Journal posts, tour information, and now Pre-Designed Days content too.

**Tours data sourcing standard:** only the distillery's own official website is an acceptable source for pricing, tour formats, and names. Third-party aggregators (resellers, travel blogs, review sites) are never acceptable, even as a fallback. If official pricing isn't publicly listed, the field is marked **unconfirmed** rather than filled with an aggregator figure. Full detail and worked examples: `content-sourcing-standards.md`.

**Pending: a full tour audit direct from Mark**, across every distillery, once all Hub Day content is drafted and under review — this will supersede any Claude-researched tour data where the two conflict. Already happened once for real (Laphroaig's freshly-provided "Laphroaig Experience" differed substantially from the previously-researched "Grain to Glass Experience" record still on file).

**Day narrative standard** (new since 12 July, now formalised in `day-narrative-standard.md`): one whole-day paragraph per Hub Day, plain language over descriptive scene-setting, concrete specifics over vague atmosphere, warmth earned at the close rather than scattered through, only named and sourced tours, inline `[label](/path)` links matching the live record's name exactly.

**Coordinate verification hierarchy:** What3words (where the business publishes one) → postcodes.io → reasoned estimate, always disclosed honestly as an estimate. Several real errors caught and fixed under this discipline, most recently Dunyveg Castle and Lagavulin Bay's map pins.

**Natural Features standard:** formalised field checklist, dedicated single-column editorial layout, per-record Hero Focal Y field for individual vertical crop anchoring.

**Food & drink venue sourcing:** OpenStreetMap (ODbL licence) as the base source, with islayinfo.com as a manual cross-check. Google Places is explicitly ruled out as a display source due to ToS restrictions on showing Places content on non-Google maps.

## 2. Airtable as Golden Source

Days, Distilleries, Tours, and Local Features all live in Airtable, not hardcoded in the codebase. The Days Hub introduced two new tables — `Days` and `Day Stops` (a junction resolving which specific Tour applies to which Distillery within a given Day, since a Day can have multiple stops and a distillery can appear in more than one Day with a different tour each time).

**One deliberate, flagged exception:** the new default-day-flow seed (see Part C, Pillar 3) is currently hardcoded directly in the workspace code, not read live from the Days table — a pragmatic shortcut, not the intended end state. Revisit once the proper Day → itinerary resolution is built (the same underlying piece the Classic Journey refactor needs).

## 3. Review Cadences

**Fortnightly — Data & Content Accuracy Review** (not yet formally running as a scheduled process; still an intention, per the 12 July plan, not yet built out as an owned checklist with a calendar slot):
- Spot-check tour pricing/hours against official distillery sites
- Re-verify any time-bound editorial notes for status changes
- Check for broken affiliate/booking links
- Confirm the Airtable attachment image proxy is still resolving correctly on a sample of pages

**Monthly — Finance, GA & Strategy Review** (1st of each month): GA report, affiliate payout reconciliation once bookings exist, financial spreadsheet update, next month's content/partnership plan.

## 4. Known Technical Constraints

- **Airtable Data Cache vs. page-level ISR**: Airtable-only content changes need a cache-busting commit to `main` to show live — but the underlying Next.js Data Cache can persist *across* deployments, not just within one, so even a fresh redeploy doesn't always guarantee instant freshness. Full detail: `technical-notes.md`.
- **Browser automation / visual QA — corrected finding.** The 12 July plan described this as "a site-side continuous-activity issue." Follow-up investigation (18 July) disproved that specific theory: the page was confirmed genuinely idle by every measure available (`document.readyState` complete, zero new network requests over a 3-second window), and disabling the Vercel Toolbar made no difference either. The failure persists even on a plain, feature-free homepage. This points to a limitation in the browser automation tooling itself, not a DramStory site bug — worth knowing so nobody spends further time chasing an app-level cause. Practical effect is unchanged either way: screenshots from Mark remain the reliable path for visual review.
- **Airtable API quota (historical, resolved)**: a live image-proxy approach once risked burning through Airtable's Free-plan call quota during heavy content-building sessions. Upgrading to Airtable's Team plan resolved the headroom problem; the current image approach (`/api/attachment` proxy resolving signed-URL expiry) remains the working solution and hasn't recurred as an issue.

## 5. Git / Technical Workflow

- Feature branches for anything non-trivial — built, tested, and previewed via a Vercel preview deployment before ever touching `main`/production.
- GitHub PAT handling: clone/push with the token in the URL, then immediately strip it back out via `git remote set-url` — never left sitting in the remote config.
- Type-check and lint before every commit.

## 6. Pre-Launch Checkpoint (per new region, once regions beyond Islay & Jura are eventually added)

- Content model applied consistently
- Two-stage review completed for all records
- Coordinates verified per the hierarchy
- Homepage/IA updated without disrupting the existing region
- Affiliate links live and tracking confirmed
- Mobile UX tested (screenshot-based review, given the automation constraint above)
- Fortnightly review cadence extended to cover the new region's content

---

# PART C: THE FIVE PILLARS

## Pillar 1: Customer

**Avatar: "The Collector/Pilgrim"** — unchanged since the original plan, nothing in the actual build has surfaced a reason to revisit it:
- Male, 35–70, concentration in 45–65
- UK-based or international (English-speaking)
- Meaningful discretionary income
- Whisky collector or enthusiast; bucket-list pilgrim or annual-tradition traveller
- Travels in groups of 2–4

Worth genuinely re-testing once real user data exists post-launch, but not worth second-guessing pre-emptively.

**Acquisition channels:**

| Channel | Status | Notes |
|---|---|---|
| Organic social (Instagram) | Ready, not yet publishing | Brand, tone, and content pillars locked; content calendar is the next concrete step |
| Organic search (SEO + Journal) | Partially live | Journal infrastructure shipped |
| Distillery partnerships | Not yet confirmed | See Pillar 5 for the direct-partnership economics now worked out in detail |
| Tourism board relationship (new since 12 July) | Early-stage, real groundwork done | See Pillar 5 - Islay and Jura Tourism and Marketing Group (IJTMG) |

## Pillar 2: Marketing & Brand

**Brand identity (locked):** DramStory (dramstory.com). Tagline "Where whisky adventures begin." Archetype: Storyteller. Palette: warm amber, deep navy, cream, copper/bronze accent, muted green for category iconography. Typography: Garamond (headers/brand), Inter (UI/body). Imagery style: warm golden-hour photography, real places, avoids stock-photo gloss.

**Differentiator, restated and now genuinely lived up to by the Hub:** *the only platform where you author your journey, not book from a list* — while also never asking someone to start from a blank page. The Hub's own copy captures this directly: *"Add it straight to your trip, then make it yours — keep what you love, swap out what you don't."*

**Content pillars** (from the original plan, still holding, worth a light refresh once Natural Features/food venue content volume grows): Adventure Stories, Adventure Guides, Insider Tips.

**Content calendar/scheduling:** not yet built — still the next concrete marketing step once site work reaches its go-live milestone.

## Pillar 3: Product

**Live/built today:**
- Distilleries, Natural Features, Journal, food/drink venues, all built to the documented editorial standard
- Islay Grand Tour (existing flagship journey — due for refactor onto the new Day-reference model)
- Drag-and-drop itinerary builder with day reordering, persisted trip state
- **Pre-Designed Days Hub** — 8 of ~15-16 Days complete, real Airtable `Days`/`Day Stops` schema, real interactive maps (Leaflet + CartoDB Positron muted basemap) for multi-stop Days, real distillery hero images for solo Days, a "See more" collapse for longer narratives, an "inspiration not bookings" disclaimer
- **Reworked core planner flow** (built, previewed, not yet live): the old region-picker ("Q2") and preference question ("Q3") are inactivated; a fresh planning/dreaming visit now seeds the workspace with a real pre-built Day (currently "Three Legends, One Road": Laphroaig, Lagavulin, Ardbeg) instead of opening on a blank map. "Today" timing still uses the old no-pre-seed default, flagged as needing its own considered default later
- Map default centre corrected to Port Ellen (was a generic island-midpoint near Bowmore)
- **Accommodation booking UI shell** (built, previewed, using placeholder tracking codes) — select location, select type, generate tracked links to Hotels.com (primary), Vrbo and Booking.com (secondary)

**Not yet live (open decisions, in current priority order — see Part A):**
1. Remaining ~7-8 Hub Days
2. Site navigation/infrastructure correctness (back behaviour, new-tab links, onboarding walkthrough rebuilt around the new populated-workspace default)
3. Days Hub added to live navigation; Classic Journeys refactored + expanded to 3 total for Islay
4. Real accommodation tracking codes wired in; location/dates/type pulled from existing workspace state rather than re-asked
5. Remaining content completion
6. Mobile design pass
7. User accounts / save-trips / login — still not built; trip state lives in-session only (`TripContext`). Deliberately deferred per `deferred-features.md`, revisit once accommodation booking going live makes persistence genuinely necessary
8. Gamification — deliberately deferred per `deferred-features.md`; one specific idea (a first-Hub-Day-added badge) logged there for whenever this gets revisited properly

**Tech stack:** Next.js/TypeScript/Tailwind, Airtable as CMS, Vercel deployment, Leaflet/OpenStreetMap for maps. Repo: `hodgkinsonmark1-pixel/DramStory`. Airtable base: `app14n7N50HZGglqV`.

## Pillar 4: Team & Staffing

- **Mark** — founder, product owner, works across product, content curation, and development; primary technical and editorial partner is Claude
- **Business partner** — travel writing and photography
- **Developer** — supporting technical build
- **Social media marketer** — Instagram and content scheduling
- **Blog writer** — Journal content
- **Partner manager** — distillery and affiliate relationships

Team size already exceeds the original bootstrap plan's assumption ("you + part-time marketer, no other hires until Month 6+") — worth revisiting the cost-base assumptions below unless these roles are unpaid/equity/informal at this stage.

## Pillar 5: Finance

**Revenue model:** affiliate commissions only. Zero customer-facing payments.

**Monetisation sequencing:**
1. Accommodation and vehicle affiliate income — the initial revenue focus
2. Distillery affiliate income — added once accommodation/vehicle is established
3. Wider site/region expansion — later still

**Accommodation affiliate status — now confirmed, replacing the 12 July plan's Booking.com/Agoda risk framing entirely.**

Active, approved accounts: **Expedia Group Travel Creator Program** (covers Expedia.com, Hotels.com, and Vrbo under one account) and **Booking.com UK affiliate programme**. Expedia.com itself is deliberately excluded as a brand — too broad for this audience. Hotels.com and Vrbo used instead, under the same account.

**Confirmed commission terms:**

| Supplier | Rate | Attribution window | Notes |
|---|---|---|---|
| Hotels.com (hotel) | 4% | 7-day cookie | Confirmed via Expedia Group's own commission-terms page |
| Hotels.com (vacation rental) | 2% | 7-day cookie | Open question: does a cottage booked via a hotels.com URL fall under the 4% hotel tier or the 2% rental tier? Unconfirmed - worth clarifying directly with Expedia Group before assuming the full 4% applies to Islay's mostly-cottage inventory |
| Vrbo | Same account as above | Same 7-day cookie | Uses a different linking mechanism (Partnerize `camref` wrapper), not the same simple query-param deep link as Hotels.com. Application in progress as of 18 July |
| Booking.com | 4% flat, accommodation & attractions | **Session-based** - only credits a booking completed in the same browser session as the click | Confirmed via Mark's own welcome pack. Real practical weakness given trip research typically spans multiple sessions, not one sitting |
| Car rental (Expedia Group) | 1.5% | 7-day cookie | Confirmed low - noted as a real data point for whenever vehicle affiliate income is pursued, not something to build toward yet |

**Decision: Hotels.com is the primary supplier**, Vrbo and Booking.com secondary. Reasoning: the 7-day cookie window is a much better fit for how visitors actually research a multi-day whisky trip (over several visits) than Booking.com's session-based model.

**Direct property partnerships (future, staged):** the gap between what a property pays an OTA for distribution (typically ~15-25%+ of booking value) and what trickles down to an affiliate referrer (4% via Hotels.com) means a direct partnership with an individual property can pay DramStory more (realistically ~10-15%, negotiated) while the property simultaneously pays out less than their current OTA rate.

**Worked example (Machrie Hotel, 21-25 Sept, £1,206 booking):**
- Via Hotels.com today: ~£48 to DramStory (4%)
- Via a direct 10% deal: ~£121 to DramStory, while the Machrie likely nets more too (assuming a ~15-25% OTA rate today, unconfirmed - would need confirming directly with the property)

**Integration options, simplest to most robust:** (1) a unique tracked link/promo code, trust-based, cheapest to set up; (2) a small third-party affiliate-tracking tool (e.g. Tapfiliate, Post Affiliate Pro, Impact.com) for independent verification without OTA-scale infrastructure — the realistic recommendation if this gets serious; (3) a full booking-API integration — a bigger undertaking, not near-term.

**Recommended shape: two tiers, not one rollout.** A small number of larger, well-resourced properties (Machrie-style) are worth pursuing as bespoke direct partnerships. Everything smaller (single-owner cottages, phone/email-only bookings) stays on the OTA affiliate links by default.

**Islay and Jura Tourism and Marketing Group (IJTMG) — future partnership opportunity (new since 12 July).** Real, existing organisation: Islay and Jura Tourism and Marketing Group, running islayjura.com, part of the wider Argyll & The Isles Tourism Cooperative (AITC).
- **Co-chairs**: Emma Clark (runs Glenegedale House; also Vice Chair of AITC) and Iain Hamilton (GM, The Machrie)
- **Contact**: hello@islayjura.com
- **Structure**: volunteer-run trade/marketing group, funded by member-business subscriptions, not a large public-sector tourism budget

**Realistic read**: a formal "license fee" deal is probably the wrong shape to expect given the volunteer/small-budget structure. The more realistic opportunity is a partnership/referral arrangement - IJTMG promoting DramStory to their members and visitors in exchange for a modest referral/sponsorship arrangement.

**Staged medium-term plan (agreed 18 July 2026):**
1. Get traffic to the site
2. Benefit from affiliate income where possible
3. Contact IJTMG directly with verified traffic data, seek a meeting
4. Look to agree partnership/referral rates with IJTMG's own listed accommodation providers, each signing up to a DramStory-run affiliate/tracking arrangement, updating their own listing content on DramStory directly, with a "Book Now" option on their map pin

**Real friction flagged on step 4, not yet resolved:** tech readiness varies hugely across smaller operators; self-edited listing content creates a quality/voice-consistency tension needing a review step; verification gets harder the smaller the operator.

**Best timing for all of the above:** once DramStory has a live, working product and real traffic to point to.

**Unit economics and monthly targets** (original plan's figures, structure unchanged, still unproven in practice — no live bookings data exists yet): carried forward from the 12 July version pending real data to test against. Should be revisited once accommodation tracking codes are live and the first bookings start flowing.

---

## Document Control

- **Version:** 2.0 (reconciles the 12 July "Business Plan (Updated)" with everything built and decided since, most significantly the Pre-Designed Days Hub, the confirmed accommodation affiliate terms, the Islay & Jura-only scope decision, and the IJTMG groundwork)
- **Supersedes:** DramStory — Business Plan (Updated), 12 July 2026; Scotland Whisky Trails "3-Eyes" Business Plan, 30 June 2026
- **Last updated:** 19 July 2026
- **Next review:** alongside the next fortnightly data-accuracy pass, or immediately if real accommodation tracking codes go live or the Hub reaches its go-live milestone
