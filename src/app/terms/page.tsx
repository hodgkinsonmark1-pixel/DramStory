import type { Metadata } from "next";
import LegalPage, { Detail } from "@/components/LegalPage";
import { LEGAL_DETAILS, LEGAL_READY } from "@/lib/legal-details";

export const metadata: Metadata = {
  title: "Terms of Use — DramStory",
  description: "The terms on which you use DramStory. We plan trips; we do not sell them.",
  robots: { index: LEGAL_READY, follow: LEGAL_READY },
};

export default function TermsOfUsePage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="We plan trips. We do not sell them — when you book, your contract is with the distillery, hotel or hire company, not with us."
    >
      <h2>1 &middot; Who these terms are with</h2>
      <p>
        DramStory is operated by {LEGAL_DETAILS.companyName}, company number{" "}
        <Detail value={LEGAL_DETAILS.companyNumber} />, registered in{" "}
        <Detail value={LEGAL_DETAILS.jurisdiction} /> at{" "}
        <Detail value={LEGAL_DETAILS.registeredAddress} />.
      </p>
      <p>
        By using dramstory.com you accept these terms. If you do not, please stop
        using the site.
      </p>

      <h2>2 &middot; You must be 18 or over</h2>
      <p>
        DramStory is about whisky and is intended for adults. By using this site
        you confirm you are 18 or over.
      </p>
      <p>
        Drink responsibly. If alcohol is causing you or someone you know
        difficulty, Drinkaware.co.uk has information and support.
      </p>

      <h2>3 &middot; What DramStory is &mdash; and what it is not</h2>
      <p>We plan trips. We do not sell them.</p>
      <p>
        <strong>We are not a travel agent, tour operator or booking agent.</strong>{" "}
        When you book a tour, a room or a car, your contract is with that
        distillery, hotel or hire company &mdash; not with us. We are not party to
        it and cannot resolve a dispute arising from it.
      </p>
      <p>
        That means we are not responsible for a tour being cancelled, a hotel
        being overbooked, a ferry not sailing, or a distillery being closed when
        you arrive.
      </p>

      <h2>4 &middot; Accuracy, and its limits</h2>
      <p>
        We take accuracy seriously. Tour times and prices come from each
        distillery&rsquo;s own website, are recorded with the date we checked, and
        are re-checked regularly.
      </p>
      <p>
        <strong>But things change, often at short notice</strong>, and a page here
        can be out of date without us knowing. Opening hours change seasonally.
        Tours sell out. Distilleries close for maintenance. Ferries do not sail in
        weather.
      </p>
      <p>
        <strong>Always confirm directly with the venue before you travel or spend
        money.</strong> Every distillery page links to the distillery&rsquo;s own
        site for exactly this reason. Where a price is older than we are willing
        to stand behind, we say so rather than quoting it.
      </p>
      <p>
        Drive times are estimates on single-track island roads. Treat them as a
        guide.
      </p>

      <h2>5 &middot; Your trip</h2>
      <p>
        The trip you build is yours. We claim no ownership of the choices you make
        or the notes you write.
      </p>
      <p>
        <strong>Your trip is stored in your browser and is not backed up.</strong>{" "}
        Clearing your browser data deletes it and we cannot recover it, because we
        never had a copy.
      </p>

      <h2>6 &middot; What you may and may not do</h2>
      <p>Please do use the site, plan trips, and share what you plan.</p>
      <p>Please do not:</p>
      <ul>
        <li>
          Copy our written content, photography or itineraries for a competing
          service
        </li>
        <li>Scrape the site or make automated requests at volume</li>
        <li>Try to break, overload or gain unauthorised access to it</li>
        <li>Use it for anything unlawful</li>
      </ul>

      <h2>7 &middot; Our content, and other people&rsquo;s</h2>
      <p>Written content and itineraries are ours or licensed to us.</p>
      <p>
        Photography is credited where it appears. Much of it is Creative Commons
        and carries an attribution requirement we honour on each image. Map data
        is OpenStreetMap, &copy; OpenStreetMap contributors, ODbL.
      </p>
      <p>
        Distillery names and trade marks belong to their owners. We use them to
        say what a place is. Nothing here implies endorsement or affiliation, and
        DramStory Ltd is not affiliated with any distillery unless stated.
      </p>

      <h2>8 &middot; Affiliate links</h2>
      <p>
        Some links earn us a commission at no extra cost to you. This does not
        influence what we recommend. See our{" "}
        <a href="/affiliate-disclosure">Affiliate Disclosure</a>.
      </p>

      <h2>9 &middot; Liability</h2>
      <p>
        Nothing here limits liability for death or personal injury caused by
        negligence, for fraud, or for anything else that cannot lawfully be
        limited. Nothing here affects your statutory rights as a consumer.
      </p>
      <p>Subject to that, and because this is a free information service:</p>
      <ul>
        <li>
          The site is provided <strong>as is</strong>. We do not guarantee it is
          accurate, complete or continuously available.
        </li>
        <li>
          We are not liable for loss arising from relying on information here
          &mdash; a missed tour, a wasted journey, a closed distillery.
        </li>
        <li>We are not liable for loss of a trip you have built.</li>
      </ul>

      <h2>10 &middot; Privacy</h2>
      <p>
        See our <a href="/privacy">Privacy Policy</a> and{" "}
        <a href="/cookies">Cookie Policy</a>.
      </p>

      <h2>11 &middot; Changes</h2>
      <p>
        We may update these terms. The date at the top shows when. Significant
        changes will be flagged on the site.
      </p>

      <h2>12 &middot; Law</h2>
      <p>
        These terms are governed by the law of{" "}
        <Detail value={LEGAL_DETAILS.jurisdiction} />, and its courts have
        exclusive jurisdiction. If you are a consumer this does not remove the
        protection of the law where you live.
      </p>

      <h2>13 &middot; Contact</h2>
      <p>
        <Detail value={LEGAL_DETAILS.contactEmail} />
      </p>
    </LegalPage>
  );
}
