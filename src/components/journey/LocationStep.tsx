"use client";

import { useState } from "react";
import type { Distillery, LocationAnswer } from "@/lib/types";
import { REGIONS } from "@/lib/journey-options";
import SiteHeader from "@/components/SiteHeader";
import BackgroundVideo from "@/components/BackgroundVideo";

interface LocationStepProps {
  distilleries: Distillery[];
  onNext: (answer: LocationAnswer) => void;
  onBack: () => void;
}

type OptionId = "islay" | "speyside" | "highland" | "campbeltown" | "lowland" | "airport" | "distillery";

/**
 * Q2 - "Where does your story take you?"
 * 7 options: the 5 regions (only Islay has live data - the rest still
 * route into the workspace with an empty overlay, nothing is locked out)
 * plus two special cases that expand in place rather than opening a
 * separate input row below the grid:
 *   - Airport: the card itself becomes a text field
 *   - A specific distillery: the card itself becomes a dropdown
 */
export default function LocationStep({ distilleries, onNext, onBack }: LocationStepProps) {
  const [selected, setSelected] = useState<OptionId | null>(null);
  const [airportName, setAirportName] = useState("");
  const [distillerySlug, setDistillerySlug] = useState("");

  const canContinue =
    selected !== null &&
    (selected !== "airport" || airportName.trim().length > 0) &&
    (selected !== "distillery" || distillerySlug.length > 0);

  function handleContinue() {
    if (!selected) return;
    if (selected === "airport") {
      onNext({ kind: "airport", airportName: airportName.trim() });
    } else if (selected === "distillery") {
      onNext({ kind: "distillery", distillerySlug });
    } else {
      onNext({ kind: "region", region: selected });
    }
  }

  return (
    <div className="journey-screen">
      <BackgroundVideo />
      <div className="hero-overlay" />
      <SiteHeader logoSize={40} />

      <div className="journey-header">
        <div className="journey-eyebrow">Building your journey — step 2 of 4</div>
        <h1 className="journey-title">
          Where does your <em>story</em> take you?
        </h1>
      </div>

      <div className="progress-dots">
        <div className="dot done" />
        <div className="dot active" />
        <div className="dot" />
        <div className="dot" />
      </div>

      <div className="q-cards">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            className={"q-card" + (selected === r.id ? " selected" : "")}
            onClick={() => setSelected(r.id)}
          >
            {r.label}
          </button>
        ))}

        {selected === "airport" ? (
          <input
            className="q-card location-inline-input"
            type="text"
            placeholder="Type your airport…"
            value={airportName}
            onChange={(e) => setAirportName(e.target.value)}
            autoFocus
          />
        ) : (
          <button className="q-card" onClick={() => setSelected("airport")}>
            Flying in? Tell us your airport
          </button>
        )}

        {selected === "distillery" ? (
          <select
            className="q-card location-inline-input"
            value={distillerySlug}
            onChange={(e) => setDistillerySlug(e.target.value)}
            autoFocus
          >
            <option value="">Choose a distillery…</option>
            {distilleries.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name} · {d.region}
              </option>
            ))}
          </select>
        ) : (
          <button className="q-card" onClick={() => setSelected("distillery")}>
            A specific distillery
          </button>
        )}
      </div>

      <button className="journey-next-btn" disabled={!canContinue} onClick={handleContinue}>
        Continue
      </button>
      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
