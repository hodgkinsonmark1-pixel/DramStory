import Link from "next/link";
import { notFound } from "next/navigation";
import { getDistilleries, getLocalFeatures } from "@/lib/data";
import { CLASSIC_JOURNEYS } from "@/lib/journeys-data";
import type { JourneyStop } from "@/lib/journeys-data";
import type { Distillery, LocalFeature } from "@/lib/types";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import JourneyDayMap from "@/components/journeys/JourneyDayMap";
import AddJourneyToTripButton from "@/components/journeys/AddJourneyToTripButton";
import AddDayToTripButton from "@/components/journeys/AddDayToTripButton";

function JourneyStopsRow({
  label,
  stops,
  distilleries,
}: {
  label: string;
  stops: JourneyStop[];
  distilleries: Distillery[];
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--copper)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {stops.map((stop, i) => {
          if (stop.kind === "distillery") {
            const d = distilleries.find((x) => x.slug === stop.distillerySlug);
            return (
              <div key={i} style={{ fontSize: 14, color: "var(--peat)" }}>
                {d ? (
                  <Link href={`/distilleries/${d.slug}`} style={{ color: "var(--dark)", fontWeight: 500 }}>
                    {d.name}
                  </Link>
                ) : (
                  stop.distillerySlug
                )}
                {stop.needsBooking && (
                  <span style={{ fontSize: 11, color: "var(--copper)", marginLeft: 8 }}>Book ahead</span>
                )}
              </div>
            );
          }
          return (
            <div key={i} style={{ fontSize: 14, color: "var(--peat)" }}>
              {stop.label}
              {stop.needsBooking && (
                <span style={{ fontSize: 11, color: "var(--copper)", marginLeft: 8 }}>Book ahead</span>
              )}
              {stop.note && <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 2 }}>{stop.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return CLASSIC_JOURNEYS.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const journey = CLASSIC_JOURNEYS.find((j) => j.slug === slug);
  if (!journey) return {};
  return {
    title: `${journey.name} | DramStory`,
    description: journey.description,
  };
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
  const localFeatures = await getLocalFeatures();

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
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {journey.gettingThereNote && (
          <div
            style={{
              padding: "16px 20px",
              background: "var(--cream)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--stone)",
              marginBottom: 24,
              fontSize: 14,
              color: "var(--peat)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--dark)" }}>Getting there: </strong>
            {journey.gettingThereNote}
            {journey.gettingThereJournalSlug && (
              <>
                {" "}
                <Link href={`/journal/${journey.gettingThereJournalSlug}`} style={{ color: "var(--copper)", fontWeight: 500 }}>
                  Read the full guide &rarr;
                </Link>
              </>
            )}
          </div>
        )}

        {journey.days && journey.days.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, marginBottom: 8 }}>
              Day by day
            </h2>
            {journey.accommodationNote && (
              <p style={{ fontSize: 14, color: "var(--peat)", lineHeight: 1.6, marginBottom: 24 }}>
                {journey.accommodationNote}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {journey.days.map((day) => (
                <div
                  key={day.dayNumber}
                  style={{
                    padding: "20px 22px",
                    background: "var(--cream)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--stone)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--dark)",
                      marginBottom: 10,
                    }}
                  >
                    Day {day.dayNumber}
                  </div>

                  {day.narrative && (
                    <p style={{ fontSize: 14, color: "var(--peat)", lineHeight: 1.65, marginBottom: 14 }}>
                      {day.narrative}
                    </p>
                  )}

                  {(() => {
                    const allStops = [...day.morning, ...day.afternoon];
                    const distilleryStops = allStops.filter((s) => s.kind === "distillery");
                    const otherStops = allStops.filter((s) => s.kind === "activity");
                    return (
                      <>
                        {distilleryStops.length > 0 && (
                          <JourneyStopsRow label="Distilleries visited" stops={distilleryStops} distilleries={distilleries} />
                        )}
                        {otherStops.length > 0 && (
                          <JourneyStopsRow label="Other features visited" stops={otherStops} distilleries={distilleries} />
                        )}
                      </>
                    );
                  })()}

                  {day.transportNote && (
                    <div style={{ fontSize: 12, color: "var(--slate)", fontStyle: "italic", marginTop: 8 }}>
                      {day.transportNote}
                    </div>
                  )}

                  {day.overnight &&
                    (() => {
                      const dayDistilleries = [...day.morning, ...day.afternoon]
                        .filter((s) => s.kind === "distillery")
                        .map((s) => distilleries.find((d) => d.slug === s.distillerySlug))
                        .filter((d): d is Distillery => !!d);
                      const dayFeatureStops = [...day.morning, ...day.afternoon]
                        .filter((s) => s.localFeatureSlug)
                        .map((s) => localFeatures.find((f) => f.slug === s.localFeatureSlug))
                        .filter((f): f is LocalFeature => !!f)
                        .map((f) => ({ name: f.name, slug: f.slug, lat: f.lat, lng: f.lng }));
                      if (dayDistilleries.length === 0 && dayFeatureStops.length === 0) return null;
                      return (
                        <div style={{ marginTop: 12 }}>
                          <JourneyDayMap base={{ ...day.overnight }} stops={dayDistilleries} featureStops={dayFeatureStops} />
                        </div>
                      );
                    })()}

                  <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 10, fontWeight: 500 }}>
                    {day.overnight ? `Overnight: ${day.overnight.village}` : "Departure day"}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <AddDayToTripButton day={day} distilleries={distilleries} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {journey.days && journey.days.length > 0 ? (
          <AddJourneyToTripButton journey={journey} distilleries={distilleries} />
        ) : (
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
        )}
      </div>

      <Footer />
    </>
  );
}
