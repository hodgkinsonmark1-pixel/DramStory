import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import DaysHubGrid from "@/components/journeys/DaysHubGrid";
import { getDays } from "@/lib/data";
import { AREAS } from "@/lib/areas";
import type { HubDay } from "@/lib/types";

/**
 * PRE-DESIGNED DAYS HUB
 * ---------------------------------------------------------------
 * UPDATE 22 July 2026: now reads live from Airtable (Days + Day Stops,
 * joined against Distilleries/Tours/Local Features), replacing the
 * hardcoded DUMMY_DAYS array this page carried until today. Only
 * Status: Live Days are returned by getDays() - same draft-never-leaks
 * gate as getJournalPosts' Published filter - so a Day stays invisible
 * here until it's explicitly flipped to Live in Airtable, same as every
 * other piece of content on the site.
 *
 * Forced dynamic for the same reason as /distilleries, /local-features,
 * and /journal (see docs/technical-notes.md): a static/ISR page's data
 * fetch only ever runs once, at build, however fresh the underlying
 * fetch's own cache setting is. airtableFetchAll() already uses
 * cache: "no-store", so combined with force-dynamic this page hits
 * Airtable fresh on every request, same as those three.
 */
export const dynamic = "force-dynamic";

/** Pulls the number of hours out of a HubDay's own "Duration from X"
 *  field (e.g. "≈2.5 hrs", straight from Airtable - see data/index.ts).
 *  Deliberately NOT a straight-line distance calculation: the Area
 *  type's own doc comment on distilleryRegion already flags that
 *  straight-line distance is misleading on Islay's road geography, and
 *  every Day already carries this real, sourced drive-time figure - a
 *  first attempt at this sort used a lat/lng midpoint instead and it
 *  produced a visibly wrong order (Port Ellen's own day 2.5 hrs, but
 *  Bowmore-side days ahead of some closer South Islay ones), caught in
 *  live verification. Returns null (sorts last, not dropped) if the
 *  field's missing or unparseable, rather than guessing. */
function parseDurationHours(duration: string): number | null {
  const match = duration.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/** Which of HubDay's two real, sourced duration fields matches a given
 *  Area slug - only Port Ellen and Bowmore have one (Airtable's "Duration
 *  from Port Ellen"/"Duration from Bowmore" fields). Areas without one
 *  (e.g. Port Charlotte) deliberately fall back to unsorted rather than
 *  inventing a distance metric for them. */
function durationFieldFor(areaSlug: string): ((day: HubDay) => string) | null {
  if (areaSlug === "port-ellen") return (day) => day.durationPortEllen;
  if (areaSlug === "bowmore") return (day) => day.durationBowmore;
  return null;
}

/** "See all days" fix (10 Aug 2026, Area page CTA #2) - Mark asked for
 *  the Area page's "See all days" link to open this Hub sorted by
 *  proximity to that Area, rather than just relabelling the old planner
 *  hand-off. Reads ?near=<area-slug>, resolved against the same AREAS
 *  list AccommodationControl/MapCanvas already use, and re-orders (not
 *  filters - every Day still shows) the Days array before it reaches
 *  DaysHubGrid, which renders whatever order it's given. */
export default async function PreDesignedDaysHubPage({
  searchParams,
}: {
  searchParams: Promise<{ near?: string }>;
}) {
  const { near } = await searchParams;
  const days = await getDays();

  const nearArea = near ? AREAS.find((a) => a.slug === near) : undefined;
  const durationFor = nearArea ? durationFieldFor(nearArea.slug ?? "") : null;
  const sortedDays = durationFor
    ? [...days].sort((x, y) => {
        const hx = parseDurationHours(durationFor(x));
        const hy = parseDurationHours(durationFor(y));
        if (hx === null && hy === null) return 0;
        if (hx === null) return 1;
        if (hy === null) return -1;
        return hx - hy;
      })
    : days;

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <PageHeader />

      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "56px 24px 24px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "var(--dark)",
            marginBottom: 12,
            letterSpacing: "-0.01em",
          }}
        >
          Pre-Designed <em style={{ fontStyle: "italic", color: "var(--amber)" }}>Days</em>
        </h1>
        <p style={{ fontSize: 15, color: "var(--peat)", maxWidth: 620, marginBottom: 20 }}>
          A ready-made day, built around the distilleries you want to see. Add it straight to
          your trip, then make it yours — keep what you love, swap out what you don&apos;t.
        </p>

        {nearArea && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              fontSize: 13,
              color: "var(--slate)",
            }}
          >
            <span>
              Sorted by proximity to <strong style={{ color: "var(--peat)" }}>{nearArea.name}</strong>
            </span>
            <Link href="/days" style={{ color: "#b5763a", fontWeight: 600, textDecoration: "none" }}>
              Clear
            </Link>
          </div>
        )}

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--slate)",
            maxWidth: 620,
            marginBottom: 32,
            paddingLeft: 14,
            borderLeft: "2px solid var(--stone)",
          }}
        >
          <strong style={{ color: "var(--peat)" }}>These are inspiration, not bookings.</strong>{" "}
          Tours, prices, and availability shown here reflect what&apos;s confirmed at time of
          writing, but distilleries change opening days, tour formats, and pricing throughout
          the year. Always check the distillery&apos;s own website for your actual travel dates
          before building a day around a specific tour.
        </p>

        <DaysHubGrid days={sortedDays} />
      </div>

      <Footer />
    </div>
  );
}
