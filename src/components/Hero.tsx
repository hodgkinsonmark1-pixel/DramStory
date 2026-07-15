"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "./SiteHeader";
import BackgroundImage from "./BackgroundImage";

/**
 * The homepage hero — ported from the mockup's HomePage/hero sequence:
 * tagline fades in, then a question, then three journey-type options.
 * Picking an option hands off into the journey planner (/journey), with
 * the answer passed through as ?mode=.
 */
export default function Hero() {
  const router = useRouter();
  const [tagVis, setTagVis] = useState(false);
  const [chevVis, setChevVis] = useState(false);
  const [qVis, setQVis] = useState(false);
  const [optVis, setOptVis] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // Headline timing left as-is. Question and options now both appear
    // at 0.8s (down from 2.2s/3s) - the full multi-second reveal felt
    // slow before someone could even start answering Q1.
    const t1 = setTimeout(() => setTagVis(true), 400);
    const t2 = setTimeout(() => setChevVis(true), 400);
    const t3 = setTimeout(() => {
      setQVis(true);
      setOptVis(true);
      setChevVis(false);
    }, 800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  const options = [
    { label: "I'm here today", mode: "today" },
    { label: "Planning a future trip", mode: "planning" },
    { label: "Dreaming of a future trip", mode: "dreaming" },
  ] as const;

  function handleSelect(opt: (typeof options)[number]) {
    setSelected(opt.label);
    // Just long enough to register the "selected" visual state before
    // navigating - not a deliberate pause, per the Q1->Q2 speed fix.
    setTimeout(() => router.push(`/journey?mode=${opt.mode}`), 150);
  }

  return (
    <div className="hero">
      <BackgroundImage />
      <div className="hero-overlay" />

      <SiteHeader transparent logoSize={48} />

      <div className="hero-content">
        <h1 className={"hero-tagline" + (tagVis ? " visible" : "")}>
          Where <em>whisky adventures</em>
          <br />
          begin
        </h1>
        <p className={"hero-question" + (qVis ? " visible" : "")}>
          Where are you in your story?
        </p>
        <div className={"hero-options" + (optVis ? " visible" : "")}>
          {options.map((o) => (
            <button
              key={o.label}
              className={"hero-option" + (selected === o.label ? " selected" : "")}
              onClick={() => handleSelect(o)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={"scroll-hint" + (chevVis ? " visible" : " hidden")}>
        <div className="chevron-anim" />
      </div>
    </div>
  );
}
