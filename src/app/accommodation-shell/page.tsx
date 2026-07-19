"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

/**
 * BOOK YOUR STAY — UI SHELL, PLACEHOLDER TRACKING CODES
 * ---------------------------------------------------------------
 * Demo page for the accommodation flow: select location -> select class
 * -> generate tracked deep links to Hotels.com, Vrbo, and Booking.com.
 * Expedia.com itself is deliberately excluded (18 July 2026 - "too
 * broad" as a brand for this audience), even though it's the same
 * underlying Expedia Group account. All three platforms are live,
 * approved affiliate accounts, but this page uses PLACEHOLDER tracking
 * codes (YOUR_MDPCID_HERE, YOUR_AID_HERE, YOUR_CAMREF_HERE) - the
 * generated links are real, working search-results pages, just without
 * commission attribution until the real codes are dropped in below.
 * Note Vrbo uses a different tracking mechanism (Partnerize camref
 * wrapper) from the other two (simple query params) - see
 * buildVrboLink. Swap PRIMARY_SUPPLIER to preview a different ordering.
 * Not linked from live navigation.
 */

// CONFIRMED 18 July 2026: Hotels.com is the primary supplier. Reasoning:
// Expedia Group's 7-day cookie window beats Booking.com's session-based
// attribution (Booking.com only credits a booking completed in the same
// browser session as the click - unlikely for a whisky trip someone
// researches over several visits). Commission-wise: 4% hotel / 2%
// vacation rental via Expedia Group vs. Booking.com's flat 4% on
// accommodation - worth re-checking whether Hotels.com's 4% actually
// applies to Islay's mostly-cottage inventory too, or only proper
// hotels, before assuming the full 4% on every booking.
const PRIMARY_SUPPLIER: "hotels" | "vrbo" | "booking" = "hotels";

// Real tracking codes go here once available - see conversation of
// 18 July 2026. Links work without them, just earn no commission yet.
const HOTELS_MDPCID = "YOUR_MDPCID_HERE";
const BOOKING_AID = "YOUR_AID_HERE";
// Vrbo uses a different mechanism (Partnerize), not a simple query param -
// this is your camref, found in your Partnerize/Vrbo dashboard, not the
// same code as HOTELS_MDPCID above.
const VRBO_CAMREF = "YOUR_CAMREF_HERE";

const LOCATIONS = [
  "Bowmore",
  "Port Ellen",
  "Port Charlotte",
  "Port Askaig",
  "Bridgend",
  "Bruichladdich",
  "Craighouse, Jura",
];

const CLASSES: { id: string; label: string; note: string }[] = [
  { id: "budget", label: "Budget", note: "Simple, comfortable, good value" },
  { id: "mid", label: "Mid-range", note: "A bit more comfort and character" },
  { id: "luxury", label: "Luxury", note: "The best rooms on the island" },
];

function addNights(dateIso: string, nights: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + nights);
  return d.toISOString().slice(0, 10);
}

function buildHotelsLink(location: string, checkin: string, checkout: string): string {
  const params = new URLSearchParams({
    SearchType: "Destination",
    CityName: `${location}, Islay, Scotland`,
    StartDate: checkin,
    EndDate: checkout,
    NumRoom: "1",
    NumAdult1: "2",
    mdpcid: HOTELS_MDPCID,
  });
  return `https://www.hotels.com/go/hotel/search/Destination?${params.toString()}`;
}

function buildVrboLink(location: string, checkin: string, checkout: string): string {
  // Vrbo/Partnerize rule: the destination URL must be unaltered - no extra
  // query params appended beyond what Vrbo's own search page needs, and
  // the tracking prefix wraps the whole thing rather than being a query
  // param within it.
  const destination = `https://www.vrbo.com/search?destination=${encodeURIComponent(
    `${location}, Islay, Scotland`
  )}&startDate=${checkin}&endDate=${checkout}&adults=2`;
  return `https://prf.hn/click/camref:${VRBO_CAMREF}/destination:${destination}`;
}

