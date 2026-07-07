"use client";

import { useState } from "react";

// Real, verified detail for the three below-map "Complete your trip" cards.
// Sources checked this session (see handoff): CalMac's own route/service
// pages (Port Ellen closure), Loganair's route + weather-aware pages,
// Bowmore/Ardbeg/Lagavulin distillery visitor pages, and driving/car-hire
// guidance corroborated across multiple independent Islay travel sites.
// Content is deliberately specific ("hard to find elsewhere") rather than
// generic tourist-board copy, per the brief.

interface EssentialCard {
  icon: string;
  title: string;
  teaser: string;
  sections: { heading: string; points: string[] }[];
}

const CAR_HIRE: EssentialCard = {
  icon: "🚗",
  title: "Car hire",
  teaser: "Two small local firms, a fixed number of cars, and no mainland-sized fleet to fall back on.",
  sections: [
    {
      heading: "Book weeks ahead, not days",
      points: [
        "Islay has two hire firms — Islay Car Hire and Cresswell Cars — both operating from the airport and the ferry ports, with modest fleets rather than a big-brand depot.",
        "Weekly rates work out better value than daily; expect roughly £70–£85/day for a small-to-medium car if booking direct on-island.",
        "Book as far ahead as you can for summer and especially Fèis Ìle week (late May) — cars run out well before the island does.",
      ],
    },
    {
      heading: "Fuel and parking realities",
      points: [
        "Only two fuel stations on the whole island: Port Askaig Stores by the ferry terminal, and the Co-op in Port Ellen. Fill up before a long day out — there's no third option.",
        "Parking is genuinely tight in Bowmore and Port Ellen at peak times; don't count on finding space right outside a distillery door.",
      ],
    },
    {
      heading: "The drink-drive maths",
      points: [
        "Scotland's drink-drive limit is 50mg/100ml — stricter than England's 80mg. For a day of tours and tastings, the only realistic approach is a non-drinking driver, or no driving at all.",
        "Most visitors solve this with the local bus (Routes 450/451 link the main villages and distilleries), a taxi for the day, or e-bike hire — not by skipping drams.",
      ],
    },
  ],
};

const GETTING_HERE: EssentialCard = {
  icon: "⛴️",
  title: "Getting here",
  teaser: "Port Ellen's ferry terminal is closed until 2029 — that changes more than people expect.",
  sections: [
    {
      heading: "The ferry — and a live disruption to know about",
      points: [
        "Port Ellen ferry terminal closed on 2 June 2026 for a multi-year CMAL redevelopment and won't reopen until 2029. Every CalMac sailing to Islay currently runs Kennacraig ⇄ Port Askaig only.",
        "That means more traffic through one port, longer marshalling queues, and less flexibility on which end of the island you land at — worth building extra time into arrival day regardless of where you're staying.",
        "Vehicle spaces should be booked online in advance; foot passengers can usually turn up and buy a ticket, but booking ahead is still recommended in peak season.",
        "Peak-season (June–August) sailings can be booked from around three months out and the popular ones do sell through — if you're travelling for Fèis Ìle, book the ferry before you book anything else.",
        "The Islay fleet is elderly and does break down; always check CalMac's service status page in the days before you travel rather than assuming the timetable is fixed.",
      ],
    },
    {
      heading: "Flying instead",
      points: [
        "Loganair flies Glasgow ⇄ Islay (Glenegedale, ILY) in around 35–40 minutes, roughly a dozen flights a week — useful if you're short on time, but you'll need a hire car or transfer once you land.",
        "Islay's runway has no radar for poor-visibility landings — pilots need to see it to land on it. Locals' rule of thumb: if you can't see across Loch Indaal, the plane probably isn't coming in.",
        "That makes the ferry and the plane fail in different conditions — fog and low cloud ground flights, while high wind and swell are what disrupt the ferry. If one's cancelled, check whether the other is actually still running.",
      ],
    },
  ],
};

const BEST_MONTHS = "May and June";

const TOUR_REALITY: EssentialCard = {
  icon: "🥃",
  title: "Weather & when to go",
  teaser: "Real Met Office averages, plus how long a tour actually takes once you're standing in it.",
  sections: [
    {
      heading: "When to go",
      points: [
        `${BEST_MONTHS} are typically the driest, sunniest stretch and give you the longest daylight for exploring between drams.`,
        "Late May brings Fèis Ìle, Islay's whisky festival — wonderful, but it's also the week the ferry and every distillery event sells out first, so plan travel and tours before anything else.",
        "October–December is the wettest run of the year; a winter trip is quieter and moody in a good way, but pack proper waterproofs and expect under 8 hours of daylight.",
      ],
    },
    {
      heading: "Tours: realistic, not brochure, timings",
      points: [
        "A standard distillery tour is usually about an hour, not the half-day some marketing photos imply — Ardbeg's classic tour and Lagavulin's Distillery Tour both run around 60 minutes.",
        "Deeper warehouse and tasting experiences run 90 minutes to 2.5 hours, and some (like Ardbeg's Loch Uigeadail Hike) only run on specific days.",
        "Port Ellen Distillery takes appointment-only bookings and can't accommodate walk-ins at all — plan that one before you arrive, not on the day.",
        "Distilleries also pause for maintenance ('silent season') at points in the year and close for local events like the Islay Agricultural Show — check each distillery's own site for your travel dates rather than assuming they're always open.",
      ],
    },
  ],
};

function TripEssentialsCard({ card }: { card: EssentialCard }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="essentials-card">
      <button
        type="button"
        className="essentials-card-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="essentials-card-icon">{card.icon}</span>
        <span className="essentials-card-heading">
          <span className="essentials-card-title">{card.title}</span>
          <span className="essentials-card-teaser">{card.teaser}</span>
        </span>
        <span className={`essentials-card-chevron${open ? " open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="essentials-card-body">
          {card.sections.map((section) => (
            <div className="essentials-card-section" key={section.heading}>
              <div className="essentials-card-section-heading">{section.heading}</div>
              <ul className="essentials-card-list">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripEssentials() {
  return (
    <div className="below-map-section">
      <div className="how-eyebrow">Complete your trip</div>
      <h2 className="how-title">Before you go</h2>
      <div className="essentials-grid">
        <TripEssentialsCard card={GETTING_HERE} />
        <TripEssentialsCard card={CAR_HIRE} />
        <TripEssentialsCard card={TOUR_REALITY} />
      </div>
    </div>
  );
}
