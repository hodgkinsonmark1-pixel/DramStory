import Link from "next/link";
import Logo from "./Logo";

interface SiteHeaderProps {
  /** Transparent overlay style for video/hero backgrounds (white text).
   *  Solid style (off-white background, dark text) otherwise. */
  transparent?: boolean;
  logoSize?: number;
}

/**
 * The site's primary nav — logo + Login / Distilleries / Journal / Contact.
 * Used on the homepage hero and the three journey intake screens (Q2, trip
 * length, Q3), which is where a consistent header actually matters most —
 * the workspace and distillery pages keep their own specialised headers.
 */
export default function SiteHeader({ transparent = false, logoSize = 44 }: SiteHeaderProps) {
  const navClass = transparent ? "hero-nav" : "journey-nav";
  const linksClass = transparent ? "hero-nav-links" : "journey-nav-links";
  const textColor = transparent ? "white" : "var(--dark)";

  return (
    <nav className={navClass}>
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
      <div className={linksClass} style={!transparent ? { display: "flex", gap: 28 } : undefined}>
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
    </nav>
  );
}
