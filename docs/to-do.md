# To-do

Live task list. Things that are actually next, with who holds them.

Not a backlog — parked ideas live in `docs/deferred-features.md`, and the
account/newsletter scoping lives in `docs/accounts-and-badges-plan.md`.

Last updated: 16 September 2026

---

## ⛔ Compliance gates

**Nothing that stores an email address ships until both of these are done.**
Recorded here because nothing in the code will ever remind anyone.

- [ ] **Register with the ICO and pay the data protection fee** — Tier 1,
  £52/year, £5 off by direct debit. Liable from the moment personal data is
  processed commercially. Not paying when liable is an offence. Run the ICO's
  fee self-assessment first to confirm the tier. *Mark.*
- [ ] **Publish the privacy policy and cookie policy.** Collecting an address
  without a live privacy notice is a breach on day one. The pages are built and
  gated; what they need is below. *Mark to supply the facts, Claude to flip the
  flag.*

---

## Now

### The legal pages — the only thing between accounts and launch

The four pages exist as real routes on `feature/accounts` and are **not live**.
`LEGAL_READY` in `src/lib/legal-details.ts` gates the draft banner, the
`noindex`, and whether the footer links or just shows labels. All three change
together when it flips.

- [x] **Fill `src/lib/legal-details.ts`.** Done 16 Sep 2026, and restructured:
  DramStory is a **sole trader**, not DramStory Ltd, so `companyNumber` and
  "registered in" were removed rather than filled - a sole trader has neither.
  The controller is named as *Mark Hodgkinson, trading as DramStory*, because
  UK GDPR requires the controller identified and there is no separate legal
  person to name instead.
- [x] **Clear the `[[TO CONFIRM]]` markers.** All resolved 16 Sep 2026.
  Publication date set to 16 September 2026.
- [x] **Solicitor's review** — Mark's call, 16 Sep 2026: not needed to go live
  at this stage. The exposure accepted is the Terms' liability section, which
  the Consumer Rights Act limits in ways a draft cannot be certain of.
- [x] Affiliate links are labelled at the point of the link - verified on the
  live homepage, 16 Sep 2026. Discover Cars carries the label and
  `rel="sponsored nofollow"`; the two island firms are plain links. See the
  warning below about whether that label is currently earning anything.
- [x] **`LEGAL_READY` flipped to true.** 16 Sep 2026.
- [ ] ⛔ **Do not merge the legal pages until the Discover Cars question below
  is settled.** The disclosure now lists Discover Cars because the site claims
  a commission on it. If that arrangement is not real the row must come out and
  the homepage label with it. *Mark.*

### Affiliate deep links

- [ ] ⚠️ **Discover Cars is labelled "we earn a commission" on the homepage and
  the link cannot pay one.** Found 16 Sep 2026: the live href is a bare
  `https://www.discovercars.com/` with no tracking parameter of any kind. So
  the site makes a disclosure it does not benefit from, and every click through
  it is unattributed. Either add the real tracking link or remove the claim -
  the two must agree. *Mark to supply the link, Claude to wire it.*
- [ ] ⚠️ **`/accommodation-shell` is a live, indexable route** with no
  `noindex`, built as a demo with placeholder tracking codes
  (`YOUR_MDPCID_HERE`, `YOUR_AID_HERE`, `YOUR_CAMREF_HERE`). Its own header
  claims "all three platforms are live, approved affiliate accounts", which is
  not true of Booking.com. **`noindex` added 16 Sep 2026** via a layout, since
  the page is a client component - that closes the search-engine half only. It
  still serves, still builds placeholder-tracked links, and still names two
  suppliers the site has no relationship with. Finish it or delete it.
  *Mark to decide, Claude to action.*
- [ ] **Add the ICO number to `src/lib/legal-details.ts`** once registered. The
  field is `icoNumber`, currently `null`, and the privacy page omits the line
  entirely rather than printing a blank one. Publishing the number is good
  practice, not a requirement - the registration itself is the requirement.
  *Mark to register, Claude to add.*
