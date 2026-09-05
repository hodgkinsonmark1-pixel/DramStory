# Auth email templates

Paste into **Supabase → Authentication → Emails**. Kept here so the
templates have a history and a review, rather than existing only inside
a dashboard textarea nobody can diff.

| File | Supabase template | Subject to set |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your DramStory account |
| `magic-link.html` | Magic Link | Your DramStory sign-in link |

**Both are needed.** Supabase sends *Confirm signup* the first time an
address is used and *Magic Link* every time after. Brand one and half
your visitors get the unbranded Supabase default.

## Setting up sending — do this first

The templates change how the email looks. They do nothing about who it
comes from, and until custom SMTP is configured **Supabase will not
deliver to anyone outside the project team, at a limit of 2 messages per
hour.**

1. **Resend** — create an account, add and verify `dramstory.com`
   (DKIM, SPF and DMARC records at your DNS host). Verification is the
   slow step; the rest is minutes.
2. **Create an API key** in Resend.
3. **Supabase → Authentication → Emails → SMTP Settings**, enable custom
   SMTP and enter:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |
   | Sender email | `no-reply@dramstory.com` |
   | Sender name | `DramStory` |

4. **Raise the rate limit.** Supabase applies a cautious 30/hour after
   custom SMTP is enabled — Authentication → Rate Limits.

## Why these templates are so plain

Deliberate, and worth not "improving" later without reading this.

Supabase's deliverability guidance for authentication email is explicit:
no marketing language, no taglines, no explanation of what the product
is, few links, few images. Spam filters read those signals as
promotional, and an authentication email in a spam folder means somebody
cannot get into their account.

So the brand is carried by colour, typography and the sender name, and
nothing else. The DramStory voice belongs in the newsletter.

**A logo is fine, and is in both templates.** The guidance says *reduce*
images, not eliminate them. One logo alongside plenty of real text is
normal, expected, and helps: an authentication email with no branding at
all looks more like phishing, not less. What actually trips filters is
image-heavy or image-only email, and tracking pixels — neither of which
these are.

Three rules it follows: an absolute `https://` URL (email clients will
not resolve a relative path), real `alt` text so it degrades to the word
"DramStory" when images are blocked — which many clients do by default —
and explicit width and height so the layout does not jump while it
loads. The wordmark below it is text, not part of the image, so the
email reads correctly either way.

Two technical notes that look like mistakes and are not:

- **Tables and inline styles.** Email clients are twenty years behind
  browsers; Outlook still renders with Word's engine. A `<div>` and a
  stylesheet will not survive it.
- **Georgia, not Cormorant Garamond.** Web fonts do not load in most
  email clients. Georgia is the nearest serif that is actually installed
  everywhere.

## Keep auth and marketing apart

When the newsletter ships, send it from a different address —
`no-reply@dramstory.com` for auth against a separate marketing sender.
Supabase recommend this so that if one sender's reputation falls it does
not take the other down with it. Losing the newsletter to a spam folder
is a nuisance; losing sign-in is an outage.
