"use client";

import { useState } from "react";
import Link from "next/link";
import type { Distillery } from "@/lib/types";
import { CLASSIC_JOURNEYS, getJourneyDistilleries } from "@/lib/journeys-data";

export default function ClassicJourneys({ distilleries }: { distilleries: Distillery[] }) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="journeys-section" id="classic-journeys">
      <div className="how-eyebrow">Curated routes</div>
      <h2 className="how-title">Classic journeys</h2>
      <div className="journeys-grid">
        {CLASSIC_JOURNEYS.map((journey) => {
          const stops = getJourneyDistilleries(journey, distilleries);
          const cardContent = (
            <>
              <div className="journey-card-tagline">{journey.tagline}</div>
              <div className="journey-card-name">{journey.name}</div>
              <div className="journey-card-stops">{stops.map((d) => d.name).join(", ")}</div>
              {!journey.live && <div className="journey-card-price">Coming soon</div>}
            </>
          );

          if (!journey.live) {
            return (
              <button
                key={journey.slug}
                type="button"
                className="journey-card journey-card-not-live"
                onClick={() =>
                  setNotice(`${journey.name} isn't fully mapped out yet — check out the Islay Grand Tour instead.`)
                }
              >
                {cardContent}
              </button>
            );
          }

          return (
            <Link href={`/journeys/${journey.slug}`} className="journey-card" key={journey.slug}>
              {cardContent}
            </Link>
          );
        })}
      </div>

      {notice && (
        <div className="location-notice">
          {notice}
          <button className="location-notice-dismiss" onClick={() => setNotice(null)} aria-label="Dismiss">
            &times;
          </button>
        </div>
      )}
    </section>
  );
}
