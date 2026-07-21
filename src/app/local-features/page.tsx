import Link from "next/link";
import { getLocalFeatures } from "@/lib/data";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import LocalFeaturesGrid from "@/components/LocalFeaturesGrid";

const HUB_CATEGORIES = new Set(["beach", "walk", "bike-route", "local-gem", "historic-site", "transport"]);

// Forced dynamic 21 July 2026 - same fix as /distilleries (see
// docs/technical-notes.md): this was silently prerendered fully static,
// so a new Local Feature added in Airtable wouldn't show up here until
// the next deploy regenerated it, same class of bug that hid Port Ellen
// and Isle of Jura on the distilleries page.
export const dynamic = "force-dynamic";

export default async function LocalFeaturesHubPage() {
  const allFeatures = await getLocalFeatures();
  const hubFeatures = allFeatures.filter((f) => HUB_CATEGORIES.has(f.category));

  return (
    <>
      <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--stone)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 300,
            color: "var(--dark)",
            marginBottom: 16,
          }}
        >
          Local Features
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "var(--slate)",
            maxWidth: 640,
            marginBottom: 32,
          }}
        >
          Beaches, walks, bike rides, historic sites and more, in one scannable list - the same way
          you&rsquo;d browse distilleries, without needing to hunt across the map pin by pin.
        </p>

        <LocalFeaturesGrid features={hubFeatures} />
      </div>

      <Footer />
    </>
  );
}
