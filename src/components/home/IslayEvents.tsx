import Link from "next/link";

/**
 * Matches the mockup's "Islay events & experiences" section placement and
 * header, but the mockup's specific event cards (Fèis Ìle days, a Kilchoman
 * harvest festival, etc.) aren't real data - the Events table in Airtable
 * is genuinely empty right now. Rather than fabricate specific dates and
 * prices that would look like real bookable events, this is an honest
 * "coming soon" state, same policy as the Journal/testimonials sections -
 * swap this for real event cards once Local Events actually has data.
 */
export default function IslayEvents() {
  return (
    <section className="discover-section">
      <div className="discover-header">
        <h2 className="how-title" style={{ marginBottom: 0 }}>
          Islay <em>events &amp; experiences</em>
        </h2>
      </div>

      <div className="featured-coming-soon">
        <p>
          Fèis Ìle dates, distillery masterclasses, and island festivals will appear here once we&rsquo;ve
          confirmed the current season&rsquo;s listings.
        </p>
        <Link href="/journal" className="featured-coming-soon-link">
          Get notified &rarr;
        </Link>
      </div>
    </section>
  );
}
