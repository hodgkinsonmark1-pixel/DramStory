import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
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
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
