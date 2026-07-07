import Link from "next/link";
import { getDistilleries } from "@/lib/data";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import DistilleriesGrid from "@/components/DistilleriesGrid";

export default async function DistilleriesIndexPage() {
  const distilleries = await getDistilleries();

  return (
    <>
      <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--stone)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--green-deep)",
            marginBottom: 12,
          }}
        >
          Islay · {distilleries.length} Distilleries
        </div>
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
