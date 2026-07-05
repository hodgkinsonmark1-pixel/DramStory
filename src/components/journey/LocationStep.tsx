"use client";

import { useState } from "react";
import type { Distillery, LocationAnswer } from "@/lib/types";
import { REGIONS } from "@/lib/journey-options";

interface LocationStepProps {
  distilleries: Distillery[];
  onNext: (answer: LocationAnswer) => void;
  onBack: () => void;
}

type OptionId = "islay" | "speyside" | "highland" | "campbeltown" | "lowland" | "airport" | "distillery";

/**
 * Q2 — "Where does your story take you?"
 * 7 options: the 5 regions (only Islay has live data — the rest still route
 * into the workspace, just with an empty overlay), plus two special cases:
 *   - Airport: free-text, so we can surface a "flying into X" context later
 *   - Distillery: jump straight to a specific distillery, picked from a
 *     dropdown of everything currently in Airtable (Islay's 9 today)
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
      <div className="journey-header">
        <div className="journey-eyebrow">Step 2 of 3</div>
        <h1 className="journey-title">
          Where does your <em>story</em> take you?
        </h1>
      </div>

      <div className="progress-dots">
        <div className="dot done" />
        <div className="dot active" />
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
            {!r.live && <span style={{ color: "var(--slate)", fontSize: 11, marginLeft: 6 }}>Coming soon</span>}
          </button>
        ))}
        <button
          className={"q-card" + (selected === "airport" ? " selected" : "")}
          onClick={() => setSelected("airport")}
        >
          Flying in? Tell us your airport
        </button>
        <button
          className={"q-card" + (selected === "distillery" ? " selected" : "")}
          onClick={() => setSelected("distillery")}
        >
          Start from a specific distillery
        </button>
      </div>

      {selected === "airport" && (
        <div className="location-input-row">
          <input
            className="location-text-input"
            type="text"
            placeholder="e.g. Glasgow, Edinburgh, Islay Airport"
            value={airportName}
            onChange={(e) => setAirportName(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {selected === "distillery" && (
        <div className="location-input-row">
          <select
            className="location-select-input"
            value={distillerySlug}
            onChange={(e) => setDistillerySlug(e.target.value)}
          >
            <option value="">Choose a distillery…</option>
            {distilleries.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name} · {d.region}
              </option>
            ))}
          </select>
        </div>
      )}

      <button className="journey-next-btn" disabled={!canContinue} onClick={handleContinue}>
        Continue
      </button>
      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
