import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import DaysHubGrid from "@/components/journeys/DaysHubGrid";
import { getDays } from "@/lib/data";

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

export default async function PreDesignedDaysHubPage() {
  const days = await getDays();

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

        <DaysHubGrid days={days} />
      </div>

      <Footer />
    </div>
  );
}
