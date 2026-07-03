import Link from "next/link";
import Image from "next/image";
import { getDistilleries } from "@/lib/data";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

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
            marginBottom: 40,
          }}
        >
          Islay Distilleries
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {distilleries.map((d) => (
            <Link
              key={d.id}
              href={`/distilleries/${d.slug}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                boxShadow: "var(--shadow-card)",
                background: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ position: "relative", width: "100%", height: 180 }}>
                <Image src={d.image} alt={d.name} fill style={{ objectFit: "cover" }} unoptimized />
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "var(--copper)", fontWeight: 600, marginBottom: 4 }}>
                  {d.region} · {d.style}
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, marginBottom: 8 }}>
                  {d.name}
                </h2>
                <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.5 }}>{d.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
