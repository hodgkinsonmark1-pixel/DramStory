"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

/**
 * PRE-DESIGNED DAYS HUB — LAYOUT TEMPLATE, 7 REAL DAYS SO FAR
 * ---------------------------------------------------------------
 * All seven Days currently on this page (Bowmore Unhurried, Three
 * Distilleries One Road, Ardbeg on Foot, Lagavulin Unhurried, Farm to
 * Bottle Rhinns Peninsula, Bruichladdich by the Loch, Kilchoman and
 * Machir Bay) are real, sourced, and have been through the draft →
 * review → second-pass process, matching their Airtable records
 * (Status: Draft). This is still a layout template exercise, not the
 * final data-driven page - the remaining ~8-9 Days will be added the
 * same way before this reads from Airtable directly and goes live. Do
 * not link this route from live navigation yet. See
 * docs/deferred-features.md for related parked decisions (e.g.
 * gamification).
 */

import HubDayMap, { type HubDayMapStop } from "@/components/journeys/HubDayMap";

type DummyDay = {
  id: string;
  name: string;
  type: "Solo" | "Multi";
  distilleries: string[];
  narrative: string;
  pacing: "Relaxed" | "Moderate" | "Packed";
  durationPortEllen: string;
  durationBowmore: string;
  cost: string;
  /** True once a Day's content is real/reviewed rather than placeholder. */
  isReal?: boolean;
  /** Real map stops (distilleries + any linked Local Features) for Days
   *  that have them. Absent for any Day still without a real map. */
  mapDistilleries?: HubDayMapStop[];
  mapFeatures?: HubDayMapStop[];
  /** For Solo Days: the distillery's own hero image, used as the card
   *  visual instead of the map. Absent = falls back to map/placeholder. */
  heroImageUrl?: string;
};

/** Renders plain text containing [label](/path) markdown-style links as
 *  real internal <Link>s - same helper used on Distillery/Explore pages,
 *  reused here so real Day narratives render identically once this goes
 *  live. */
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    return (
      <Link href={href} key={i} className="dist-inline-link">
        {label}
      </Link>
    );
  });
}

const DUMMY_DISTILLERIES = [
  "Ardbeg",
  "Lagavulin",
  "Laphroaig",
  "Bowmore",
  "Bruichladdich",
  "Kilchoman",
  "Bunnahabhain",
  "Ardnahoe",
  "Caol Ila",
  "Kilchoman",
  "Jura",
];

