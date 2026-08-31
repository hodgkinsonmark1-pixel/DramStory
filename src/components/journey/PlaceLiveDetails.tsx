"use client";

import { useEffect, useRef, useState } from "react";
import { hasGoogleMapsBrowserKey, loadPlacesUiKit } from "@/lib/google-maps-loader";

// ─────────────────────────────────────────────────────────────────────────
// LIVE DETAILS PANEL — Google Places UI Kit, food/drink pins only.
//
// Renders Google's own <gmp-place-details-compact> element for a single
// Google Place ID (stored per-venue in Airtable's Local Features table).
// Opening hours, rating, price band and photo are fetched fresh by the
// component every time it renders - we never store any of them.
//
// READ docs/google-places-policy.md BEFORE CHANGING THIS FILE. The short
// version: Places content may not be shown "with or near a non-Google
// Map" (ToS 3.2.3(e)), and Places UI Kit is the single carve-out that
// permits it (Service Specific Terms 15.1). Re-implementing this panel
// with our own markup fed by the Places API would breach the terms, no
// matter how much better it looked.
//
// Google's built-in attribution inside the element must not be removed,
// hidden or restyled beyond the three permitted brand colours.
// ─────────────────────────────────────────────────────────────────────────

interface PlaceLiveDetailsProps {
  /** Google Place ID, e.g. "ChIJ...". */
  placeId: string;
  /** Venue name - shown in our own heading above the Google card so the
   *  panel reads as DramStory's, and so there's something meaningful on
   *  screen while Google's element is still loading. */
  name: string;
  onClose: () => void;
}

// NOTE: the caller renders this with key={placeId}, so switching venues
// remounts rather than re-running the effect against stale state. That's
// why the effect below never resets `state` back to "loading" itself -
// a fresh mount already starts there.

type LoadState = "loading" | "ready" | "error";

export default function PlaceLiveDetails({ placeId, name, onClose }: PlaceLiveDetailsProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const host = hostRef.current;
      if (!host) return;
      host.replaceChildren();

      try {
        await loadPlacesUiKit();
      } catch {
        if (!cancelled) setState("error");
        return;
      }
      if (cancelled) return;

      // Built imperatively rather than as JSX: these are custom elements
      // with hyphenated tag names React would need type augmentation for,
      // and the `place` value is set as a DOM property (not an attribute)
      // per the Places UI Kit reference.
      const details = document.createElement("gmp-place-details-compact");
      details.setAttribute("orientation", "vertical");

      const request = document.createElement("gmp-place-details-place-request");
      (request as unknown as { place: string }).place = placeId;
      details.appendChild(request);

      const config = document.createElement("gmp-place-content-config");
      for (const tag of [
        "gmp-place-media",
        "gmp-place-rating",
        "gmp-place-type",
        "gmp-place-price",
        "gmp-place-open-now-status",
        "gmp-place-address",
        "gmp-place-attribution",
      ]) {
        config.appendChild(document.createElement(tag));
      }
      details.appendChild(config);

      // gmp-error fires when Google rejects the request (bad key, bad
      // place ID, quota). Neither event is guaranteed for every failure
      // mode, so the timeout below is the backstop rather than the
      // primary path.
      details.addEventListener("gmp-load", () => {
        if (!cancelled) setState("ready");
      });
      details.addEventListener("gmp-error", () => {
        if (!cancelled) setState("error");
      });

      host.appendChild(details);

      window.setTimeout(() => {
        if (!cancelled) setState((s) => (s === "loading" ? "error" : s));
      }, 8000);
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  if (!hasGoogleMapsBrowserKey()) return null;

  return (
    <aside className="place-live-panel" aria-label={`Live details for ${name}`}>
      <div className="place-live-panel-head">
        <div>
          <p className="place-live-panel-eyebrow">Live details</p>
          <h3 className="place-live-panel-name">{name}</h3>
        </div>
        <button type="button" className="place-live-panel-close" onClick={onClose} aria-label="Close live details">
          &times;
        </button>
      </div>

      {/* Visually separates Google's content from ours, which the Places
          UI Kit attribution guidance explicitly requires. */}
      <div className="place-live-panel-body" ref={hostRef} />

      {state === "loading" ? <p className="place-live-panel-note">Checking with Google&hellip;</p> : null}
      {state === "error" ? (
        <p className="place-live-panel-note">
          Live details aren&rsquo;t available for this venue right now. Opening hours on Islay change with the season &mdash;
          it&rsquo;s worth ringing ahead.
        </p>
      ) : null}
    </aside>
  );
}
