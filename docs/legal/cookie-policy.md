# Cookie Policy

**DRAFT — not published, not legally reviewed. See `README.md`.**

Last updated: [[TO CONFIRM: publication date]]

---

## Decision record — 4 Sep 2026

**Analytics: Plausible.** Cookieless, aggregate-only, EU-hosted, never used for
advertising.

**No consent banner.** Relying on the ICO's **statistical purposes exception**
under the storage and access technologies guidance: the data is used only to
improve this site, and what comes out is aggregate statistics that cannot
identify anyone.

**This exception is conditional, and the conditions are the whole basis for not
having a banner.** If any of these stop being true, consent becomes mandatory
and this page must change:

- Plausible stays cookieless and aggregate-only
- Analytics is never used for advertising, retargeting or audience building
- No affiliate network JavaScript tag is added to the site — plain deep links
  only. A tag sets first-party storage and would need consent.

Google Analytics was rejected: Google processes the data for its own purposes,
which breaks the first condition of the exception and would bring a banner, a
consent management platform, and a transfer assessment with it.

**Outbound click tracking to featured hotels is in scope and does not change
this** — a count of clicks per link is still aggregate.

---

## We don't set any cookies

DramStory sets no cookies. There is no advertising, no tracking across other
websites, and nothing that follows you when you leave.

That is why you have not been asked to accept anything. There is nothing to
accept.

## What we do store, and why

**Your trip.** The days, stops, dates and notes you build are saved in your own
browser (`localStorage`, under `dramstory-trip-v2` and `dramstory-journey`).
It stays on your device, is never sent to us, and we cannot read it. Clearing
your browser data deletes it, and we cannot recover it.

[[ASSUMPTION: treated as strictly necessary under PECR — it holds nothing but
the visitor's own input for the service they asked to use.]]

## Measuring how the site is used

We count visits using **Plausible**, a privacy-focused analytics service hosted
in the EU.

We do this to understand which pages people find useful and where the site is
confusing — nothing else.

- **No cookies.** Nothing is stored on your device for this.
- **No identifiers.** We cannot tell one visitor from another, or recognise you
  on a later visit.
- **Aggregate only.** We see "412 people read the Ardbeg page this week". We
  cannot see that *you* did.
- **Never used for advertising**, and never shared with advertisers.

We also count how often links out to hotels and booking sites are clicked, in
the same way — a total per link, with nothing recorded about who clicked it.

## Third parties, and when they hear from you

Some features load content from other companies, so your browser contacts them
directly and they see your IP address.

| Feature | Company | When |
|---|---|---|
| Map tiles | OpenStreetMap | Whenever a map is shown |
| Live opening hours and ratings on food and drink venues | Google | **Only when you open one of those cards.** Not on page load. |
| Photography | Airtable | Never directly — proxied through our own server |
| Hosting | Vercel | Every request, as server logs |

The Google card is the only place a third party is likely to set its own
cookies, and it loads only if you choose to open it.

**Affiliate links** to Hotels.com and Booking.com carry a code identifying
DramStory as the referrer. Nothing is set on your device by us. When you click
one and arrive on their site, they may set their own cookies under their own
policy — that is their storage on their domain, not ours.

## [[NOT YET BUILT — delete until accounts ship]] When accounts arrive

Signing in will set **one** cookie, keeping you signed in. It is strictly
necessary — without it we cannot know it is you — so it needs no consent. It
carries no advertising identifier, and signing out removes it.

If we ever add anything non-essential, this page will change and you will be
asked first.

## Managing storage yourself

Every browser lets you view and clear site storage, usually under Settings →
Privacy. Clearing it for dramstory.com deletes your saved trip, which we cannot
restore. Blocking storage will not stop you reading the site, but the planner
will forget your trip between visits.

## Questions

[[TO CONFIRM: contact address]]
