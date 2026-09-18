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

### Agreed, outstanding

- **Five days have no `Hook`** — the one-line teaser on the day card. It
  is Airtable data, not code. Empty on: Bowmore to Port Ellen Old and New;
  Lagavulin by the Bay; Caol Ila Hiding in Plain Sight; Jura Across the
  Water; Laphroaig and the Mull of Oa. The other eleven have one.
  *Claude to draft from each day's real stops and narrative, Mark to
  review, then Airtable as Status: Draft.*

### Found in the audit, not yet raised

- **Eight dead links.** Four social icons and four footer categories
  ("Whisky Reviews", "Travel Stories", "Islay News", "Planning Tips") are
  all `href="#"`. They look clickable and do nothing.
- **One image with no alt text** — an Airtable attachment.
- **Two external links without `rel="noopener"`** — Vimeo, Drinkaware.

---

## Still to walk

`/journeys/[slug]` · `/days` and a day · `/journey` · `/trip` ·
`/account` and `/login` · `/distilleries` · `/about` · `/journal` · legal

Then the whole thing again at phone width.
