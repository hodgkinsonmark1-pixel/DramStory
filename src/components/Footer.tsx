import Link from "next/link";
import { LEGAL_READY } from "@/lib/legal-details";
import Logo from "./Logo";
import { REGIONS } from "@/lib/journey-options";

export default function Footer() {
  const year = new Date().getFullYear();
  // MVP scope decision (21 July 2026, see business plan "Scope Decision:
  // Islay & Jura Only Until Complete"): no other region name should show
  // anywhere on the live site while only Islay & Jura is real. Previously
  // this list hardcoded a stub link per region regardless of readiness -
  // now driven off the same REGIONS/`live` data LocationStep and
  // FeaturedContent use, so the other regions are inactivated (not
  // deleted) here too, and each one's footer link reappears on its own
  // the moment its `live` flag flips, with no further edits needed here.
  const otherLiveRegions = REGIONS.filter((r) => r.live && r.id !== "islay");

  return (
    <>
      {/* The newsletter sits ABOVE the footer since 31 Aug 2026 (Mark's
          item 8), on its own light band rather than as the first block
          inside the dark footer. It stays in this component rather than
          moving to the homepage: Footer renders on every page, so
          lifting it into page.tsx would have quietly dropped the signup
          from every page except the homepage. Rendering it as a sibling
          of <footer> instead moves it everywhere at once. */}
      <section className="newsletter-band" aria-label="Newsletter signup">
        <div className="newsletter-card">
          <div className="newsletter-text">
            <div className="footer-newsletter-title">The DramStory Journal</div>
            <div className="footer-newsletter-sub">
              Whisky adventures, distillery stories and craft itineraries — delivered
              monthly. Where will your next adventure begin?
            </div>
          </div>
          <div className="footer-newsletter-row">
            <input className="footer-newsletter-input" type="email" placeholder="your@email.com" />
            <button className="footer-newsletter-btn">Subscribe</button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo" style={{ display: "flex", alignItems: "center" }}>
            <Logo size={40} light />
          </div>
          <p className="footer-tagline">
            Every great whisky adventure begins long before the first dram. Craft your
            story — we&apos;ll help you plan the rest.
          </p>
          {/* One account, because there is one account (19 Sep 2026,
              Mark's call). This was four emoji buttons - a camera, two
              faces, a play arrow - every one of them href="#". A dead
              social icon costs you the exact visitor who cared enough to
              look for you, and it costs them twice: once when nothing
              happens, and again when they conclude the rest of the site
              is the same. Facebook, X and YouTube go until they exist.

              The label is text rather than a glyph on purpose. Drawing
              Instagram's mark by hand would be reproducing a trademark,
              and the emoji it replaces was never the real icon anyway.
              Meta publishes the official SVG at brand.instagram.com -
              drop it in public/images/social/ and this becomes an
              <Image>, one line. */}
          <div className="footer-social">
            <a
              href="https://www.instagram.com/mydramstory/"
              className="footer-social-btn footer-social-btn-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Explore</div>
          <ul className="footer-links">
            <li><Link href="/">Plan a Journey</Link></li>
            <li><Link href="/distilleries">Islay Distilleries</Link></li>
            <li><Link href="/#classic-journeys">Classic journeys</Link></li>
            <li><Link href="/local-features">Local Features</Link></li>
            <li><Link href="/days">Day Plans</Link></li>
            {otherLiveRegions.map((r) => (
              <li key={r.id}><a href="#">{r.label}</a></li>
            ))}
          </ul>
        </div>

        <div>
          {/* Mark's slots, 19 Sep 2026, replacing four categories that
              described a content library the site does not have: Whisky
              Reviews, Travel Stories, Islay News, Planning Tips. These
              four do describe it - they were derived from the 27 Journal
              articles that actually exist.

              UNLINKED FOR NOW, DELIBERATELY. The Journal table has a
              Category field, but there is no route that can render a
              category and no /events page yet, and Mark is still setting
              the categories in Airtable. Following the same rule the
              legal block below has used since 4 Sep: a label with no link
              is honest about where you are; an href="#" is a promise the
              page breaks the moment it is clicked. The labels stay so the
              footer keeps its shape, and each becomes a Link the day its
              route exists. */}
          <div className="footer-col-title">Journal</div>
          <ul className="footer-links">
            <li><Link href="/journal">All Articles</Link></li>
            <li className="footer-link-pending">Trip Planning</li>
            <li className="footer-link-pending">Island Life</li>
            <li className="footer-link-pending">Place &amp; History</li>
            <li className="footer-link-pending">Distilleries</li>
            <li className="footer-link-pending">Events</li>
          </ul>
        </div>

        <div>
          {/* Three rows, not six (19 Sep 2026, Mark's call). Distillery
              Partners, Advertise and Press went: a two-person sole trader
              with no press office should not run a press page, and the
              other two advertised a commercial operation that does not
              exist yet. Six rows of which four were dead also made this
              column look like the biggest thing in the footer.

              Work With Us stays as a label rather than a link, for the
              same reason as the Journal slots above - Mark wants the row,
              there is no page behind it yet, and an href="#" would be
              worse than no link at all. */}
          <div className="footer-col-title">Company</div>
          <ul className="footer-links">
            <li><Link href="/about">About Us</Link></li>
            <li className="footer-link-pending">Work With Us</li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-legal">
          © {year} DramStory. All rights reserved.
          <br />
          {/* Real routes from 4 Sep 2026, but only linked once the pages
              are finished: LEGAL_READY gates this, and flipping that one
              flag also removes their noindex and their draft banner. A
              dead href="#" is bad; a live link to an unreviewed privacy
              policy is worse, because that is a representation to the
              visitor about what we do with their data. Until then the
              labels stay, unlinked, so the footer does not silently lose
              a row. */}
          {LEGAL_READY ? (
            <>
              <Link href="/privacy">Privacy Policy</Link> &nbsp;·&nbsp;{" "}
              <Link href="/terms">Terms of Use</Link> &nbsp;·&nbsp;{" "}
              <Link href="/cookies">Cookie Policy</Link> &nbsp;·&nbsp;{" "}
              <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>
            </>
          ) : (
            <>
              Privacy Policy &nbsp;·&nbsp; Terms of Use &nbsp;·&nbsp; Cookie
              Policy &nbsp;·&nbsp; Affiliate Disclosure
            </>
          )}
          <br />
          DramStory is not affiliated with any distillery unless stated. Drink
          responsibly. For information and support visit{" "}
          <a href="https://www.drinkaware.co.uk" target="_blank" rel="noreferrer">
            Drinkaware.co.uk
          </a>
          . Must be 18+ to purchase alcohol.
        </div>
        <div className="footer-badges">
          <span className="footer-badge">🏴󠁧󠁢󠁳󠁣󠁴󠁿 Made in Scotland</span>
          <span className="footer-badge">18+</span>
          <span className="footer-badge">Drink Aware</span>
        </div>
      </div>
    </footer>
    </>
  );
}
