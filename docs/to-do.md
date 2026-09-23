# To-do

Live task list. Things that are actually next, with who holds them.

Not a backlog — parked ideas live in `docs/deferred-features.md`, the
account/newsletter scoping in `docs/accounts-and-badges-plan.md`, and the
page-by-page design work in `docs/design-pass.md`.

Last updated: 23 September 2026

---

## ✅ The compliance gates are closed

Both cleared. Recorded here because the previous version of this file
listed them as blockers for a fortnight after they stopped being the
thing in the way.

- **ICO registration** — done 21 September 2026. Sole trader, Tier 1.
- **Privacy and cookie policies published** — live since 21 September,
  and **corrected on the 23rd**: see the warning below about why that
  correction was needed, because the same trap is set again every time
  the site starts doing something new.

---

## ⚠️ The pattern that keeps catching us

Three separate times now, the site has **claimed something the plumbing
could not honour**. Worth reading as one thing rather than three:

1. **Discover Cars** carried "we earn a commission" on the homepage for
   three weeks while the link was a bare domain with no tracking.
2. **Hotels.com** links carried `YOUR_MDPCID_HERE` for seven weeks while
   the affiliate disclosure named the Expedia programme.
3. **The privacy policy** said "no account… we never see it" for two days
   after accounts went live and started storing email addresses.

Every one looked completely fine from the outside. Nothing was broken;
links worked, pages rendered, the policy read well. **The failure mode is
always a true-sounding statement that nobody re-checked after the thing
it described changed.**

The defence is boring and specific: when a feature ships, ask what the
site now *says* that it did not do before, and go and look.

---

## Now

### Verify the money actually arrives — *Mark*

Both affiliate links are wired and neither has ever been confirmed
earning. This is the direct lesson of the two entries above.

