# To-do

Live task list. Things that are actually next, with who holds them.

Not a backlog — parked ideas live in `docs/deferred-features.md`, and the
account/newsletter scoping lives in `docs/accounts-and-badges-plan.md`.

Last updated: 4 September 2026

---

## ⛔ Compliance gates

**Nothing that stores an email address ships until both of these are done.**
Recorded here because nothing in the code will ever remind anyone.

- [ ] **Register with the ICO and pay the data protection fee** — Tier 1,
  £52/year, £5 off by direct debit. Liable from the moment personal data is
  processed commercially, which is the moment the mailing list takes its first
  address. Not paying when liable is an offence. Run the ICO's fee
  self-assessment first to confirm the tier. *Mark.*
- [ ] **Publish the privacy policy and cookie policy.** Collecting an address
  without a live privacy notice is a breach on day one. Drafts in
  `docs/legal/`. *Mark to fill the markers, Claude to build the pages.*

---

## Now

### Analytics — Plausible

- [x] Decide the tool. Plausible: cookieless, EU-hosted, no consent banner
  needed. Reasoning and the conditions it depends on are at the top of
  `docs/legal/cookie-policy.md`. *4 Sep 2026.*
- [x] Create the Plausible account for dramstory.com. *Mark, 4 Sep 2026.*
- [x] **Install the tracking script.** Done 4 Sep 2026 on
  `feature/analytics-and-legal-pages`, via `next/script` per Next 16's own
  scripts guide.
- [x] **Outbound link tracking** — nothing to build. On the new Plausible
  script it is a toggle in site settings, on by default for new sites. Confirm
  it is on under General → Tracking. *Mark.*
- [ ] **Merge `feature/analytics-and-legal-pages` to `main`** so the script goes
  live, then verify in Plausible that data is arriving and dismiss the install
  prompt. *Both.*

### The legal pages

- [ ] **Fill the `[[TO CONFIRM]]` markers** in `docs/legal/` — company number,
  registered address, contact email, whether DramStory Ltd is registered in
  England and Wales or Scotland, ICO registration number once it exists.
  *Mark.*
- [x] **Build the four pages as real routes.** Done 4 Sep 2026 on the same
  branch: `/privacy`, `/terms`, `/cookies`, `/affiliate-disclosure`. **Not live**
  — `LEGAL_READY` in `src/lib/legal-details.ts` gates the draft banner, the
  `noindex`, and whether the footer links or just shows the labels. Flip it once
  the three items below are done, and all three change together.
- [ ] **Fill `src/lib/legal-details.ts`** — company number, jurisdiction,
  registered address, contact email, ICO number, publication date. One file
  feeds all four pages. *Mark.*
- [ ] **Solicitor's review before publication** — particularly the liability
  section of the Terms, which is limited by the Consumer Rights Act in ways
  that are beyond what a draft should be trusted on. *Mark.*
- [ ] Confirm whether affiliate links are labelled at the point of the link.
  The Affiliate Disclosure draft claims they are; if they are not, either build
  the labelling or change the claim. Do not publish a claim the site does not
  meet. *Both.*

### Affiliate deep links

- [ ] **Put the correct affiliate deep links in place.** The Hotels.com links
  currently carry an `mdpcid` placeholder rather than a real tracking value —
  logged as a known issue since the featured-stays work and never resolved.
  Until it is, clicks through to hotels are not attributed to DramStory and
  **any bookings they produce earn nothing**. *Mark to supply the real values
  from the Expedia and Booking.com dashboards, Claude to wire them.*
- [ ] Check every affiliate URL actually resolves and carries its tracking
  parameter — build one test link per partner and confirm the click registers
  in their dashboard before trusting any of them.
- [ ] Once Plausible is live, cross-check its outbound click counts against the
  partner dashboards. A large gap between clicks sent and clicks received means
  the deep links are wrong, and that comparison is the only way to notice.

---

## Next

**Reordered 4 Sep 2026: accounts first, newsletter after.** The plan had the
newsletter as Phase 0 on the reasoning that it is the smallest use of the same
infrastructure. That was sequencing convenience, not Mark's priority — the
member login is the job he asked for. Newsletter follows.

### Accounts — the member login

Plan §4. Magic-link sign-in, one trip synced, the save prompt, the
localStorage migration, delete and export.

- [x] **Create the Supabase project** — West Europe (London), Data API on,
  auto-expose off, automatic RLS on. *Mark, 4 Sep 2026.*
- [x] Run the `trips` migration. RLS enabled, four policies. *Mark, 4 Sep 2026.*
- [x] Vercel env vars, and Supabase redirect URLs. *Mark, 4 Sep 2026.*
- [x] Magic-link sign-in, `/login` replacing the coming-soon page, callback and
  sign-out routes, session refresh in `src/proxy.ts`.
