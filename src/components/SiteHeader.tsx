import Link from "next/link";
import Logo from "./Logo";

interface SiteHeaderProps {
  /** Transparent overlay style for video/hero backgrounds (white text).
   *  Solid style (off-white background, dark text) otherwise. */
  transparent?: boolean;
  logoSize?: number;
  /** Hides the logo half of the nav - used by Hero's state-two right
   *  column (docs/hero-handoff.md §2.2: "Nav moves into the right
   *  column"), which renders a SECOND SiteHeader for just the links,
   *  since the logo itself stays pinned over the narrowed video on the
   *  left. Defaults true (every existing call site keeps showing it). */
  showLogo?: boolean;
  /** Hides the links half - the left panel's own SiteHeader sets this to
   *  false once state two reveals, since the links have moved to the
   *  right panel's own SiteHeader instance. Defaults true. */
  showLinks?: boolean;
  /** The hero's right column has its own light, non-fixed, panel-scoped
   *  nav style - distinct from both `transparent` (absolute, white text,
   *  spans the full hero) and the plain solid variant (`journey-nav`,
   *  fixed, spans the full viewport) since neither fits a nav that only
   *  needs to sit at the top of one ~600-840px-wide scrollable column.
   *  Defaults false (every existing call site is unaffected). */
  panelStyle?: boolean;
  /** Overrides the five default destinations. Added 18 Aug 2026 for
   *  /journeys/[slug], whose build spec names its own nav (JOURNEYS ·
   *  DAY PLANS · DISTILLERIES · JOURNAL · LOGIN) and puts Login last
   *  rather than first. Every existing call site passes nothing and is
   *  unchanged - this is deliberately not a global nav rewrite, which
   *  would touch the homepage hero and all three intake screens. */
  links?: { href: string; label: string }[];
}

/* "Account", not "Login" (5 Sep 2026). The destination already adapts -
   /login redirects a signed-in visitor to /account - so the only thing
   that was wrong was the word, which told someone already signed in to
   sign in again.
 
   Deliberately NOT made session-aware. Reading the session here would
   either need a client component that swaps the label after mount (a
   visible flash of the wrong word on every page load) or a server read
   (which would force dynamic rendering on pages that are currently
   static or ISR - a real cost across the whole site to change one
   word). "Account" is honest in both states: signed out it is where you
   go to get one, signed in it is where yours lives. */
const DEFAULT_LINKS = [
  { href: "/login", label: "Account" },
  { href: "/distilleries", label: "Distilleries" },
  { href: "/journal", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

/**
 * The site's primary nav — logo + Account / Distilleries / Journal / Contact.
 * Used on the homepage hero and the three journey intake screens (Q2, trip
 * length, Q3), which is where a consistent header actually matters most —
 * the workspace and distillery pages keep their own specialised headers.
 */
export default function SiteHeader({
  transparent = false,
  logoSize = 44,
  showLogo = true,
  showLinks = true,
  panelStyle = false,
  links = DEFAULT_LINKS,
}: SiteHeaderProps) {
  const navClass = panelStyle ? "hero-right-nav" : transparent ? "hero-nav" : "journey-nav";
  const linksClass = panelStyle ? "hero-right-nav-links" : transparent ? "hero-nav-links" : "journey-nav-links";
  const textColor = transparent ? "white" : "var(--dark)";
  // Space-between only makes sense with both halves present - with just
  // one, it should sit at the end (links) or start (logo, though nothing
  // currently renders logo-only).
  const justify = showLogo && showLinks ? "space-between" : showLogo ? "flex-start" : "flex-end";

  return (
    <nav className={navClass} style={{ justifyContent: justify }}>
      {showLogo && (
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo size={logoSize} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 500,
              color: textColor,
            }}
          >
            DramStory
          </span>
        </Link>
      )}
      {showLinks && (
        <div className={linksClass} style={!transparent && !panelStyle ? { display: "flex", gap: 28 } : undefined}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={
                !transparent
                  ? {
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.03em",
                      color: "var(--peat)",
                      textDecoration: "none",
                    }
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