- [ ] **Put the correct affiliate deep links in place.** Hotels.com links still
  carry an `mdpcid` placeholder rather than a real tracking value — confirmed
  still present in `src/lib/accommodation-links.ts` on 16 Sep. Until it is
  fixed, clicks are not attributed and **any bookings they produce earn
  nothing**. *Mark to supply the real values from the Expedia and Booking.com
  dashboards, Claude to wire them.*
- [ ] Check every affiliate URL resolves and carries its tracking parameter —
  one test link per partner, confirmed in the partner dashboard.
- [ ] Once Plausible is live, cross-check its outbound click counts against the
  partner dashboards. A large gap means the deep links are wrong, and that
  comparison is the only way to notice.

### Accounts — what is left

Sign-in, syncing, named trips, the save prompt and the auth emails are all
done and on `feature/accounts` (24 commits, deployed, green). Remaining:

- [ ] **Delete account, and export trips as JSON.** GDPR erasure and
  portability. Cheap now, miserable to retrofit. Not built. *Claude.*
- [ ] **Keep-alive cron** (Vercel Cron, daily) so the free Supabase project
  does not pause after 7 days — plan §2.1. Not `pg_cron`, not GitHub Actions.
  *Claude.*
- [ ] **Test named trips on the preview**: create a second, rename both, switch
  between them, delete one. Worth doing properly now — switching was silently
  broken until 5 Sep and the fix has not been exercised by hand. *Mark.*
- [ ] Move Supabase to Pro ($25/month) **at the first real account** — for the
  daily backups, not the pause. The free tier has none, and saved trips would
  be the only copy. Plan §2.2. *Mark.*
- [ ] Mark's process-flow list from the members-area review — spotted on 5 Sep,
  never written down. *Mark.*
- [ ] **Merge `feature/accounts` to `main`**, which also takes Plausible and
  the legal pages live. Blocked only by the compliance gates. *Both.*

### The newsletter

Full scope in `docs/accounts-and-badges-plan.md` §7. Blocked by the compliance
gates above.

- [ ] Resend account already exists for auth — verify whether a separate
  sending domain or From address is wanted for marketing, so a reputation hit
  on one cannot take sign-in down with it
- [ ] `subscribers` table, double opt-in, confirmation email
- [ ] Wire the footer form, which currently collects addresses and does nothing
- [ ] Unsubscribe link, one click, no login

---

## Recently done

- **16 Sep 2026** — About Us live on `main`, with the restored "lays the days
  out end to end" line and the standfirst dropped. `brand-voice.md` updated
  with the voice budget, the earning test and the social register. Seven
  documents recovered from a dropped commit that existed only on one machine.
  Journey page: two actions instead of one, the map zoom bug fixed, the map
  made flickable, and a day badge that had never worked in its life.
- **5 Sep 2026** — Custom SMTP through Resend, domain verified, rate limit
  raised; both auth email templates branded; `/account` and named trips; the
  site-wide save prompt; sign-out clearing a synced trip only.
- **4 Sep 2026** — Plausible chosen and installed. Legal drafts written against
  what the code actually does. Supabase project, `trips` table and RLS.
- **3 Sep 2026** — Homepage A2 design and mobile live details merged to `main`.

---

## Housekeeping

- [ ] Delete the superseded `feature/homepage-final-design` branch from the
  remote. *Claude, on Mark's word.*
- [ ] Retire the merged local branches: `rescue-about-us`, `feature/about-us`,
  `feature/brand-voice-update`. All three are fully accounted for on `main` or
  `feature/accounts` — checked file by file, 16 Sep. *Mark.*
- [ ] Find `DramStory Prototype.html` — named in
  `docs/days-trip-flow-handoff.md` as "a working, self-contained prototype of
  everything below", not in the repo. Probably in the claude.ai chat the
  handoff came from. *Mark.*
- [ ] A `.gitattributes` to normalise line endings. Without one the whole repo
  reads as modified from a Linux checkout while looking clean on Windows, which
  makes it easy to commit a thousand lines of invisible change by accident.
  *Claude.*
- [ ] `npm ci` reports 8 vulnerabilities, 1 critical. Review the advisories
  individually before launch. **Not `npm audit fix --force`** — it would move
  past the lockfile and break the Next 16 pin. *Claude.*
