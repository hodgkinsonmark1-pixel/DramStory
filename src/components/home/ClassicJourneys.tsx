import Link from "next/link";
import type { Distillery } from "@/lib/types";
import { CLASSIC_JOURNEYS, routeStartingPrice, getJourneyDistilleries } from "@/lib/journeys-data";

export default function ClassicJourneys({ distilleries }: { distilleries: Distillery[] }) {
  return (
    <section className="journeys-section">
      <div className="how-eyebrow">Curated routes</div>
      <h2 className="how-title">Classic journeys</h2>
      <div className="journeys-grid">
        {CLASSIC_JOURNEYS.map((journey) => {
          const stops = getJourneyDistilleries(journey, distilleries);
          const price = routeStartingPrice(journey, distilleries);
          return (
            <Link href={`/journeys/${journey.slug}`} className="journey-card" key={journey.slug}>
              <div className="journey-card-tagline">{journey.tagline}</div>
              <div className="journey-card-name">{journey.name}</div>
              <div className="journey-card-stops">{stops.map((d) => d.name).join(", ")}</div>
              {price !== null && <div className="journey-card-price">From £{price}pp</div>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
