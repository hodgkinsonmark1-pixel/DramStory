import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-newsletter">
        <div className="footer-newsletter-title">The DramStory Journal</div>
        <div className="footer-newsletter-sub">
          Whisky adventures, distillery stories and craft itineraries — delivered
          monthly. Where will your next adventure begin?
        </div>
        <div className="footer-newsletter-row">
          <input className="footer-newsletter-input" type="email" placeholder="your@email.com" />
          <button className="footer-newsletter-btn">Subscribe</button>
        </div>
      </div>

      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo" style={{ display: "flex", alignItems: "center" }}>
            <Logo size={40} light />
          </div>
          <p className="footer-tagline">
            Every great whisky adventure begins long before the first dram. Craft your
            story — we&apos;ll help you plan the rest.
          </p>
          <div className="footer-social">
            <a href="#" className="footer-social-btn" title="Instagram">📷</a>
            <a href="#" className="footer-social-btn" title="Facebook">👥</a>
            <a href="#" className="footer-social-btn" title="X / Twitter">🐦</a>
            <a href="#" className="footer-social-btn" title="YouTube">▶️</a>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Explore</div>
          <ul className="footer-links">
            <li><Link href="/">Plan a Journey</Link></li>
            <li><Link href="/distilleries">Islay Distilleries</Link></li>
            <li><a href="#">Speyside</a></li>
            <li><a href="#">Highland</a></li>
            <li><a href="#">Campbeltown</a></li>
            <li><a href="#">Lowland</a></li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title">Journal</div>
          <ul className="footer-links">
            <li><Link href="/journal">All Articles</Link></li>
            <li><a href="#">Whisky Reviews</a></li>
            <li><a href="#">Travel Stories</a></li>
            <li><a href="#">Islay News</a></li>
            <li><a href="#">Planning Tips</a></li>
            <li><a href="#">Events</a></li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title">Company</div>
          <ul className="footer-links">
            <li><Link href="/about">About Us</Link></li>
            <li><a href="#">Work With Us</a></li>
            <li><a href="#">Distillery Partners</a></li>
            <li><a href="#">Advertise</a></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><a href="#">Press</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-legal">
          © {year} DramStory Ltd. All rights reserved.
          <br />
          <a href="#">Privacy Policy</a> &nbsp;·&nbsp; <a href="#">Terms of Use</a> &nbsp;·&nbsp;{" "}
          <a href="#">Cookie Policy</a> &nbsp;·&nbsp; <a href="#">Affiliate Disclosure</a>
          <br />
          DramStory Ltd is not affiliated with any distillery unless stated. Drink
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
  );
}
