# Legal pages — drafts

**Status: DRAFT. Not published. Not reviewed by a lawyer.**

Four documents, drafted 3 September 2026 against what the code actually does,
not against what a template assumes a travel site does.

| File | Replaces footer link |
|---|---|
| `privacy-policy.md` | Privacy Policy |
| `terms-of-use.md` | Terms of Use |
| `cookie-policy.md` | Cookie Policy |
| `affiliate-disclosure.md` | Affiliate Disclosure |

## Read this before publishing any of them

**These need professional review.** A privacy policy is a legal representation
to your users about what you do with their data. A plausible-sounding one that
is wrong is worse than none — it is a statement you can be held to.

I have drafted them so that review is cheap: everything is grounded in the
actual code, and every gap is marked rather than filled with a guess.

## How the markers work

- **`[[TO CONFIRM: ...]]`** — a fact only Mark has. Company number, registered
  address, ICO registration number. These must be filled before publication.
- **`[[NOT YET BUILT: ...]]`** — describes accounts, the newsletter or badges,
  which do not exist yet. **Delete these sections if publishing before those
  ship**, or the policy describes processing that is not happening. Reinstate
  them with the feature.
- **`[[ASSUMPTION: ...]]`** — a position I have taken that is defensible but
  is a judgement call. These are the ones to put in front of a solicitor.

## What the code actually does today, as at 3 Sep 2026

Established by reading the source, not by assumption:

- **No cookies are set by this site.** No `document.cookie`, no `cookies()`.
- **Analytics: Plausible**, decided 4 Sep 2026, not yet installed. Cookieless
  and EU-hosted, so **no consent banner** — relying on the ICO's statistical
  purposes exception. The conditions that position depends on are recorded at
  the top of `cookie-policy.md` and are not optional.
- **Two `localStorage` keys**: `dramstory-trip-v2` and `dramstory-journey`.
  Both hold the visitor's own trip. Neither leaves the browser.
- **No accounts, no logins, no email collection.** `/login` is a "coming soon"
  page. The newsletter form is not wired to anything.
- **Third parties that receive the visitor's IP address** when specific
  features are used: OpenStreetMap (map tiles), Google (Places UI Kit, only
  when a food or drink venue's live details are opened), Airtable (images, via
  the site's own proxy route), Vercel (hosting).
- **Affiliate links** to Hotels.com and Booking.com.

This is an unusually clean position. It is worth keeping — every tracker added
later makes all four of these documents longer and the compliance burden real.
