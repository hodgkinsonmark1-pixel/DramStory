"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";

/**
 * The homepage hero — ported from the mockup's HomePage/hero sequence:
 * tagline fades in, then a question, then three journey-type options.
 * Picking an option is intended to hand off into the journey planner
 * (built in Phase 2/3); for now it routes to /journey with the answer
 * as a query param so the flow is testable end-to-end.
 */
export default function Hero() {
  const router = useRouter();
  const [tagVis, setTagVis] = useState(false);
  const [chevVis, setChevVis] = useState(false);
  const [qVis, setQVis] = useState(false);
  const [optVis, setOptVis] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setTagVis(true), 400);
    const t2 = setTimeout(() => setChevVis(true), 1800);
    const t3 = setTimeout(() => {
      setQVis(true);
      setChevVis(false);
    }, 3200);
    const t4 = setTimeout(() => setOptVis(true), 4000);
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
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        poster="https://images.pexels.com/videos/13610011/alcohol-bar-drink-drinks-13610011.jpeg?auto=compress&cs=tinysrgb&w=1920"
      >
        <source
          src="https://assets.mixkit.co/videos/17370/17370-720.mp4"
          type="video/mp4"
        />
      </video>
      <div className="hero-overlay" />

      <nav className="hero-nav">
        <Link className="swt-logo" href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo size={36} />
          <div className="logo-text" style={{ color: "white" }}>
            DramStory
            <span style={{ display: "block" }}>Where whisky adventures begin</span>
          </div>
        </Link>
        <div className="hero-nav-links">
          <Link href="/journal">Journal</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </nav>

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