const DUMMY_DAYS: DummyDay[] = [
  {
    id: "ardbeg-on-foot",
    name: "Ardbeg, on Foot",
    type: "Solo",
    distilleries: ["Ardbeg"],
    narrative:
      "Ardbeg rewards the walk. Take the coast road out from Port Ellen with the sea on one side, and stop at [The Old Kiln Cafe](/explore/old-kiln-cafe-ardbeg) along the way — right on the distillery's own pier, looking straight out at the Atlantic. At [Ardbeg](/distilleries/ardbeg) itself, the Classic Ardbeg Tour takes you from malting through to the stills, with a guided tasting of three core-range drams as you go — book ahead, this one fills up. Afterwards, there's nowhere to be. Sit out on the pier, let the peat smoke settle in, and watch the Atlantic do its thing for as long as you've got left in the day.",
    pacing: "Relaxed",
    durationPortEllen: "≈3.5 hrs",
    durationBowmore: "≈5.5 hrs",
    cost: "£22.50pp",
    isReal: true,
    heroImageUrl: "/api/attachment?t=tblSPRTIf1sFK3UDL&r=reclGZQjVcuXzMLUs&f=fldbYJ8xNSPCLwG0h&i=0",
    mapDistilleries: [{ name: "Ardbeg", slug: "ardbeg", lat: 55.6411, lng: -6.1609 }],
    mapFeatures: [{ name: "The Old Kiln Cafe", slug: "old-kiln-cafe-ardbeg", lat: 55.6403983, lng: -6.108545 }],
  },
  {
    id: "bowmore-day",
    name: "Bowmore, Unhurried",
    type: "Solo",
    distilleries: ["Bowmore"],
    narrative:
      "Give the whole day to Bowmore — there's no need to rush. Start at [MacTaggart Leisure Centre](/explore/mactaggart-leisure-centre), Islay's only pool, warmed by heat piped over from the distillery next door. Cross the road to [Bowmore](/distilleries/bowmore) itself for the Essence of Islay Tasting — ninety unhurried minutes through four of the distillery's more exclusive expressions, talked through by someone who can explain exactly why they taste the way they do, before it moves along the harbour to the Harbour Inn's private bar for a plate of local seafood alongside the last of the drams. It's a proper sit-down, not a rush between stops — book ahead. Once you're back on your feet, step into [Round Church of Bowmore](/explore/round-church-bowmore), built round, so the story goes, so the devil would have nowhere to hide, then finish with a wander down the high street's independent shops before the light goes, and see in the evening at the local pub that most takes your eye.",
    pacing: "Relaxed",
    durationPortEllen: "≈5.5 hrs",
    durationBowmore: "≈4.5 hrs",
    cost: "£100pp",
    isReal: true,
    heroImageUrl: "/api/attachment?t=tblSPRTIf1sFK3UDL&r=recddt65hbDkOeCOs&f=fldbYJ8xNSPCLwG0h&i=0",
    mapDistilleries: [{ name: "Bowmore", slug: "bowmore", lat: 55.7557, lng: -6.2875 }],
    mapFeatures: [
      { name: "Mactaggart Leisure Centre", slug: "mactaggart-leisure-centre", lat: 55.756234, lng: -6.290194 },
      { name: "Round Church of Bowmore", slug: "round-church-bowmore", lat: 55.7551, lng: -6.2864 },
    ],
  },
  {
    id: "three-distilleries-one-road",
    name: "Three Distilleries, One Road",
    type: "Multi",
    distilleries: ["Caol Ila", "Ardnahoe", "Bunnahabhain"],
    narrative:
      "Heading along the coast from Port Askaig, today you'll take in three very different distilleries — largest, newest, and most traditional. First is [Caol Ila](/distilleries/caol_ila), the largest of the three, for the Flavour Journey tour, with perhaps the most beautiful distillery views over the Sound of Islay to the Paps of Jura. Next is [Ardnahoe](/distilleries/ardnahoe), the newest distillery on the island, for the quick Spirit of Ardnahoe tour, finishing with two drams and a glass to keep. Last is [Bunnahabhain](/distilleries/bunnahabhain), the most traditional and remote of the three, and the island's one great unpeated outlier while every other distillery here chases peat smoke — fifty minutes through the malt mill, mash tun, washbacks and stills, ending with two drams from the core range. Three distilleries, three characters, one road, incredible scenery. A busy and amazing day.",
    pacing: "Packed",
    durationPortEllen: "≈6.5 hrs",
    durationBowmore: "≈5.5 hrs",
    cost: "£56pp",
    isReal: true,
    mapDistilleries: [
      { name: "Caol Ila", slug: "caol_ila", lat: 55.8544, lng: -6.1092 },
      { name: "Ardnahoe", slug: "ardnahoe", lat: 55.8697, lng: -6.1189 },
      { name: "Bunnahabhain", slug: "bunnahabhain", lat: 55.8831, lng: -6.1258 },
    ],
  },
  {
    id: "lagavulin-unhurried",
    name: "Lagavulin, Unhurried",
    type: "Solo",
    distilleries: ["Lagavulin"],
    narrative:
      "Lagavulin sits on its own bay, near the ruins of [Dunyveg Castle](/explore/dunyvaig-castle-ruins), on Islay's south coast. Allow yourself time to enjoy the beautiful 2 mile stroll from Port Ellen, appreciate the coast on one side and Islay's peat-rich hills on the other. Relax, today nothing is rushed, including the tour. The Distillery Exclusive Experience at [Lagavulin](/distilleries/lagavulin) runs a full two hours, built for people who actually want to sit with it — through the production areas and the iconic Still House, then settling into the Mackie Lounge for four Lagavulin bottlings, a single cask sample, and a taste of the spirit before it's even whisky yet. You leave having hand-filled your own bottle from that cask — a genuine one-off, nothing you can buy again. Arrive fifteen minutes early, and know this one's for adults only. Sit by [Lagavulin Bay](/explore/lagavulin-bay) afterwards and let it all settle before heading back.",
    pacing: "Relaxed",
    durationPortEllen: "≈4 hrs",
    durationBowmore: "≈6 hrs",
    cost: "£130pp",
    isReal: true,
    heroImageUrl: "/api/attachment?t=tblSPRTIf1sFK3UDL&r=recx0ZErm7bEBkj22&f=fldbYJ8xNSPCLwG0h&i=0",
    mapDistilleries: [{ name: "Lagavulin", slug: "lagavulin", lat: 55.6357, lng: -6.1269 }],
    mapFeatures: [
      { name: "Dunyveg Castle", slug: "dunyvaig-castle-ruins", lat: 55.6336, lng: -6.1231 },
      { name: "Lagavulin Bay", slug: "lagavulin-bay", lat: 55.6345, lng: -6.1245 },
    ],
  },
  {
    id: "farm-to-bottle-rhinns",
    name: "Farm to Bottle, Rhinns Peninsula",
    type: "Multi",
    distilleries: ["Bruichladdich", "Kilchoman"],
    narrative:
      "Today sees two special tours as you head out west. Be sure to pack your camera for the incredible scenery and views. Start at [Bruichladdich](/distilleries/bruichladdich) in Port Charlotte for the Guided Distillery Tour — ninety minutes through a working Victorian distillery with no computers anywhere in the process, tasting across all three single malts, from unpeated Bruichladdich through to super-peated Octomore. Make time for a leisurely lunch in the rear garden of the [Port Charlotte Hotel](/explore/port-charlotte-hotel) — a stunning view awaits. From there it's on to [Kilchoman](/distilleries/kilchoman), the most westerly distillery in Scotland and the only one on the island growing, malting and distilling its own barley — the Roving Tour goes deeper into the process for an hour and a half, finishing with a special dram in the warehouse. Pack a picnic and finish the day at [Machir Bay Beach](/explore/machir-bay), right by the distillery, and stay for a breathtaking sunset.",
    pacing: "Moderate",
    durationPortEllen: "≈7.5 hrs",
    durationBowmore: "≈4.5 hrs",
    cost: "£55pp",
    isReal: true,
    mapDistilleries: [
      { name: "Bruichladdich", slug: "bruichladdich", lat: 55.7638, lng: -6.3605 },
      { name: "Kilchoman", slug: "kilchoman", lat: 55.7919, lng: -6.4419 },
    ],
    mapFeatures: [
      { name: "Port Charlotte Hotel", slug: "port-charlotte-hotel", lat: 55.74021, lng: -6.378353 },
      { name: "Machir Bay Beach", slug: "machir-bay", lat: 55.78333, lng: -6.46667 },
    ],
  },
  {
    id: "bruichladdich-by-the-loch",
    name: "Bruichladdich, by the Loch",
    type: "Solo",
    distilleries: ["Bruichladdich"],
    narrative:
      "Port Charlotte wasn't built for tourists — it was built for whisky. Today is a day to lose yourself in local history. Walter Frederick Campbell founded the village in 1828, naming it after his mother, to house the workers of the Lochindaal Distillery next door. That distillery ran for exactly a century before falling silent in 1929; its old buildings still stand, now home to the youth hostel and the Islay Natural History Trust. [Bruichladdich](/distilleries/bruichladdich), two miles up the road, is where that same tradition carries on — the Guided Distillery Tour spends ninety minutes in a working Victorian distillery with no computers anywhere in the process, tasting your way from unpeated Bruichladdich through to super-peated Octomore. Afterwards, walk down to the old stone pier, where locals have fished for mackerel and watched for dolphins for generations, or lose an hour in the [Museum of Islay Life](/explore/museum-of-islay-life), housed in a former church just up from the shore. Loch Indaal does the rest — sit with a view over the water and let the day slow right down.",
    pacing: "Relaxed",
    durationPortEllen: "≈4 hrs",
    durationBowmore: "≈2.5 hrs",
    cost: "£25pp",
    isReal: true,
    heroImageUrl: "/api/attachment?t=tblSPRTIf1sFK3UDL&r=recJH8arRpmDVxGyF&f=fldbYJ8xNSPCLwG0h&i=0",
    mapDistilleries: [{ name: "Bruichladdich", slug: "bruichladdich", lat: 55.7638, lng: -6.3605 }],
    mapFeatures: [
      { name: "Museum of Islay Life", slug: "museum-of-islay-life", lat: 55.7424, lng: -6.3857 },
    ],
  },
  {
    id: "kilchoman-machir-bay",
    name: "Kilchoman and Machir Bay",
    type: "Solo",
    distilleries: ["Kilchoman"],
    narrative:
      "Kilchoman is the most westerly distillery in Scotland, and the only one on the island growing, malting and distilling its own barley on its own farm — genuinely Islay in a glass, start to finish. The Roving Tour goes deep into that process for an hour and a half, finishing with a special dram in the warehouse. Afterwards, walk out to [Machir Bay Beach](/explore/machir-bay) on the island. An area of incredible beauty, and incredible power. Here you immediately feel at one with nature. Two miles of white sand that's swallowed more ships than almost anywhere on the island, including the wreck of the Patti, still half-buried in the sand at low tide. Locals don't swim here; the currents run too strong to risk it. Stand on that sand and it's not hard to go back a hundred years, to October 1918, when HMS Otranto went down offshore in a storm with hundreds of men aboard — so close to home, so close to the war finally ending. Kilchoman even named one of its own whiskies after this beach. Let the rest of the day be whatever the tide and the weather allow.",
    pacing: "Relaxed",
    durationPortEllen: "≈4.5 hrs",
    durationBowmore: "≈3 hrs",
    cost: "£30pp",
    isReal: true,
    heroImageUrl: "/api/attachment?t=tblSPRTIf1sFK3UDL&r=recU2G0zFAF44YGWO&f=fldbYJ8xNSPCLwG0h&i=0",
    mapDistilleries: [{ name: "Kilchoman", slug: "kilchoman", lat: 55.7919, lng: -6.4419 }],
    mapFeatures: [{ name: "Machir Bay Beach", slug: "machir-bay", lat: 55.78333, lng: -6.46667 }],
  },
];

