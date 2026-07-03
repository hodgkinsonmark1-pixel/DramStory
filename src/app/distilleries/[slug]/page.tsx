import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDistilleries, getDistilleryBySlug } from "@/lib/data";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export async function generateStaticParams() {
  const distilleries = await getDistilleries();
  return distilleries.map((d) => ({ slug: d.slug }));
}

export default async function DistilleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const distillery = await getDistilleryBySlug(slug);

  if (!distillery) notFound();

  return (
    <>
      <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--stone)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div style={{ position: "relative", width: "100%", height: 360 }}>
        <Image src={distillery.image} alt={distillery.name} fill style={{ objectFit: "cover" }} unoptimized />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(26,58,74,0.1), rgba(26,58,74,0.6))",
            display: "flex",
            alignItems: "flex-end",
            padding: 40,
          }}
        >
          <div>
            <div style={{ color: "var(--amber-light)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              {distillery.region} · {distillery.style} · Founded {distillery.founded}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,56px)", color: "white", fontWeight: 300 }}>
              {distillery.name}
            </h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", color: "var(--peat)", marginBottom: 24 }}>
          {distillery.tagline}
        </p>
        <p style={{ lineHeight: 1.8, color: "var(--peat)", marginBottom: 40 }}>{distillery.description}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
          <Fact label="Hours" value={distillery.hours} />
          <Fact label="Price from" value={distillery.priceFrom} />
          <Fact label="Avg. visit" value={distillery.avgVisit} />
          <Fact label="Parking" value={distillery.parking} />
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, marginBottom: 20 }}>Tours</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          {distillery.tours.map((t) => (
            <div key={t.name} style={{ padding: 20, background: "white", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{t.name}</strong>
                <span style={{ color: "var(--copper)", fontWeight: 600 }}>£{t.price}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 8 }}>{t.duration}</div>
              <p style={{ fontSize: 14, color: "var(--peat)" }}>{t.description}</p>
            </div>
          ))}
        </div>

        {distillery.nearby.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, marginBottom: 20 }}>Nearby</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {distillery.nearby.map((n) => (
                <li key={n.name} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--stone)" }}>
                  <span>{n.icon}</span>
                  <span style={{ flex: 1 }}>{n.name} <span style={{ color: "var(--slate)", fontSize: 13 }}>({n.type})</span></span>
                  <span style={{ color: "var(--slate)", fontSize: 13 }}>{n.distance}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, background: "white", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--slate)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
