# Privacy Policy

**DRAFT — not published, not legally reviewed. See `README.md`.**

Last updated: [[TO CONFIRM: publication date]]

---

## Who we are

DramStory is a whisky travel planning site for Islay and Jura, operated by
DramStory Ltd.

- **Company:** DramStory Ltd, registered in [[TO CONFIRM: England and Wales /
  Scotland]], company number [[TO CONFIRM]]
- **Registered address:** [[TO CONFIRM]]
- **Contact:** [[TO CONFIRM: privacy@dramstory.com or similar]]
- **ICO registration number:** [[TO CONFIRM — see plan §6.1; Tier 1, £52/year,
  register before collecting any email address]]

We are the **data controller** for the personal data described here. That means
we decide why it is collected and what happens to it, and we are accountable
for it — including where we use other companies to process it on our behalf.

## The short version

We collect as little as we can get away with.

Browsing DramStory requires no account and collects no personal data. The trip
you build is stored **in your own browser**, not on our servers. We set no
cookies and run no analytics.

[[NOT YET BUILT — delete this paragraph until accounts ship]] If you create an
account, we store your email address and the trips you save, so they follow you
between devices. Nothing more.

---

## What we collect, and why

### If you just use the site

**Nothing that identifies you.** No account, no cookies, no analytics, no
tracking pixels.

Your trip — the days, stops and notes you build — is saved in your browser's
own storage (`localStorage`), under the keys `dramstory-trip-v2` and
`dramstory-journey`. We cannot read it. It does not leave your device. Clearing
your browser data deletes it, and we cannot recover it for you.

[[ASSUMPTION: we treat this storage as "strictly necessary" under PECR
regulation 6(4), because it exists solely to deliver the trip planner the
visitor explicitly asked to use, and holds nothing but their own input. This is
why no consent banner is shown. It is a defensible reading and the one most
planning tools take, but it is a judgement call worth confirming.]]

### Server logs

Our hosting provider, Vercel, records standard request information including IP
addresses, for security and to keep the site running. We do not use these logs
to build any profile of you.

### Measuring how the site is used

Decided 4 Sep 2026: **Plausible**, cookieless and EU-hosted. See
`cookie-policy.md` for the reasoning and the conditions the no-banner position
depends on.

We count visits so we know which pages are useful and where the site confuses
people, and we count how often links out to hotels and booking sites are
clicked. We do not use analytics for advertising.

- No cookies, and nothing stored on your device
- No identifier that would let us recognise you, now or on a later visit
- Aggregate figures only — we can see that a page was read 412 times, not that
  you read it

**Lawful basis: legitimate interests** — understanding whether a site works is
a reasonable thing for its operator to do, and this is about the lowest-impact
way to do it. You can object; contact us.

[[ASSUMPTION: relies on the ICO's statistical purposes exception under PECR, so
no consent banner. Conditional on the tool remaining cookieless and
aggregate-only, and used solely to improve this site.]]

### [[NOT YET BUILT]] If you create an account

| What | Why | Lawful basis |
|---|---|---|
| Email address | To sign you in and to be the account itself | Contract |
| Trips you save | The service you asked for | Contract |
| Places you mark as visited | Your badge progress | Contract |
| Whether you opted in to email | To prove we had your permission | Legal obligation |

We do **not** ask for your name, date of birth, postal address or payment
details. We never see a password, because we do not use them — you sign in
through a link sent to your email.

### [[NOT YET BUILT]] If you subscribe to the newsletter

Your email address, the date you confirmed, and where you signed up from.

We use **double opt-in**: after you enter your address we send a confirmation
email, and you receive nothing further unless you click the link in it.

**Lawful basis: consent.** You can withdraw it at any time using the
unsubscribe link in every email we send. Withdrawing is one click and does not
require you to tell us why.

---

## Who else receives your data

We use a small number of other companies. They act on our instructions and
cannot use your data for their own purposes.

| Who | What for | What they receive |
|---|---|---|
| Vercel | Hosting | Request logs including IP address |
| Plausible (EU-hosted) | Counting visits and outbound clicks | Page requested, referrer, country. No identifier, no cookie. |
| Airtable | Our own content — distilleries, tours, features | Nothing about you. Images are proxied through our own server so your browser never contacts Airtable directly. |
| OpenStreetMap | Map tiles | Your IP address, when a map loads |
| Google | The live details card on food and drink venues | Your IP address and device information, **only when you open one of those cards.** Not loaded otherwise. |
| [[NOT YET BUILT]] Supabase | Accounts and saved trips | Email address, trips, visits |
| [[NOT YET BUILT]] Resend | Sending sign-in links and the newsletter | Email address |

[[TO CONFIRM: Supabase project must be created in an EU or London region so
this stays accurate. See plan §2.]]

We do not sell your data. We do not share it with advertisers. Nobody pays us
to put their product in front of you.

**Affiliate links** to Hotels.com and Booking.com pass a tracking code that
tells them the booking came from us. That code identifies **us**, not you. What
those companies then do with your data on their own sites is governed by their
privacy policies, not this one. See our Affiliate Disclosure.

---

## How long we keep it

| Data | Kept for |
|---|---|
| Trip in your browser | Until you clear it. We never see it. |
| Server logs | [[TO CONFIRM: Vercel's retention period for your plan]] |
| [[NOT YET BUILT]] Account and trips | Until you delete your account |
| [[NOT YET BUILT]] Newsletter subscription | Until you unsubscribe, then a record that you unsubscribed, so we do not email you again by mistake |

---

## Your rights

Under UK data protection law you can ask us to:

- **Give you a copy** of the personal data we hold about you
- **Correct** anything that is wrong
- **Delete** it
- **Restrict** or **object to** how we use it
- **Port** it — receive it in a machine-readable format
- **Withdraw consent** for marketing at any time

[[NOT YET BUILT]] Account holders can export and delete everything from account
settings, without contacting us.

To exercise any of these, email [[TO CONFIRM: contact address]]. We will
respond within one month.

If you are unhappy with how we have handled your data you can complain to the
Information Commissioner's Office at ico.org.uk or on 0303 123 1113. We would
rather you told us first, but you do not have to.

---

## Children

DramStory is about whisky and is intended for adults. It is not directed at
anyone under 18, and [[NOT YET BUILT]] accounts require you to confirm you are
18 or over.

We do not knowingly collect data from children. If you believe a child has
given us their data, contact us and we will delete it.

---

## Changes

If we change this policy we will update the date at the top. If the change is
significant — new categories of data, a new purpose, a new processor — we will
say so clearly, and tell account holders by email.

---

## Security

[[ASSUMPTION: written to describe the intended Phase 1 setup. Must be checked
against what is actually built before publication — this is the section most
likely to become untrue.]]

Data is encrypted in transit. Accounts use sign-in links rather than passwords,
so there is no password to steal. Access to the production database is limited
to the site operator. [[NOT YET BUILT: daily backups, once on the Supabase Pro
plan — see plan §2.2.]]

No system is perfectly secure. If a breach affects your rights we will tell the
ICO within 72 hours and you without undue delay.
