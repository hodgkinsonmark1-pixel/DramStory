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
}

/**
 * The site's primary nav — logo + Login / Distilleries / Journal / Contact.
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
          <Link
            href="/login"
            style={
              !transparent
                ? { fontSize: 13, fontWeight: 500, letterSpacing: "0.03em", color: "var(--peat)", textDecoration: "none" }
                : undefined
            }
          >
            Login
          </Link>
          <Link
            href="/distilleries"
            style={
              !transparent
                ? { fontSize: 13, fontWeight: 500, letterSpacing: "0.03em", color: "var(--peat)", textDecoration: "none" }
                : undefined
            }
          >
            Distilleries
          </Link>
          <Link
            href="/journal"
            style={
              !transparent
                ? { fontSize: 13, fontWeight: 500, letterSpacing: "0.03em", color: "var(--peat)", textDecoration: "none" }
                : undefined
            }
          >
            Journal
          </Link>
          <Link
            href="/contact"
            style={
              !transparent
                ? { fontSize: 13, fontWeight: 500, letterSpacing: "0.03em", color: "var(--peat)", textDecoration: "none" }
                : undefined
            }
          >
            Contact
          </Link>
        </div>
      )}
    </nav>
  );
}
