# Google Places: what we may and may not do

British English. Written 31 August 2026. Read this before touching
`src/lib/google-maps-loader.ts`, `src/components/journey/PlaceLiveDetails.tsx`,
`src/lib/google-places.ts` or the `Google Place ID` field in Airtable.

Until now this reasoning lived only in code comments, which meant it kept
being rediscovered. It lives here instead.

## The constraint

Google Maps Platform Terms of Service §3.2.3(e):

> **No Use With Non-Google Maps.** To avoid quality issues and/or brand
> confusion, Customer will not use the Google Maps Core Services with or near
> a non-Google Map in a Customer Application. For example, Customer will not
> (i) display or use Places content on a non-Google Map...

Our journey planner is Leaflet/OpenStreetMap. So:

- Google Places pins on our map — **not allowed**
- Google Places data fetched server-side and rendered in our own panel beside
  that map — **not allowed** ("with or near")

Note "or near". The restriction is not limited to markers on the map itself.
A side panel on the same screen falls under the plain reading of the clause.

## The one carve-out

Service Specific Terms §15.1:

> **Places UI Kit usage.** Customer may use Places UI Kit in Customer
> Applications with or without any map, including a non-Google Map. This
> clause will prevail over the No Use with Non-Google Maps clause of the
> Agreement.

This is why `PlaceLiveDetails.tsx` renders Google's own
`<gmp-place-details>` element rather than our own markup. The
Google-styled card is not a design choice we settled for — it is the
mechanism that makes showing Google's hours and ratings lawful here.

**If someone later "improves" that panel by replacing the Google element
with our own components fed by the Places API, that breaks the terms.**

## What we may store

ToS §3.2.3(b) prohibits caching Google Maps Content except as the Service
Specific Terms permit. §14.3 permits exactly one thing:

> Customer may temporarily cache latitude and longitude values from the
> Places API for up to 30 consecutive calendar days...

Place IDs are separately exempt and may be stored indefinitely.

| Data | May we store it? |
| --- | --- |
| Place ID | Yes, indefinitely |
| Latitude / longitude | 30 consecutive days maximum |
| Name, address | No |
| **Star rating, review count** | **No** |
| Opening hours | No |
| Photos, price level | No |

So the answer to "can we sync Google review scores into Airtable and show
them on our pins" is no, on two counts at once: storing them breaches
§3.2.3(b), and displaying them beside the Leaflet map breaches §3.2.3(e).
The Places UI Kit panel is the only route.

Our `Latitude`/`Longitude` fields are **not** Google-derived — they come from
OSM, postcodes.io and venue websites per `docs/content-sourcing-standards.md`.
Keep it that way. Populating them from Google would put us inside a 30-day
deletion clock for data that is meant to be permanent.

## How this fits our own sourcing standard

`docs/content-sourcing-standards.md` already says facts come from the venue's
own website, never third-party aggregators. Google Places is an aggregator.
Nothing in the live panel changes that rule: our curated copy, coordinates
and opening-hours text still come from official sources. Google supplies a
live, clearly-attributed second opinion sitting inside its own card — it is
never the source of anything we write.

## Attribution

Google's attribution is built into the element. It must not be removed,
hidden, restyled beyond the three permitted brand colours, or obscured. We
must also visually distinguish Google's content from ours — that is the job
of the `.place-live-panel-body` border in `journey-extra.css`, so don't
delete it as redundant styling.

## Keys

Two separate keys, deliberately:

| Key | Where | Restriction |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | Server only | Places API (New). Never sent to the browser; photos are proxied via `/api/places-photo`. |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Browser | HTTP-referrer restricted to dramstory.com and the Vercel preview domains, and restricted to **both** Places UI Kit **and** Maps JavaScript API. Both are required: the loader boots `maps/api/js`, so a key restricted to Places UI Kit alone is rejected — and Google's rejection is silent unless `gm_authFailure` is wired up, which it now is. |

The UI Kit runs client-side, so its key is public by design. That is expected
and safe **only** with the referrer restriction applied. Do not reuse the
server key.

## Cost

Places UI Kit is billed per request at the Places UI Kit rate, with 10,000
free requests per month, then roughly $1.00 per 1,000. For comparison, Places
API Nearby Search Pro is $32.00 per 1,000.

One panel open is one request. Note this got more expensive on 31 Aug 2026
when the panel started opening WITH the pin rather than behind a second
click: every tap of a food or drink pin now bills, including a re-tap after
the panel was dismissed by a map drag. Still trivial at current traffic —
10,000 free opens a month — but it scales with pin clicks, not with intent.

## Status caveat

The JavaScript Places UI Kit is documented as **Experimental (pre-GA)** even
though Google's blog announced general availability. Expect some churn in the
element API. `PlaceLiveDetails.tsx` degrades to an honest message rather than
a broken card if the element fails to load or Google rejects the request.

## Still open

- The mobile bottom sheet (`MobilePlannerSheet.tsx`) does not offer live
  details yet — the desktop popup does. Deciding how a Google card should sit
  inside the sheet is a layout question, not a port. This matters more than
  it sounds: the panel now opens automatically with the pin on desktop, so
  mobile is the only place a food/drink pin still shows nothing live.
- Food/drink pins with a place ID no longer show "More info". Their
  `/explore/[slug]` pages still exist and are still reachable by URL and from
  `/local-features` — they are simply no longer linked from the map popup, so
  they now get no traffic from the planner. If those pages are ever fleshed
  out for pubs and cafes, put the link back.
- Only venues with a `Google Place ID` in Airtable show the button. Populating
  that field across the 38 food/drink records is content work, not code.