function PacingTag({ pacing }: { pacing: DummyDay["pacing"] }) {
  const tone =
    pacing === "Relaxed"
      ? { bg: "var(--green-light)", fg: "var(--green-deep)" }
      : pacing === "Moderate"
      ? { bg: "var(--amber-pale)", fg: "var(--copper)" }
      : { bg: "#F7E6E0", fg: "#B5502E" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {pacing}
    </span>
  );
}

function DayCard({ day }: { day: DummyDay }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = day.narrative.length > 380;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--stone)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {/* Visual: hero image for Solo Days that have one, else real map, else placeholder */}
        <div
          style={{
            width: 280,
            minWidth: 220,
            flexShrink: 0,
            minHeight: 200,
            position: "relative",
            overflow: "hidden",
            ...(day.heroImageUrl || day.mapDistilleries
              ? {}
              : {
                  background:
                    "repeating-linear-gradient(45deg, var(--stone), var(--stone) 10px, var(--off-white) 10px, var(--off-white) 20px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }),
          }}
        >
          {day.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={day.heroImageUrl}
              alt={day.distilleries[0] ?? day.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : day.mapDistilleries ? (
            <HubDayMap distilleries={day.mapDistilleries} featureStops={day.mapFeatures} />
          ) : (
            <span style={{ fontSize: 12, color: "var(--slate)", fontWeight: 500 }}>
              [ Map placeholder ]
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 280, padding: "24px 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: 24,
                color: "var(--dark)",
                margin: 0,
              }}
            >
              {day.name}
            </h2>
            <PacingTag pacing={day.pacing} />
          </div>

          {/* Quick-scan distillery list */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {day.distilleries.map((d) => (
              <span
                key={d}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--dark)",
                  background: "var(--green-light)",
                  padding: "4px 12px",
                  borderRadius: 100,
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Narrative */}
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--peat)",
              marginBottom: isLong ? 6 : 18,
              maxWidth: 560,
              ...(isLong && !expanded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }
                : {}),
            }}
          >
            {day.isReal ? renderWithLinks(day.narrative) : day.narrative}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 18,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--copper)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              {expanded ? "See less" : "See more"}
            </button>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "20px 32px",
              marginBottom: 4,
              fontSize: 13,
              color: "var(--peat)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 2 }}>
                From Port Ellen
              </div>
              <div style={{ fontWeight: 600, color: "var(--dark)" }}>{day.durationPortEllen}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 2 }}>
                From Bowmore
              </div>
              <div style={{ fontWeight: 600, color: "var(--dark)" }}>{day.durationBowmore}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 2 }}>
                Indicative distillery cost
              </div>
              <div style={{ fontWeight: 600, color: "var(--copper)" }}>{day.cost}</div>
            </div>

            <button
              style={{
                marginLeft: "auto",
                padding: "9px 18px",
                background: "white",
                color: "var(--copper)",
                border: "1px solid var(--copper)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              disabled
              title="Placeholder — not wired to TripContext yet"
            >
              + Add this day to my trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreDesignedDaysHubPage() {
  const [selectedDistillery, setSelectedDistillery] = useState<string>("all");

  const filteredDays = useMemo(() => {
    if (selectedDistillery === "all") return DUMMY_DAYS;
    return DUMMY_DAYS.filter((d) => d.distilleries.includes(selectedDistillery));
  }, [selectedDistillery]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid var(--stone)",
          background: "var(--off-white)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "56px 24px 24px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "var(--dark)",
            marginBottom: 12,
            letterSpacing: "-0.01em",
          }}
        >
          Pre-Designed <em style={{ fontStyle: "italic", color: "var(--amber)" }}>Days</em>
        </h1>
        <p style={{ fontSize: 15, color: "var(--peat)", maxWidth: 620, marginBottom: 20 }}>
          A ready-made day, built around the distilleries you want to see. Add it straight to
          your trip, then make it yours — keep what you love, swap out what you don&apos;t.
        </p>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--slate)",
            maxWidth: 620,
            marginBottom: 32,
            paddingLeft: 14,
            borderLeft: "2px solid var(--stone)",
          }}
        >
          <strong style={{ color: "var(--peat)" }}>These are inspiration, not bookings.</strong>{" "}
          Tours, prices, and availability shown here reflect what&apos;s confirmed at time of
          writing, but distilleries change opening days, tour formats, and pricing throughout
          the year. Always check the distillery&apos;s own website for your actual travel dates
          before building a day around a specific tour.
        </p>

        {/* Distillery dropdown */}
        <div style={{ marginBottom: 40 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--slate)",
              marginBottom: 8,
            }}
          >
            Select your distillery
          </label>
          <select
            value={selectedDistillery}
            onChange={(e) => setSelectedDistillery(e.target.value)}
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--stone)",
              background: "white",
              fontSize: 14,
              color: "var(--dark)",
              minWidth: 260,
              fontFamily: "var(--font-body)",
            }}
          >
            <option value="all">All distilleries</option>
            {[...new Set(DUMMY_DISTILLERIES)].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Vertical stacked day list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 64 }}>
          {filteredDays.map((day) => (
            <DayCard key={day.id} day={day} />
          ))}
          {filteredDays.length === 0 && (
            <div style={{ fontSize: 14, color: "var(--slate)", padding: "40px 0" }}>
              No Days include that distillery yet. [Placeholder empty state.]
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
