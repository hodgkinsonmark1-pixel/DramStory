# Pre-Designed Day Narrative Standard

Established through the first three Hub Days (Bowmore Unhurried, Three
Distilleries One Road, Ardbeg on Foot), July 2026. This is the standard for
every Day narrative going forward, not a one-off style choice for those
three - future Days should be drafted to match this bar from the start,
rather than needing the same rounds of trimming to get there.

## One paragraph, whole-day

A single narrative paragraph per Day, whatever the Day's length or number of
distilleries. Not a stop-by-stop bullet list, not a paragraph per
distillery. Covers the whole day in the round.

## Plain, not descriptive

The single biggest correction across all three Days: cut moody/scene-setting
language every time it crept in. Specifically avoid:
- Sensory scene-setting ("what the light does," "let the peat smoke settle
  in" - actually this one *was* kept, see "a little warmth is fine" below,
  but as a rule, be sparing)
- Throat-clearing openers ("Your day begins...", "Give the whole day to...")
- Explaining atmosphere instead of stating what happens

Prefer plain, concrete statements of what the day actually involves: which
distillery, which named tour, what it includes, in what order. Example of
the correction in practice - drafted, then cut:

> ~~"Give the whole day to Bowmore — there's no need to rush."~~ →
> "Heading along the coast from Port Askaig, today you'll take in three very
> different distilleries — largest, newest, and most traditional."

## Concrete details over vague description

Real specifics belong in the narrative: named tours, durations, what's
included (number of drams, measures, what the tour actually walks through).
"Fifty minutes through the malt mill, mash tun, washbacks and stills,
ending with two drams from the core range" is the right level of detail.
"A wonderful journey through the whisky-making process" is not - too vague,
adds no real information.

## A little warmth is fine at the close

The corrections above are about excess description mid-narrative, not about
stripping all feeling. A Day can end on something a little more open or
warm - "see in the evening at the local pub that most takes your eye," "a
busy and amazing day" - as long as it's earned by the concrete detail that
came before it, not substituting for it.

## Real, named, sourced tours - not generic

Every distillery stop in a Day names one specific real tour (not "distillery
entry" generically), sourced per `content-sourcing-standards.md`. If a
distillery has more than one Day-worthy detail (a genuine character trait,
not filler), it belongs in the narrative if it sharpens the contrast between
stops on a multi-distillery Day - e.g. Bunnahabhain being Islay's one
unpeated outlier, on a Day otherwise about heavily-peated/industrial-scale
Caol Ila. Don't add such details reflexively; add them when asked or when
they genuinely earn their place, and keep the plain-language rule above.

## Inline links, not a separate list

Real Distillery and Local Feature pages get linked inline in the narrative
text using `[label](/path)` markdown-style links - reusing the existing
`renderWithLinks` pattern already used on Distillery/Explore pages. Link
label text must match the actual live record's `Name` field exactly (a
mismatch here has already been caught twice - Bowmore's church and Ardbeg's
café both needed correcting to match the live record name during review).

## Process (unchanged, restating for completeness)

Draft in chat → Mark reviews and iterates → independent second-pass review
(brand voice, adds value, appropriate for site, consistency against live
Airtable records - not a rubber stamp) → only then pushed to Airtable
(Status: Draft, not Live).
