# Content Structure Conventions (As Currently Built)

Extracted from the original DramStory operating guide (superseded 19 July
2026 - this and `brand-voice.md` between them cover everything from that
guide not already living in another doc).

## Distillery pages

Why Visit callout, Status Notice (seasonal closures etc., free text), Fun
Facts, Gallery with lightbox, Tours, History, Whisky Profile.

## Classic Journey day-by-day template

Applies to any journey with a `days[]` array, not just one tour:

- `narrative` - evocative scene-setting paragraph, drafted content (see the
  two-stage review process)
- Stops grouped as **"Distilleries visited" / "Other features visited"**
  (by kind), not "Morning/Afternoon" (by time of day)
- `transportNote` - practical getting-around detail
- Per-day map showing distillery pins (permanent name label, click opens
  the distillery page in a new tab) plus any activity stops that have a
  real, coordinate-verified Local Features record linked via
  `localFeatureSlug` - activities with no single mappable location (e.g.
  "browse the high street") simply don't get a pin, rather than a
  fabricated one
- A **per-day "Add this day to my journey"** button - appends just that day
  to the visitor's existing trip, additive, never resets what they've
  already built. The Pre-Designed Days Hub's equivalent button follows the
  same additive principle - see `business-plan.md`, Pillar 3.
- Journey-level `gettingThereNote` (+ optional linked Journal post) and
  `accommodationNote` for logistics/reasoning that don't belong inside a
  numbered day

## Local Features Hub

Standalone, searchable page (`/local-features`), linked from the map
planner header and the homepage - it is explicitly **not** a map
filter/pin category. This exact distinction was built wrong once and had
to be fully reverted before landing correctly - do not reintroduce "Local
Features Hub" as a map toggle. Natural Features and Local Attractions
remain separate, untouched map filter tabs.
