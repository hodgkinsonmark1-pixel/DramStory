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

/** Great-circle distance in miles - same small local copy convention as
 *  the Area template (see AreaClient.tsx's own milesBetween), kept
 *  per-file rather than reaching into the data layer from a page. */
function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A Day's own "location" for proximity sorting - the midpoint of its
 *  real stops' coordinates (mapDistilleries, same data already used to
 *  draw each card's route map). Days with no resolved stop coordinates
 *  sort last rather than being dropped, since they're still real,
 *  addable Days - just not ones this sort can honestly place. */
function dayMidpoint(day: HubDay): { lat: number; lng: number } | null {
  const points = day.mapDistilleries ?? [];
  if (points.length === 0) return null;
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat, lng };
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
  const sortedDays = nearArea
    ? [...days].sort((x, y) => {
        const mx = dayMidpoint(x);
        const my = dayMidpoint(y);
        if (!mx && !my) return 0;
        if (!mx) return 1;
        if (!my) return -1;
        return milesBetween(nearArea, mx) - milesBetween(nearArea, my);
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
