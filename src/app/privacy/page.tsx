import type { Metadata } from "next";
import LegalPage, { Detail } from "@/components/LegalPage";
import { LEGAL_DETAILS, LEGAL_READY } from "@/lib/legal-details";

export const metadata: Metadata = {
  title: "Privacy Policy — DramStory",
  description: "What DramStory collects, which is almost nothing, and what we do with it.",
  robots: { index: LEGAL_READY, follow: LEGAL_READY },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="We collect as little as we can. Browsing this site requires no account and collects nothing that identifies you."
    >
      <h2>Who we are</h2>
      <p>
        DramStory is a whisky travel planning site for Islay and Jura, operated
        by {LEGAL_DETAILS.companyName}.
      </p>
      <ul>
        <li>
          <strong>Company:</strong> {LEGAL_DETAILS.companyName}, registered in{" "}
          <Detail value={LEGAL_DETAILS.jurisdiction} />, company number{" "}
          <Detail value={LEGAL_DETAILS.companyNumber} />
        </li>
        <li>
          <strong>Registered address:</strong>{" "}
          <Detail value={LEGAL_DETAILS.registeredAddress} />
        </li>
        <li>
          <strong>Contact:</strong> <Detail value={LEGAL_DETAILS.contactEmail} />
        </li>
        <li>
          <strong>ICO registration number:</strong>{" "}
          <Detail value={LEGAL_DETAILS.icoNumber} />
        </li>
      </ul>
      <p>
        We are the <strong>data controller</strong> for the personal data
        described here. That means we decide why it is collected and what happens
        to it, and we are accountable for it &mdash; including where other
        companies process it on our behalf.
      </p>

      <h2>The short version</h2>
      <p>
        Browsing DramStory requires no account and collects no personal data. The
        trip you build is stored <strong>in your own browser</strong>, not on our
        servers. We set no cookies, and our analytics cannot identify you.
      </p>

      <h2>What we collect, and why</h2>

      <h3>If you just use the site</h3>
      <p>
        <strong>Nothing that identifies you.</strong> No account, no cookies, no
        tracking pixels.
      </p>
      <p>
        Your trip &mdash; the days, stops and notes you build &mdash; is saved in
        your browser&rsquo;s own storage. We cannot read it. It does not leave
        your device. Clearing your browser data deletes it, and we cannot recover
        it for you.
      </p>

      <h3>Server logs</h3>
      <p>
        Our hosting provider, Vercel, records standard request information
        including IP addresses, for security and to keep the site running. We do
        not use these logs to build any profile of you.
      </p>

      <h3>Measuring how the site is used</h3>
      <p>
        We count visits using Plausible, a privacy-focused analytics service
        hosted in the EU, and we count how often links out to hotels and booking
        sites are clicked. No cookies, no identifier that would let us recognise
        you, and aggregate figures only.
      </p>
      <p>
        <strong>Lawful basis: legitimate interests</strong> &mdash; understanding
        whether a site works is a reasonable thing for its operator to do, and
        this is close to the lowest-impact way of doing it. You can object;
        contact us. See our <a href="/cookies">Cookie Policy</a> for detail.
      </p>

      <h2>Who else receives your data</h2>
      <p>
        We use a small number of other companies. They act on our instructions
        and cannot use your data for their own purposes.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Who</th>
            <th>What for</th>
            <th>What they receive</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel</td>
            <td>Hosting</td>
            <td>Request logs including IP address</td>
          </tr>
          <tr>
            <td>Plausible (EU-hosted)</td>
            <td>Counting visits and outbound clicks</td>
            <td>Page requested, referrer, country. No identifier, no cookie.</td>
          </tr>
          <tr>
            <td>Airtable</td>
            <td>Our own content &mdash; distilleries, tours, features</td>
            <td>
              Nothing about you. Images pass through our own server, so your
              browser never contacts Airtable directly.
            </td>
          </tr>
          <tr>
            <td>OpenStreetMap</td>
            <td>Map tiles</td>
            <td>Your IP address, when a map loads</td>
          </tr>
          <tr>
            <td>Google</td>
            <td>Live details on food and drink venues</td>
            <td>
              Your IP address and device information, only when you open one of
              those cards
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell your data. We do not share it with advertisers. Nobody
        pays us to put their product in front of you.
      </p>
      <p>
        <strong>Affiliate links</strong> to Hotels.com and Booking.com pass a
        tracking code that tells them the booking came from us. That code
        identifies <strong>us</strong>, not you. What those companies do with
        your data on their own sites is governed by their privacy policies. See
        our <a href="/affiliate-disclosure">Affiliate Disclosure</a>.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Your trip:</strong> until you clear it. We never see it.
        </li>
        <li>
          <strong>Server logs:</strong> as retained by our hosting provider.
        </li>
        <li>
          <strong>Analytics:</strong> aggregate counts only, with nothing that
          could be traced to a person.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>Under UK data protection law you can ask us to:</p>
      <ul>
        <li>Give you a copy of the personal data we hold about you</li>
        <li>Correct anything that is wrong</li>
        <li>Delete it</li>
        <li>Restrict or object to how we use it</li>
        <li>Port it &mdash; receive it in a machine-readable format</li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <Detail value={LEGAL_DETAILS.contactEmail} />. We will respond within one
        month.
      </p>
      <p>
        If you are unhappy with how we have handled your data you can complain to
        the Information Commissioner&rsquo;s Office at ico.org.uk or on 0303 123
        1113. We would rather you told us first, but you do not have to.
      </p>

      <h2>Children</h2>
      <p>
        DramStory is about whisky and is intended for adults. It is not directed
        at anyone under 18. We do not knowingly collect data from children. If
        you believe a child has given us their data, contact us and we will
        delete it.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. No system is perfectly secure. If a breach
        affects your rights we will tell the ICO within 72 hours, and you without
        undue delay.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date at the top. If the
        change is significant &mdash; new categories of data, a new purpose, a
        new processor &mdash; we will say so clearly.
      </p>
    </LegalPage>
  );
}
