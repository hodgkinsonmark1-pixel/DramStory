# Design pass — page by page

Desktop first, then mobile. Started 18 September 2026, walking the site
with Mark on the `feature/accounts` preview.

The rule: nothing here is a task until Mark has agreed it, and nothing is
crossed off until it is on a branch and building.

---

## Standing note: two palettes, slightly apart

Audited 18 Sep before starting. The site has two colour systems that are
the same colours a shade out from each other:

| | Core (`dramstory-legacy.css`) | Journey (`journey-extra.css`) |
|---|---|---|
| Navy | `#1A3A4A` | `#16394B` |
| Amber / accent | `#D4A574` | `#DDA86A` |
| Page ground | `#F5F1E8` | `#F3EDE2` |

Fonts differ too: journey pages use Spectral and Instrument, the rest uses
`--font-display`/`--font-body`.

Not a task yet. It is the likely answer whenever a page looks slightly off
against its neighbour, and the decision to unify belongs at the END of the
pass, once we know which values won.

Also worth knowing while reading CSS: `--green-light`, `--green-mid` and
`--green-deep` are not green. They resolve to a beige, the copper and the
navy, and are used 72 times as those colours. Misnamed aliases from the
original mockup port, documented in the stylesheet, too entrenched to
rename.

---

## Homepage

### Done, 18 Sep

- **"Every distillery on Islay" → "on Islay and Jura".** The grid beneath
  already lists Isle of Jura, so the heading was undercounting what sat
  directly below it.
- **The base dot on Four Moods is labelled.** The eyebrow claimed "your
  base marked" and the map drew an unexplained white circle. It now reads
  "Your base · The Machrie", with a title element so a screen reader gets
  it too. It was `aria-hidden` while it was decorative; it is not
  decorative any more.
- **Founders' band added**, between Before you go and the newsletter.
  "Who we are →" had been a single link at the foot of the cost block, so
  the story of the two people behind the site was a footnote to a pricing
  panel. Photo, three sentences, one link — deliberately a band rather
  than a section, and deliberately NOT the About page's own opening lines.

### Done, 19 Sep

- **The footer's dead links are gone.** The audit said eight; it was
  thirteen, because it missed the Company column entirely. Resolved as:
  - *Social* — one Instagram link to the real account, the other three
    removed until those accounts exist. Text label rather than a glyph:
    hand-drawing Instagram's mark would be reproducing a trademark. Drop
    the official SVG from brand.instagram.com into
    `public/images/social/` and it becomes an `<Image>` in one line.
  - *Journal* — Mark's six slots replace four categories that described a
    content library the site does not have. All Articles links; the rest
    are labels until the routes exist.
  - *Company* — three rows, not six. Distillery Partners, Advertise and
    Press removed.
  - The rule applied throughout, and already used by the legal block
    since 4 Sep: **a label with no link beats an `href="#"`**. Styled
    dimmer, via `.footer-link-pending`, so the difference reads before
    anyone clicks.

### Airtable, 19 Sep

Both applied directly at Mark's instruction; both are corrections to
live records rather than new content.

- **"Dunyveg" → "Dunyvaig Castle".** The site was using both spellings,
  and in one place inside a single record: the Local Features record was
  *named* Dunyveg Castle while its own history text, its slug and the
  static fallback in `distilleries.ts` all said Dunyvaig. Changed in
  three places — the record's Name, and both mentions on the Lagavulin
  Bay record — plus the Lagavulin by the Bay day narrative. The rule
  that a link label must match the live record's Name exactly is what
  made this worth chasing: it was silently broken.
  - Still says Dunyveg: `docs/business-plan.md` line 84, in a note about
    a map-pin fix. Historical record, left alone.
- **Jura, Across the Water: the "no guided tour" line moved up.** It was
  the third sentence, inside a paragraph about how to get there. It is
  now the second, immediately after the hook. Fifteen of sixteen day
  cards are tour days, so a reader's default assumption is a tour, and
  the fact that corrects it should not be something they reach by
  reading on. Nothing else in the narrative changed.

- **All five missing `Hook` values are in.** Drafted 18 Sep,
  second-pass review 19 Sep, revised, signed off by Mark, written to
  Airtable. Bowmore to Port Ellen Old and New; Lagavulin by the Bay;
  Caol Ila Hiding in Plain Sight; Jura Across the Water; Laphroaig and
  the Mull of Oa. All sixteen Days now have one.
  - The review caught a false claim in the first draft: "245 years
    between their first days" is Bowmore's founding to Port Ellen's
    *reopening*, not founding to founding. It would have shipped as a
    factual statement on a card.
  - It also caught that all five used a single em dash at the same
    structural point. Four of the existing eleven do; five more would
    have given the grid a visible template. Two were rewritten to break
    it.
  - **Deliberate deviation from the content process.** The rule is that
    new content reaches Airtable as Status: Draft. These five Days are
    already Live, and Status sits on the Day rather than on the Hook —
    so setting Draft would have pulled five live day cards off the site
    to stage a reviewed one-liner. The Hook field was written on its
    own and the Status left alone.

### Agreed, outstanding
- **Journal categories need a route.** The Journal table has a Category
  field and the data exists, but nothing renders a category view. Five
  footer labels are waiting on it.
- **`/events` does not exist.** The Events table does. Sixth footer slot
  is waiting on it.
- **Work With Us has no page.** Mark wants the row kept; the label is
  there, unlinked.

### Found in the audit, not yet raised

- **One image with no alt text** — an Airtable attachment.
- **`rel` on external links.** The Drinkaware link carries
  `rel="noreferrer"`, which already implies `noopener` — that audit line
  was a false positive. Vimeo still needs checking.
- **A latent dead link in Explore.** `otherLiveRegions` maps to
  `href="#"`. It renders nothing today because Islay is the only live
  region, so it is invisible — and it will appear as a dead link the
  moment a second region's `live` flag flips.

---

## Still to walk

`/journeys/[slug]` · `/days` and a day · `/journey` · `/trip` ·
`/account` and `/login` · `/distilleries` · `/about` · `/journal` · legal

Then the whole thing again at phone width.
