"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

/**
 * BOOK YOUR STAY — UI SHELL, PLACEHOLDER TRACKING CODES
 * ---------------------------------------------------------------
 * Demo page for the accommodation flow: select location -> select class
 * -> generate tracked deep links to Expedia and Booking.com. Both
 * platforms are now live, approved affiliate accounts (18 July 2026),
 * but this page uses PLACEHOLDER tracking codes (YOUR_MDPCID_HERE,
 * YOUR_AID_HERE) - the generated links are real, working search-results
 * pages, just without commission attribution until the real codes are
 * dropped in below. Swap PRIMARY_SUPPLIER to 'booking' to preview the
 * other ordering. Not linked from live navigation.
 */

// Easy to flip once Mark decides which platform to lead with, after
// comparing property range/attractiveness for Islay specifically.
const PRIMARY_SUPPLIER: "expedia" | "booking" = "expedia";

// Real tracking codes go here once available - see conversation of
// 18 July 2026. Links work without them, just earn no commission yet.
const EXPEDIA_MDPCID = "YOUR_MDPCID_HERE";
const BOOKING_AID = "YOUR_AID_HERE";

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

function buildExpediaLink(location: string, checkin: string, checkout: string): string {
  const params = new URLSearchParams({
    SearchType: "Destination",
    CityName: `${location}, Islay, Scotland`,
    StartDate: checkin,
    EndDate: checkout,
    NumRoom: "1",
    NumAdult1: "2",
    mdpcid: EXPEDIA_MDPCID,
  });
  return `https://www.expedia.co.uk/go/hotel/search/Destination?${params.toString()}`;
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

  const expediaLink = buildExpediaLink(location, checkin, checkout);
  const bookingLink = buildBookingLink(location, checkin, checkout);

  const primaryLink = PRIMARY_SUPPLIER === "expedia" ? expediaLink : bookingLink;
  const secondaryLink = PRIMARY_SUPPLIER === "expedia" ? bookingLink : expediaLink;
  const primaryName = PRIMARY_SUPPLIER === "expedia" ? "Expedia" : "Booking.com";
  const secondaryName = PRIMARY_SUPPLIER === "expedia" ? "Booking.com" : "Expedia";

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
          Find somewhere to stay near your trip, through Expedia or Booking.com.
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
            This sets your expectations going in - neither Expedia nor Booking.com&apos;s
            simple search links can guarantee a hard star-rating filter, so you&apos;ll still
            narrow down by class once you land on their results.
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
              href={primaryLink}
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
              Search on {primaryName} &rarr;
            </a>

            <a
              href={secondaryLink}
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
              Or search on {secondaryName} instead
            </a>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