- [ ] Click a **Hotels.com** link from the live site — any area page, or
      the accommodation panel on a journey — then check the click appears
      in the Expedia Travel Creator dashboard. There is a
      [testing guide](https://help.creator.expediagroup.com/hc/en-us/articles/15360985533463-How-do-I-test-my-Affiliate-Links).
- [ ] Click the **Discover Cars** link from the homepage, then check the
      Discover Cars dashboard. The link is now `?a_aid=DramStory`, which
      is their own affiliate parameter rather than the CJ click-through an
      earlier note assumed.
- [ ] Once Plausible has a few weeks of outbound-click data, compare its
      counts against both dashboards. A large gap is the only way to
      notice that a link has quietly stopped attributing.

### The newsletter has no way to send a newsletter — *Both*

Worth being blunt about: **people can now subscribe to something that
cannot yet be sent.** Subscribe, confirm and unsubscribe all work and are
live. There is no mechanism to write an issue and send it to the
confirmed list, and no issue to send.

That is not an emergency — the confirmation email sets the expectation of
"once a month", and nobody has subscribed yet — but it is a promise with
a clock on it.

- [ ] Decide how an issue gets written and sent. Options: Resend
      Broadcasts, an export to something like Buttondown, or a small
      admin route in the site. *Mark to choose, Claude to build.*
- [ ] Confirm `newsletter@dramstory.com` is verified as a sender in
      Resend. The domain is already verified for the auth mail, so this
      is likely fine, but nothing has actually sent from that address to
      a real inbox. *Mark.*
- [ ] Send a first issue only after a test to a real address —
      the end-to-end check on 23 Sep used Resend's simulated address, so
      **no real inbox has yet received anything from this system**.

### Accounts — the bits left over — *Mark*

- [ ] **Test named trips by hand.** Create a second trip, rename both,
      switch between them, delete one. Switching was silently broken
      until 5 September and the fix has never been exercised by a person.
      This has been on the list for three weeks.
- [ ] **Supabase Pro ($25/month).** Deferred on Mark's call, 21 Sep, and
      recorded here as an accepted risk rather than an oversight: the
      free tier has **no backups**, so the first real saved trip is the
      only copy of itself. Plan §2.2.
- [ ] **Mark's process-flow list** from the members-area review — spotted
      5 September, still never written down.

### Housekeeping that has teeth — *Claude*

- [ ] **`npm ci` reports 8 vulnerabilities, 1 critical.** Review the
      advisories individually. **Not `npm audit fix --force`** — it would
      move past the lockfile and break the Next 16 pin. Carried over
      unreviewed since 16 Sep; the site is now live and holding personal
      data, which changes the argument for leaving it.
- [ ] **A `.gitattributes` to normalise line endings.** Without one the
      whole repo reads as modified from a Linux checkout while looking
      clean on Windows, which makes it easy to commit a thousand lines of
      invisible change by accident. This has already cost real time.
- [ ] **Revoke the GitHub personal access token.** The same token has
      been pasted into chat four times and has write access to the repo.
      *Mark.*

---

## Next

### The design pass

Running record and agreed actions in `docs/design-pass.md`. Homepage is
complete. Still to walk, desktop first:

`/journeys/[slug]` · `/days` and a day · `/journey` · `/trip` ·
`/account` and `/login` · `/distilleries` · `/about` · `/journal` · legal

Then the whole thing again at phone width.

### Two builds the footer is waiting on — *Claude*

Mark's six Journal slots are in the footer, and five of them are labels
rather than links because the routes do not exist.

- [ ] **A Journal category view.** The Journal table already has a
      Category field with the right options, so this is a route and a
      filter rather than a data problem. Unblocks four labels.
- [ ] **`/events`**, from the Events table. Unblocks the fifth.
- [ ] **Work With Us** has no page either. Either write one or drop the
      row — Mark asked to keep it, so it sits as a label for now.

### Smaller, found in the homepage audit — *Claude*

- [ ] One image with no alt text — an Airtable attachment.
- [ ] Check the Vimeo link carries `rel="noopener"`. The Drinkaware link
      turned out to be a false positive: `noreferrer` already implies it.
- [ ] **A latent dead link in the Explore column.** `otherLiveRegions`
      maps to `href="#"`. It renders nothing today because Islay is the
      only live region, so it is invisible — and it will appear as a dead
      link the moment a second region's `live` flag flips.

### Loose ends — *Mark*

- [ ] **Add the ICO registration number** to `src/lib/legal-details.ts`.
      The field is `icoNumber`, still `null`, so the privacy page omits
      the line rather than printing a blank one. Publishing the number is
      good practice, not a requirement — the registration itself was the
      requirement, and that is done. *Mark to supply, Claude to add.*
- [ ] Retire the merged local branches: `rescue-about-us`,
      `feature/about-us`, `feature/brand-voice-update`. All three are
      fully accounted for on `main` — checked file by file, 16 Sep.
- [ ] Delete the superseded `feature/homepage-final-design` branch from
      the remote. *Claude, on Mark's word.*
- [ ] Find `DramStory Prototype.html` — named in
      `docs/days-trip-flow-handoff.md` as "a working, self-contained
      prototype of everything below", not in the repo. Probably in the
      claude.ai chat the handoff came from.

---

## Recently done

- **23 Sep 2026** — Newsletter live: double opt-in, Airtable Subscribers
  table, confirmation and welcome emails through Resend, one-click
  unsubscribe answering the mail client's own button. Verified end to end
  on a preview against a simulated address. Privacy policy corrected to
  describe the site that actually exists. Hotels.com affiliate tracking
  wired via the `landingPage` wrapper, keeping the visitor's own dates,
  with `rel="sponsored nofollow"` and a disclosure line at both call
  sites. `/accommodation-shell` deleted. Founders' photo cropped to the
  people in it.
- **21 Sep 2026** — **Accounts went live.** ICO registered. Thirty-four
  commits merged to `main`: sign-in, saved trips, named trips, JSON
  export and account deletion, the four legal pages, Plausible, About Us.
  `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` set on production. The
  footer's thirteen dead links removed — the audit had found eight and
  missed a whole column. Discover Cars tracking link added.
- **19 Sep 2026** — All five missing day `Hook` values drafted, reviewed
  and published; all sixteen Days now have one. The review caught a false
  claim that would otherwise have shipped on a card. "Dunyveg" corrected
  to "Dunyvaig" across four places, including a record that disagreed
  with its own slug. The "no guided tour" line moved up the Jura day.
- **18 Sep 2026** — Homepage: Jura added to the distilleries heading, the
  Four Moods base marker labelled, and the founders' band added between
  Before You Go and the newsletter.
- **16 Sep 2026** — About Us live. Legal pages rewritten for a sole
  trader. `brand-voice.md` updated. Seven documents recovered from a
  commit that existed on one machine.
- **5 Sep 2026** — Custom SMTP through Resend, auth email templates,
  `/account` and named trips, the site-wide save prompt.
- **4 Sep 2026** — Plausible installed. Supabase project, `trips` table
  and RLS.
