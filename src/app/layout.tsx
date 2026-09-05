import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Inter, Spectral, Instrument_Sans } from "next/font/google";
import { TripProvider } from "@/lib/trip-context";
import { BackgroundVideoProvider } from "@/lib/background-video-context";
import SiteBackgroundVideo from "@/components/SiteBackgroundVideo";
import TripSync from "@/components/TripSync";
import TripSavePrompt from "@/components/TripSavePrompt";
import "./globals.css";

// Brand typography, locked in the brand sheet:
// Display/headers -> Cormorant Garamond, Body/UI -> Inter
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// SECOND pair, 18 Aug 2026, added for /journeys/[slug] and used ONLY
// there. The build spec for that page names Spectral 600 for display and
// Instrument Sans for body/metadata/numerals; the first thing it asks is
// to check the live page's computed font-family "in case Spectral isn't
// loading at all". It wasn't - nothing in this project had ever loaded
// it, and every jr- heading was silently rendering in Cormorant
// Garamond. These two variables are deliberately NOT swapped in for
// --font-display/--font-body: the brand sheet still locks those for the
// rest of the site, and re-typesetting every other page is not what was
// asked for. journey-extra.css's jr- block is the only consumer.
//
// Spectral is loaded at 400/500/600 (the spec uses 600 for h1, day
// titles, section h2 and panel h3, and 400 for the running serif in the
// claim band). Instrument Sans is variable, so no weight list is needed;
// its numerals are what the spec actually wants it for - Spectral has no
// alternate figure set, and at 26px its 1 and 0 read as l and O.
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DramStory — Where Whisky Adventures Begin",
  description:
    "DramStory is the home for whisky lovers to craft their own unforgettable journeys. Plan your Islay whisky adventure with a drag-and-drop itinerary builder.",
  metadataBase: new URL("https://dramstory.com"),
  openGraph: {
    title: "DramStory — Where Whisky Adventures Begin",
    description:
      "Craft unforgettable dram stories. Plan your journey with friends. Discover distilleries you'll talk about forever.",
    url: "https://dramstory.com",
    siteName: "DramStory",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${spectral.variable} ${instrumentSans.variable}`}
    >
      <body>
        <BackgroundVideoProvider>
          <SiteBackgroundVideo />
          <TripProvider>
            {/* Renders nothing. Keeps a signed-in visitor's trip in their
                account, and does nothing at all when signed out - see
                TripSync. Inside TripProvider because it reads the trip. */}
            <TripSync />
            {children}
            {/* Watches the trip, not the buttons - so every one of the
                twelve components that can add a stop is covered, and so
                is the thirteenth. Slim, dismissible, blocks nothing. */}
            <TripSavePrompt />
          </TripProvider>
        </BackgroundVideoProvider>

        {/* PLAUSIBLE (4 Sep 2026). Cookieless, aggregate-only, EU-hosted -
            which is the whole reason this site carries no consent banner.
            The no-banner position rests on the ICO's statistical purposes
            exception and its conditions are recorded in
            docs/legal/cookie-policy.md. Do not swap this for Google
            Analytics, and do not use it for advertising or retargeting,
            without reading that first: either would require consent and a
            banner.

            Optional measurements - outbound link clicks especially, which
            is how referral traffic to featured hotels is counted - are
            toggled in Plausible's own site settings on this new script
            format, NOT here. The snippet never needs changing for them.

            next/script rather than raw tags, per Next 16's scripts guide.
            Default afterInteractive strategy: analytics has no reason to
            block hydration. The inline init carries an id because Next
            requires one to track inline scripts. */}
        <Script
          src="https://plausible.io/js/pa-wEu2-1-tGCpWAwg564JiQ.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </body>
    </html>
  );
}
