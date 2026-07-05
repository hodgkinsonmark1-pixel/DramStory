"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "./SiteHeader";
import BackgroundVideo from "./BackgroundVideo";

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
    // Trimmed ~1s off the full sequence (options used to appear at 4000ms)
    // so the question doesn't feel like it takes too long to show up.
    const t1 = setTimeout(() => setTagVis(true), 400);
    const t2 = setTimeout(() => setChevVis(true), 1400);
    const t3 = setTimeout(() => {
      setQVis(true);
      setChevVis(false);
    }, 2200);
    const t4 = setTimeout(() => setOptVis(true), 3000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const options = [
    { label: "I'm here today", mode: "today" },
    { label: "Planning a future trip", mode: "planning" },
    { label: "Just dreaming", mode: "inspiration" },
  ] as const;

  function handleSelect(opt: (typeof options)[number]) {
    setSelected(opt.label);
    setTimeout(() => router.push(`/journey?mode=${opt.mode}`), 420);
  }

  return (
    <div className="hero">
      <BackgroundVideo />
      <div className="hero-overlay" />

      <SiteHeader transparent logoSize={48} />

      <div className="hero-content">
        <h1 className={"hero-tagline" + (tagVis ? " visible" : "")}>
          Where <em>whisky adventures</em>
          <br />
          are crafted
        </h1>
        <p className={"hero-question" + (qVis ? " visible" : "")}>
          When does your dram story begin?
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