- [x] Trip syncing to the account, and **the localStorage migration** — the
  trip built before signing in is adopted silently. Plan §4.3.
- [ ] **Test the whole flow on the preview with a real email.** *Mark* — see
  the four checks below.
- [ ] ⛔ **CUSTOM SMTP — BLOCKS LAUNCH, NOT COSMETIC.** Supabase's built-in
  mailer **refuses to deliver to any address that is not on the project team**,
  and is capped at **2 messages per hour**. Sign-in therefore works for Mark and
  for nobody else on earth. Accounts cannot go live until this is done.
  Resend → SMTP credentials → Supabase Auth → SMTP Settings. Verify
  `dramstory.com` with DKIM, DMARC and SPF, then raise the default 30/hour rate
  limit. *Mark.*
- [ ] Brand the auth emails — Authentication → Email Templates. **Two** need
  it: *Confirm signup* (first-time) and *Magic Link* (returning). Keep them
  plain: Supabase's own guidance is that marketing language, taglines, multiple
  links and images in auth email push it into spam filters. Logo, sender name
  and one button. *Both.*
- [ ] Use a separate sending domain or From address for auth versus the
  newsletter — `no-reply@dramstory.com` against a marketing sender. If one
  domain's reputation falls it should not take sign-in down with it. *Mark.*
- [x] **The save prompt, on `/trip`.** Replaced the two inert "Save as a tour"
  / "Email this trip to myself" buttons and the "coming soon" line, which had
  become untrue. Signed in: "Saved to your account". Signed out: what happens
  to a browser-only trip, and a "Keep this trip" link that returns here after
  sign-in. *5 Sep 2026.*
- [ ] The mid-build prompt: second day added, or first note written. Plan §4.2.
  Optional now — `/trip` catches people at a stronger moment.
- [ ] Delete account, and export trips as JSON. Cheap now, miserable to
  retrofit.
- [x] **`/account` — the signed-in home.** Trips listed with day counts and
  when last saved, sign out, empty state. Signing in lands here rather than on
  a bare "You're signed in" panel. Fixed an invisible sign-out button on the
  way — it used a hero style built for sitting over the video, so it rendered
  white on cream. *5 Sep 2026.*
- [x] **Named trips.** `/account` lists every trip and can open, rename, delete
  and create. Which trip a browser is editing lives in localStorage, so a
  laptop and a phone can work on different ones. *5 Sep 2026.*
- [x] **A saved day is just a trip** with one day in it — Mark's call, 5 Sep
  2026. No second table, no parallel concept.
- [x] **Nav says "Account", not "Login".** The routing was already right;
  only the word was wrong. Deliberately not session-aware — see the commit.
- [ ] Test named trips on the preview: create a second, rename both, switch
  between them, delete one. *Mark.*
- [ ] Keep-alive cron (Vercel Cron, daily) so the free Supabase project does not
  pause after 7 days — plan §2.1. Not `pg_cron`; not GitHub Actions.
- [ ] Move Supabase to Pro ($25/month) **at the first real account** — for the
  daily backups, not the pause. Free tier has no backups, and saved trips would
  be the only copy. Plan §2.2.

### The newsletter

Full scope in `docs/accounts-and-badges-plan.md` §7. Blocked by the compliance
gates above.

- [ ] Resend account, verified `dramstory.com` sender
- [ ] `subscribers` table, double opt-in, confirmation email
- [ ] Wire the footer form, which currently collects addresses and does nothing
  with them
- [ ] Unsubscribe link, one click, no login

---

## Recently done

- **4 Sep 2026** — Analytics decided (Plausible, no banner). Legal page drafts
  written against what the code actually does. Accounts, badges and newsletter
  scoped in `docs/accounts-and-badges-plan.md`.
- **3 Sep 2026** — Homepage A2 design and mobile live details merged to `main`
  and deployed. Distillery wall, What's on as its own band, stays carousel,
  today's location with a tappable pin, map filters, 81 restored CSS rules.

---

## Housekeeping

- [ ] Delete `.git/index.lock` in the local checkout, then `git pull` — the
  local repo is still on the pre-merge `main`. *Mark.*
- [ ] Delete the superseded `feature/homepage-final-design` branch from the
  remote. *Claude, on Mark's word.*
- [ ] Find `DramStory Prototype.html` — named in
  `docs/days-trip-flow-handoff.md` as "a working, self-contained prototype of
  everything below", not in the repo. Probably in the claude.ai chat the
  handoff came from. It would settle design questions faster than
  reconstructing intent from screenshots. *Mark.*
- [ ] Add `fonts.gstatic.com` to the sandbox allowlist so `next build` can run
  locally — currently only Vercel's builds verify anything. *Mark.*
