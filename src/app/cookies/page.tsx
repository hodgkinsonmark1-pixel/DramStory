import type { Metadata } from "next";
import LegalPage, { Detail } from "@/components/LegalPage";
import { LEGAL_DETAILS, LEGAL_READY } from "@/lib/legal-details";

export const metadata: Metadata = {
  title: "Cookie Policy — DramStory",
  description: "DramStory sets no cookies. What we store, and why you have not been asked to accept anything.",
  robots: { index: LEGAL_READY, follow: LEGAL_READY },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="We don't set any cookies. This page explains what that means, what we do store, and when other companies hear from you."
    >
      <h2>We don&rsquo;t set any cookies</h2>
      <p>
        Not a marketing line. DramStory sets no cookies. There is no advertising,
        no tracking across other websites, and nothing that follows you when you
        leave.
      </p>
      <p>That is why you have not been asked to accept anything. There is nothing to accept.</p>

      <h2>What we do store, and why</h2>
      <p>
        <strong>Your trip.</strong> The days, stops, dates and notes you build
        are saved in your own browser&rsquo;s storage. It stays on your device,
        is never sent to us, and we cannot read it. Clearing your browser data
        deletes it, and we cannot recover it for you.
      </p>
      <p>
        This is the only thing the planner needs in order to work at all, so it
        is treated as strictly necessary and does not require your consent.
      </p>

      <h2>Measuring how the site is used</h2>
      <p>
        We count visits using <strong>Plausible</strong>, a privacy-focused
        analytics service hosted in the EU. We do this to understand which pages
        people find useful and where the site is confusing &mdash; nothing else.
      </p>
      <ul>
        <li>
          <strong>No cookies.</strong> Nothing is stored on your device for this.
        </li>
        <li>
          <strong>No identifiers.</strong> We cannot tell one visitor from
          another, or recognise you on a later visit.
        </li>
        <li>
          <strong>Aggregate only.</strong> We can see that a page was read 412
          times. We cannot see that you read it.
        </li>
        <li>
          <strong>Never used for advertising</strong>, and never shared with
          advertisers.
        </li>
      </ul>
      <p>
        We also count how often links out to hotels and booking sites are
        clicked, in the same way &mdash; a total per link, with nothing recorded
        about who clicked it.
      </p>

      <h2>Third parties, and when they hear from you</h2>
      <p>
        Some features load content from other companies. When that happens your
        browser contacts them directly, so they see your IP address, and some may
        set their own cookies. We do not control that and we receive nothing from
        it.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Company</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Map tiles</td>
            <td>OpenStreetMap</td>
            <td>Whenever a map is shown</td>
          </tr>
          <tr>
            <td>Live opening hours and ratings on food and drink venues</td>
            <td>Google</td>
            <td>
              <strong>Only when you open one of those cards.</strong> Not on page
              load.
            </td>
          </tr>
          <tr>
            <td>Photography</td>
            <td>Airtable</td>
            <td>Never directly &mdash; images pass through our own server</td>
          </tr>
          <tr>
            <td>Hosting</td>
            <td>Vercel</td>
            <td>Every request, as standard server logs</td>
          </tr>
        </tbody>
      </table>
      <p>
        The Google card is the only place a third party is likely to set its own
        cookies, and it loads only if you choose to open it.
      </p>

      <h2>Affiliate links</h2>
      <p>
        Links to Hotels.com and Booking.com carry a code identifying DramStory as
        the referrer. Nothing is stored on your device by us. When you click one
        and arrive on their site, they may set their own cookies under their own
        policy &mdash; that is their storage on their domain, not ours. See our{" "}
        <a href="/affiliate-disclosure">Affiliate Disclosure</a>.
      </p>

      <h2>Managing storage yourself</h2>
      <p>
        Every browser lets you view and clear site storage, usually under
        Settings &rarr; Privacy. Clearing it for dramstory.com deletes your saved
        trip, which we cannot restore. Blocking storage will not stop you reading
        the site, but the planner will forget your trip between visits.
      </p>

      <h2>If this changes</h2>
      <p>
        If we ever add anything non-essential, this page will change and you will
        be asked first.
      </p>

      <h2>Questions</h2>
      <p>
        <Detail value={LEGAL_DETAILS.contactEmail} />
      </p>
    </LegalPage>
  );
}
