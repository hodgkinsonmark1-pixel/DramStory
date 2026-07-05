import Link from "next/link";
import { notFound } from "next/navigation";
import { getDistilleries } from "@/lib/data";
import { CLASSIC_JOURNEYS, cheapestTourPrice, getJourneyDistilleries, routeStartingPrice } from "@/lib/journeys-data";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export async function generateStaticParams() {
  return CLASSIC_JOURNEYS.map((j) => ({ slug: j.slug }));
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = CLASSIC_JOURNEYS.find((j) => j.slug === slug);
  if (!journey) notFound();

  const distilleries = await getDistilleries();
  const stops = getJourneyDistilleries(journey, distilleries);
  const price = routeStartingPrice(journey, distilleries);

  return (
    <>
      <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--stone)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div style={{ background: "var(--navy)", color: "white", padding: "56px 24px", textAlign: "center" }}>
        <div style={{ color: "var(--amber-light)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          {journey.tagline}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, marginBottom: 16 }}>
          {journey.name}
        </h1>
        <p style={{ maxWidth: 560, margin: "0 auto", opacity: 0.85, lineHeight: 1.7 }}>{journey.description}</p>
        {price !== null && (
          <div style={{ marginTop: 20, fontSize: 15, color: "var(--amber-light)" }}>From £{price}pp</div>
        )}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, marginBottom: 24 }}>
          On this route
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          {stops.map((d, i) => {
            const tourPrice = cheapestTourPrice(d);
            return (
              <Link
                href={`/distilleries/${d.slug}`}
                key={d.slug}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: 20,
                  background: "white",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-card)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--green-deep)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--dark)" }}>{d.name}</div>
                  <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 6 }}>
                    {d.region} &middot; {d.style}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--peat)" }}>{d.tagline}</p>
                </div>
                {tourPrice !== null && (
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dark)", whiteSpace: "nowrap" }}>
                    from £{tourPrice}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "14px 28px",
            background: "var(--navy)",
            color: "white",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Start planning this route &rarr;
        </Link>
      </div>

      <Footer />
    </>
  );
}
