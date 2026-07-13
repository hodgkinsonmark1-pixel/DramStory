"use client";

import { Suspense, use, useState } from "react";
import type { Distillery, LocationAnswer } from "@/lib/types";
import { REGIONS } from "@/lib/journey-options";
import SiteHeader from "@/components/SiteHeader";
import BackgroundImage from "@/components/BackgroundImage";

interface LocationStepProps {
  /** Deferred - Q2's primary region cards don't need distillery data at
   *  all, so this is only resolved (via Suspense, below) once someone
   *  actually picks "a specific distillery". */
  distilleriesPromise: Promise<Distillery[]>;
  onNext: (answer: LocationAnswer) => void;
  onBack: () => void;
}

type OptionId = "islay" | "speyside" | "highland" | "campbeltown" | "lowland" | "airport" | "distillery";

/** Resolves the distilleries promise - isolated to its own component so
 *  Suspense only affects this dropdown, never Q2's initial paint. */
function DistilleryPicker({
  distilleriesPromise,
  onNext,
}: {
  distilleriesPromise: Promise<Distillery[]>;
  onNext: (answer: LocationAnswer) => void;
}) {
  const distilleries = use(distilleriesPromise);
  return (
    <select
      className="q-card location-inline-input"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onNext({ kind: "distillery", distillerySlug: e.target.value });
      }}
      autoFocus
    >
      <option value="">Choose a distillery…</option>
      {distilleries.map((d) => (
        <option key={d.slug} value={d.slug}>
          {d.name} · {d.region}
        </option>
      ))}
    </select>
  );
}

/**
 * Q2 - "Where does your story take you?"
 * Auto-advances on selection, matching Q1's one-click feel - no separate
 * Continue button. The two special cases still need a bit of input first
 * (typing an airport, picking a distillery), so those advance on Enter /
 * on selecting a dropdown value instead of on the initial card click.
 */
export default function LocationStep({ distilleriesPromise, onNext, onBack }: LocationStepProps) {
  const [selected, setSelected] = useState<OptionId | null>(null);
  const [airportName, setAirportName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function handleRegionClick(region: (typeof REGIONS)[number]) {
    if (!region.live) {
      setNotice(`${region.label} isn't ready yet — Islay & Jura is fully built and ready to explore.`);
      return;
    }
    onNext({ kind: "region", region: region.id });
  }

  return (
    <div className="journey-screen">
      <BackgroundImage />
      <div className="hero-overlay" />
      <SiteHeader transparent logoSize={48} />

      <div className="journey-header">
        <div className="journey-eyebrow">Building your journey — step 2 of 3</div>
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
            className={"q-card" + (!r.live ? " q-card-not-live" : "")}
            onClick={() => handleRegionClick(r)}
          >
            {r.label}
          </button>
        ))}

        {notice && (
          <div className="location-notice">
            {notice}
            <button className="location-notice-dismiss" onClick={() => setNotice(null)} aria-label="Dismiss">
              &times;
            </button>
          </div>
        )}

        {selected === "airport" ? (
          <input
            className="q-card location-inline-input"
            type="text"
            placeholder="Type your airport, press Enter…"
            value={airportName}
            onChange={(e) => setAirportName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && airportName.trim().length > 0) {
                onNext({ kind: "airport", airportName: airportName.trim() });
              }
            }}
            autoFocus
          />
        ) : (
          <button className="q-card" onClick={() => setSelected("airport")}>
            Flying in? Tell us your airport
          </button>
        )}

        {selected === "distillery" ? (
          <Suspense fallback={<div className="q-card location-inline-input">Loading distilleries…</div>}>
            <DistilleryPicker distilleriesPromise={distilleriesPromise} onNext={onNext} />
          </Suspense>
        ) : (
          <button className="q-card" onClick={() => setSelected("distillery")}>
            A specific distillery
          </button>
        )}
      </div>

      <button className="journey-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
