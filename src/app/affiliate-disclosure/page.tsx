import type { Metadata } from "next";
import LegalPage, { Detail } from "@/components/LegalPage";
import { LEGAL_DETAILS, LEGAL_READY } from "@/lib/legal-details";

export const metadata: Metadata = {
  title: "Affiliate Disclosure — DramStory",
  description: "How DramStory makes money, and what it does not affect.",
  robots: { index: LEGAL_READY, follow: LEGAL_READY },
};

export default function AffiliateDisclosurePage() {
  return (
    <LegalPage
      title="Affiliate Disclosure"
      intro="Some links here earn us a commission. You pay the same price, and it does not change what we recommend."
    >
      <h2>How DramStory makes money</h2>
      <p>
        Some links on this site are affiliate links. If you book through one, we
        may receive a commission from the company you book with.{" "}
        <strong>You pay exactly the same price</strong> &mdash; the commission
        comes out of their margin, not your pocket.
      </p>
      <p>That is currently the only way this site earns anything.</p>

      <h2>Who we have arrangements with</h2>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>What for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hotels.com</td>
            <td>Accommodation</td>
          </tr>
          <tr>
            <td>Booking.com</td>
            <td>Accommodation</td>
          </tr>
        </tbody>
      </table>

      <h2>What this does not affect</h2>
      <p>This matters more than the disclosure itself, so it is worth being plain.</p>
      <ul>
        <li>
          <strong>We are not paid by any distillery</strong>, and no distillery
          pays to appear, to rank higher, or to be recommended. DramStory Ltd is
          not affiliated with any distillery unless we say so explicitly.
        </li>
        <li>
          <strong>Tour times and prices come from each distillery&rsquo;s own
          website</strong>, never from a third-party aggregator, and never from
          anyone who pays us.
        </li>
        <li>
          <strong>Nobody buys their way into an itinerary.</strong> Which
          distilleries appear in a day, and in what order, is decided by
          geography, opening hours and what makes a good day out.
        </li>
        <li>
          <strong>We recommend places we have no arrangement with</strong> &mdash;
          pubs, beaches, walks, restaurants, ferries &mdash; and always will.
        </li>
      </ul>
      <p>
        If a commercial arrangement ever changed what we recommend, this site
        would stop being worth using. That is a commercial argument as much as an
        ethical one.
      </p>

      <h2>Your data</h2>
      <p>
        Clicking an affiliate link takes you to that company&rsquo;s own website.
        What they collect there is governed by their privacy policy, not ours.
      </p>
      <p>
        The link carries a code identifying DramStory as the referrer. That code
        identifies <strong>us</strong>, not you &mdash; we do not learn who you
        are from it, and we receive no personal data back. We are told only that
        a booking happened. See our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Questions</h2>
      <p>
        <Detail value={LEGAL_DETAILS.contactEmail} />
      </p>
    </LegalPage>
  );
}