function buildBookingLink(location: string, checkin: string, checkout: string): string {
  const params = new URLSearchParams({
    aid: BOOKING_AID,
    ss: `${location}, Islay, Scotland`,
    checkin,
    checkout,
    group_adults: "2",
    no_rooms: "1",
    selected_currency: "GBP",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export default function AccommodationShellPage() {
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const checkin = addNights(today, 14);
  const checkout = addNights(today, 17);

  const hotelsLink = buildHotelsLink(location, checkin, checkout);
  const bookingLink = buildBookingLink(location, checkin, checkout);
  const vrboLink = buildVrboLink(location, checkin, checkout);

  const suppliers = {
    hotels: { name: "Hotels.com", link: hotelsLink },
    booking: { name: "Booking.com", link: bookingLink },
    vrbo: { name: "Vrbo", link: vrboLink },
  } as const;
  const primary = suppliers[PRIMARY_SUPPLIER];
  const secondaries = (Object.keys(suppliers) as (keyof typeof suppliers)[])
    .filter((k) => k !== PRIMARY_SUPPLIER)
    .map((k) => suppliers[k]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white)" }}>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          borderBottom: "1px solid var(--stone)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={32} withWordmark />
        </Link>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 24px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--green-deep)",
            marginBottom: 12,
          }}
        >
          UI shell — placeholder tracking codes
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(30px, 4vw, 42px)",
            color: "var(--dark)",
            marginBottom: 12,
          }}
        >
          Book Your <em style={{ fontStyle: "italic", color: "var(--amber)" }}>Stay</em>
        </h1>
        <p style={{ fontSize: 15, color: "var(--peat)", marginBottom: 40 }}>
          Find somewhere to stay near your trip, through Hotels.com, Vrbo, or Booking.com.
        </p>

        {/* Step 1: location */}
        <div style={{ marginBottom: 32 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--slate)",
              marginBottom: 10,
            }}
          >
            Select your location
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--stone)",
              background: "white",
              fontSize: 14,
              color: "var(--dark)",
              minWidth: 280,
              fontFamily: "var(--font-body)",
            }}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: class */}
        <div style={{ marginBottom: 40 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--slate)",
              marginBottom: 10,
            }}
          >
            Select your class
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {CLASSES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClass(c.id);
                  setShowLinks(false);
                }}
                style={{
                  padding: "14px 20px",
                  borderRadius: "var(--radius-sm)",
                  border: selectedClass === c.id ? "2px solid var(--copper)" : "1.5px solid var(--stone)",
                  background: selectedClass === c.id ? "var(--amber-pale)" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 150,
                  fontFamily: "var(--font-body)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dark)", marginBottom: 4 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--slate)" }}>{c.note}</div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 10, maxWidth: 480 }}>
            This sets your expectations going in - none of Hotels.com, Vrbo, or
            Booking.com&apos;s simple search links can guarantee a hard star-rating filter, so
            you&apos;ll still narrow down by class once you land on their results.
          </p>
        </div>

        <button
          onClick={() => setShowLinks(true)}
          disabled={!selectedClass}
          style={{
            padding: "14px 32px",
            background: selectedClass ? "var(--green-deep)" : "var(--stone)",
            color: "white",
            border: "none",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 500,
            cursor: selectedClass ? "pointer" : "not-allowed",
            marginBottom: 32,
          }}
        >
          Find places to stay
        </button>

        {showLinks && (
          <div
            style={{
              background: "white",
              border: "1px solid var(--stone)",
              borderRadius: "var(--radius)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 13, color: "var(--slate)" }}>
              {location} · {CLASSES.find((c) => c.id === selectedClass)?.label} · {checkin} to{" "}
              {checkout} (2 guests, 1 room — placeholder dates until real trip dates are wired in)
            </div>

            <a
              href={primary.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                padding: "16px 28px",
                background: "var(--green-deep)",
                color: "white",
                borderRadius: 100,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Search on {primary.name} &rarr;
            </a>

            {secondaries.map((s) => (
              <a
                key={s.name}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "10px 20px",
                  color: "var(--copper)",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "underline",
                }}
              >
                Or search on {s.name} instead
              </a>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
