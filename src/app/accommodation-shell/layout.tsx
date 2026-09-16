import type { Metadata } from "next";

/**
 * Keeps /accommodation-shell out of search results (16 Sep 2026).
 *
 * WHY A LAYOUT AND NOT `export const metadata` ON THE PAGE: page.tsx is
 * a client component, and Next only reads a `metadata` export from a
 * server one. A layout is the smallest server component that can sit
 * above it, so this file exists for one line.
 *
 * WHY IT IS NEEDED AT ALL. The page is a prototype whose own heading
 * reads "UI SHELL — PLACEHOLDER TRACKING CODES". It was written as
 * "not linked from live navigation", which was true and not the same
 * thing as unreachable: it has been publicly served and indexable at
 * dramstory.com/accommodation-shell since it was built.
 *
 * It also offers Booking.com and Vrbo. There is no Booking.com affiliate
 * account (Mark, 16 Sep 2026), and the affiliate disclosure published in
 * this same deployment names Hotels.com and Discover Cars only. A public
 * page contradicting the disclosure is the problem this closes.
 *
 * NOINDEX IS A HOLDING FIX, not a decision. The page still serves, still
 * builds links with placeholder tracking codes, and still names two
 * suppliers the site has no relationship with. Finish it or delete it -
 * see docs/to-do.md.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccommodationShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
