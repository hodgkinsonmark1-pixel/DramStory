import Link from "next/link";
import Logo from "./Logo";

/**
 * Standard content-page top bar — logo + wordmark, no nav links.
 *
 * Added 21 July 2026 to replace several near-identical but subtly
 * inconsistent inline headers (different padding, flex layout, and
 * explicit background between pages) on Distilleries, Local Features,
 * Journal (index + post), Days, Classic Journeys detail, Accommodation
 * Shell, and the Coming Soon placeholders — per Mark's header-consistency
 * review. Every one of those pages should now render exactly this, not a
 * copy-pasted variant of it.
 *
 * Deliberately NOT used on the homepage (SiteHeader's full nav — Login /
 * Distilleries / Journal / Contact) or on /journey (its own specialised
 * planner header with a date control and live workspace nav) — both do a
 * genuinely different job than a plain content page's header.
 */
export default function PageHeader() {
  return (
    <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--stone)" }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo size={32} withWordmark />
      </Link>
    </div>
  );
}
