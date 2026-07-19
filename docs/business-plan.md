# DramStory Business Plan

**Note on this document:** an earlier, fuller business plan (`swt-business-plan-final-3eyes.md`, built across early sessions against a 7-pillar structure - Vision & Goal, Customer, Marketing & Brand, Product, Staff, Finance, Operations) exists only as conversation history, not as a recoverable file - past chat sessions don't carry files forward. This document is a genuine current source of truth from this point on, not a full reconstruction of that earlier plan. Sections below are what's been explicitly confirmed since; older sections (Customer avatar, Marketing & Brand, Staff, Finance in full) should be treated as unverified until revisited.

## Core objective

DramStory exists so a visitor can build their perfect road trip and reach a genuine booking decision in under two minutes.

## Top-level product principle

Everything on the site must be intuitive, add value, be accurate, and be emotive where appropriate. This sits above the Day-narrative standard (`day-narrative-standard.md`) as the site-wide bar everything else answers to, not just narrative copy.

## Monetization sequencing

1. **Accommodation and vehicle affiliate income** - the initial revenue focus
2. **Distillery affiliate income** - added once accommodation/vehicle is established
3. **Wider site/region expansion** - later still

## Accommodation affiliate programs (confirmed 18 July 2026)

Active, approved accounts: **Expedia Group Travel Creator Program** (covers Expedia.com, Hotels.com, and Vrbo under one account) and **Booking.com UK affiliate programme**.

**Expedia.com itself excluded** - too broad a brand for this audience. Hotels.com and Vrbo used instead, under the same account.

**Confirmed commission terms:**

| Supplier | Rate | Attribution window | Notes |
|---|---|---|---|
| Hotels.com (hotel) | 4% | 7-day cookie | Confirmed via Expedia Group's own commission-terms page |
| Hotels.com (vacation rental) | 2% | 7-day cookie | Open question: does a cottage booked via a hotels.com URL actually fall under the 4% hotel tier or the 2% rental tier? Brand-vs-property-type eligibility unconfirmed - worth clarifying directly with Expedia Group before assuming the full 4% applies to Islay's mostly-cottage inventory |
| Vrbo | Same account as above | Same 7-day cookie (Expedia Group) | Uses a different linking mechanism (Partnerize `camref` wrapper), not the same simple query-param deep link as Hotels.com |
| Booking.com | 4% flat, accommodation & attractions | **Session-based** - only credits a booking completed in the same browser session as the click, not a multi-day window | Confirmed via Mark's own welcome pack. This is a real practical weakness given trip research typically spans multiple sessions |

**Decision: Hotels.com is the primary supplier**, Vrbo and Booking.com secondary. Reasoning: the 7-day cookie window is a much better fit for how visitors actually research a multi-day whisky trip (over several visits, not in one sitting) than Booking.com's session-based model.

**Vrbo application in progress** - apply regardless of the open deep-link-parameter-accuracy question (the application costs nothing and doesn't depend on it); verify actual pre-fill behaviour with a real `camref` once approved, rather than assuming it works, before treating it as equal to the other two.

**Car rental affiliate rate is low** (1.5% via Expedia Group) - noted as a real data point for whenever vehicle affiliate income is pursued, not something to build toward yet.

## Direct property partnerships (future, staged)

The gap between what a property pays an OTA for distribution (typically ~15-25%+ of booking value) and what trickles down to an affiliate referrer (4% via Hotels.com) means a **direct partnership with an individual property** can pay DramStory more (realistically ~10-15%, negotiated) while the property simultaneously pays out less than their current OTA rate - both sides benefit by cutting out the OTA's own cut, not by fighting over the same margin.

**Worked example (Machrie Hotel, 21-25 Sept, £1,206 booking):**
- Via Hotels.com today: ~£48 to DramStory (4%)
- Via a direct 10% deal: ~£121 to DramStory, while the Machrie likely nets more too (assuming a ~15-25% OTA rate today, unconfirmed - would need confirming directly with the property)

**Integration options, simplest to most robust:**
1. A unique tracked link/promo code, trust-based, cheapest to set up
2. A small third-party affiliate-tracking tool (e.g. Tapfiliate, Post Affiliate Pro, Impact.com) giving independent verification without needing OTA-scale infrastructure - the realistic recommendation if this gets serious
3. A full booking-API integration (needs the property's booking-engine provider to expose an API) - a bigger undertaking, not a near-term step

**Recommended shape: two tiers, not one rollout.** A small number of larger, well-resourced properties (Machrie-style) are worth pursuing as bespoke direct partnerships. Everything smaller (single-owner cottages, phone/email-only bookings) stays on the OTA affiliate links by default - not a lesser option, just the right-sized one for a business too small to support a custom tracked arrangement or independent verification.

## Islay and Jura Tourism and Marketing Group (IJTMG) - future partnership opportunity

Real, existing organisation (not hypothetical): **Islay and Jura Tourism and Marketing Group**, running islayjura.com, part of the wider Argyll & The Isles Tourism Cooperative (AITC).

- **Co-chairs**: Emma Clark (runs Glenegedale House; also Vice Chair of AITC - a bridge to the wider cooperative) and Iain Hamilton (GM, The Machrie)
- **Contact**: hello@islayjura.com
- **Structure**: volunteer-run trade/marketing group, funded by member-business subscriptions, not a large public-sector tourism budget. Their own site (islayjura.com) is a fairly standard business-directory (listings, photos, contact details, a map) - nothing like DramStory's interactive planner.

**Realistic read**: a big formal "license fee" deal is probably the wrong shape to expect given the volunteer/small-budget structure. The more realistic opportunity is a **partnership/referral arrangement** - IJTMG promoting DramStory to their members and visitors, DramStory positioned as the islands' trip-planning tool, in exchange for a modest referral/sponsorship arrangement rather than a formal license. The relationship-driven structure (two named, contactable, hospitality-industry people) is a genuine advantage over pitching a faceless procurement board.

**Staged medium-term plan (agreed 18 July 2026):**
1. Get traffic to the site
2. Benefit from affiliate income where possible
3. Contact IJTMG directly with verified traffic data, seek a meeting
4. Look to agree partnership/referral rates with IJTMG's own listed accommodation providers (e.g. the self-catering operators at islayjura.com/explore/islay-self-catering) - each signing up to a DramStory-run affiliate/tracking arrangement, updating their own listing content on DramStory directly, with a "Book Now" option on their map pin

**Real friction flagged on step 4, not yet resolved:**
- Tech readiness varies hugely across that list - a hotel with a real booking engine is a genuine candidate; a single-owner cottage taking bookings by phone/WhatsApp may have no system to attach tracking to at all
- Self-edited listing content creates a quality/voice-consistency tension against the site's established sourcing and tone standards - would need a review/moderation step before publishing, not open self-editing straight to the live page
- Verification gets harder the smaller the operator - fine for a handful of known relationships, harder to scale to "every lister"

**Best timing for all of the above**: once DramStory has a live, working product and real traffic to point to - a working site is a far stronger opening move than a plan or pitch deck.
