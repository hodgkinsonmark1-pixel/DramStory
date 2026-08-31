// ─────────────────────────────────────────────────────────────────────────
// GOOGLE MAPS JS API LOADER — Places UI Kit only.
//
// Loads the Maps JavaScript API on demand, once per page, so the ~200KB
// payload only downloads if a visitor actually opens a live-details panel.
// Nothing here draws a Google map: the only thing we use from this API is
// the Places UI Kit custom elements (<gmp-place-details-compact>).
//
// WHY A UI KIT COMPONENT RATHER THAN THE PLACES API
//   Google Maps Platform ToS 3.2.3(e) ("No Use With Non-Google Maps")
//   prohibits displaying Places content "with or near a non-Google Map".
//   Our journey map is Leaflet/OpenStreetMap, so fetching Places data
//   server-side and rendering it in our own panel beside that map would
//   breach it. Service Specific Terms 15.1 carves out exactly one route:
//
//     "Customer may use Places UI Kit in Customer Applications with or
//      without any map, including a non-Google Map. This clause will
//      prevail over the No Use with Non-Google Maps clause."
//
//   So the Google-rendered component is not a styling preference - it is
//   the only compliant way to show Google hours/ratings on this site.
//   See docs/google-places-policy.md before changing any of this.
//
// REQUIRED ENVIRONMENT VARIABLE
//   NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY - a SEPARATE key from the
//     server-only GOOGLE_PLACES_API_KEY. This one reaches the browser by
//     design (the UI Kit runs client-side), so it must be locked down in
//     Google Cloud Console with an HTTP-referrer restriction to
//     dramstory.com and the Vercel preview domains, and limited to the
//     "Places UI Kit" API only. Never reuse the server key here.
// ─────────────────────────────────────────────────────────────────────────

const MAPS_JS_SRC = "https://maps.googleapis.com/maps/api/js";

let loaderPromise: Promise<void> | null = null;

/** Set by Google's own gm_authFailure callback, which fires when the key is
 *  rejected - wrong referrer restriction, API not enabled, billing off.
 *  This is the single most likely failure on a first deploy, and it is NOT
 *  observable any other way: the custom elements still upgrade and still
 *  take up space, so a panel measuring its own height would call a rejected
 *  request "ready" and show an empty box (second-pass review, 31 Aug 2026). */
let authFailed = false;

export function googleAuthFailed(): boolean {
  return authFailed;
}

/** True when a browser key is configured. Callers use this to hide the
 *  live-details affordance entirely rather than offering a button that
 *  can only fail - matches the site's "honest empty state over broken
 *  feature" convention. */
export function hasGoogleMapsBrowserKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY);
}

/** Loads the Maps JS API and waits for the Places UI Kit custom elements
 *  to be defined. Safe to call repeatedly - the work happens once and
 *  every later caller awaits the same promise. */
export function loadPlacesUiKit(): Promise<void> {
  if (loaderPromise) return loaderPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) {
    loaderPromise = Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY"));
    return loaderPromise;
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    // Deliberately a plain <script> rather than Google's inlined
    // bootstrap snippet: we need exactly one library ("places") and one
    // callback, and the minified bootstrap is unreadable in a codebase
    // where every other integration is explicit.
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__dramstoryMapsReady",
    });

    const w = window as unknown as Record<string, unknown>;
    w.gm_authFailure = () => {
      authFailed = true;
    };
    w.__dramstoryMapsReady = () => {
      // The custom elements register slightly after the callback fires,
      // so wait for the specific tag we render rather than assuming.
      customElements
        .whenDefined("gmp-place-details")
        .then(() => resolve())
        .catch(reject);
    };

    const script = document.createElement("script");
    script.src = `${MAPS_JS_SRC}?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps JS API failed to load"));
    document.head.appendChild(script);
  });

  // A rejected promise must not be cached, or one transient failure - an ad
  // blocker, a dropped connection - poisons every later panel open for the
  // rest of the page session.
  loaderPromise.catch(() => {
    loaderPromise = null;
  });

  return loaderPromise;
}
