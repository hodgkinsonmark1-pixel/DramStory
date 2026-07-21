import { getDistilleries } from "@/lib/data";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import DistilleriesGrid from "@/components/DistilleriesGrid";

// Forced dynamic 21 July 2026 - this page was silently prerendered as
// fully static (built once, frozen until the next deploy) even after the
// underlying Airtable fetch was switched to cache: "no-store". A static
// page's data fetch only ever runs at build time regardless of the
// fetch's own cache option, so Port Ellen and Isle of Jura (added to
// Airtable 9/11 July) stayed invisible here for 10+ days. See
// docs/technical-notes.md for the full investigation.
export const dynamic = "force-dynamic";

export default async function DistilleriesIndexPage() {
  const distilleries = await getDistilleries();

  return (
    <>
      <PageHeader />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 300,
            color: "var(--dark)",
            marginBottom: 32,
          }}
        >
          Islay Distilleries
        </h1>

        <DistilleriesGrid distilleries={distilleries} />
      </div>

      <Footer />
    </>
  );
}
