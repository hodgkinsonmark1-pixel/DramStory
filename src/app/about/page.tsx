import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us | DramStory",
  description:
    "Pete and Mark, five days on Islay in 2022, and the journey that became DramStory.",
};

/**
 * About Us (12 Sep 2026) - replaces the ComingSoon placeholder.
 *
 * Deliberately a static page, not Airtable content: this is the two of us,
 * not a Day, Distillery, Tour or Local Feature, so it has no golden-source
 * record to draw from and nothing here changes on the content cadence.
 *
 * Reuses the .journal-post-* classes rather than introducing a parallel set.
 * They are the site's long-form prose treatment - 720px measure, display
 * headings, copper meta - and an About page is the same shape of thing as
 * an article. Sharing them means this page cannot drift visually from the
 * Journal the next time that styling is touched.
 *
 * The <del>/<ins> pair in Pete's paragraph is a deliberate visible
 * self-correction joke ("almost" struck, replaced by "absolutely"). It uses
 * del/ins rather than <s> because that is what the markup is for, and it
 * carries .sr-only text (defined in dramstory-legacy.css) so a screen
 * reader hears the joke rather than "almost absolutely everything", which
 * is what plain strikethrough would produce.
 *
 * Requires: public/images/about/pete-and-mark-ardbeg.jpg
 */
export default function AboutPage() {
  return (
    <>
      <PageHeader />

      <article className="journal-post">
        <div className="journal-post-hero">
          <Image
            src="/images/about/pete-and-mark-ardbeg.jpg"
            alt="Pete and Mark outside the Ardbeg warehouse on Islay, July 2022"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        <div className="journal-post-content">
          <div className="journal-post-meta">Our story</div>
          <h1 className="journal-post-title">About us</h1>

          <div className="journal-post-body">
            <p>
              Two old friends. Five days on Islay. One journey that changed
              rather more than expected.
            </p>

            <p>
              We&rsquo;re Pete and Mark. We&rsquo;ve been friends for more than
              25 years, which is long enough to have accumulated a great many
              stories &mdash; and to know which of them become better with every
              retelling.
            </p>

            <p>
              Pete loves{" "}
              <del>
                almost<span className="sr-only">, correction:</span>
              </del>{" "}
              <ins>absolutely</ins> everything about whisky: where it comes
              from, how it is made, the history and lore surrounding it, and,
              naturally, what it tastes like. Mark loves to travel. Islay gave
              us both rather more than we had bargained for.
            </p>

            <p>
              We came for five days on what we called our{" "}
              <Link href="/journeys/islay-grand-tour">Islay Grand Tour</Link>:
              the ambitious journey around an island containing an improbable
              number of distilleries, some astonishingly beautiful landscapes
              and roads that make distances on a map largely theoretical.
            </p>

            <p>
              The whisky was extraordinary. Of course it was. But it
              wasn&rsquo;t only the whisky that stayed with us.
            </p>

            <p>
              It was the wild race for the ferry, and the Spotify playlist that
              became the soundtrack to the trip &mdash;{" "}
              <em>Sunshine on Leith</em> earning its place amongst the otherwise
              pure rock as we drove through the wilderness. Cosy evenings in{" "}
              <Link href="/explore/port-ellen-beach">Port Ellen</Link> and a
              frantic invented game of darts at No. 1 Charlotte Street. An
              unexpectedly competitive game of boules on the beach. Swimming at{" "}
              <Link href="/explore/machir-bay">Machir Bay</Link>, which was as
              beautiful as anywhere we have been, although the Atlantic made a
              persuasive case that we were definitely still in Scotland.
            </p>

            <p>And then there were the quieter moments.</p>

            <p>
              At <Link href="/explore/kildalton-cross">Kildalton Cross</Link>{" "}
              and its old churchyard, both of us parents and husbands, we found
              ourselves reading gravestones belonging to people who had outlived
              not only their children, but their grandchildren. Two generations
              of one family, gone before them. Standing there, among centuries
              of island lives, we were grown men with tears on our cheeks.
            </p>

            <p>
              That is the thing about Islay. A visit might begin with a list of
              distilleries, but the island has other plans for you. Its history
              is not safely packed away in a visitor attraction; it sits beside
              the road, in ruined churches and working harbours, in family names
              and old stones. Islay is not a whisky theme park. It is a living
              island that makes some of the world&rsquo;s most remarkable whisky
              &mdash; and remains itself when the last visitor has caught the
              ferry home.
            </p>

            <p>Those five days moved us enough to begin DramStory.</p>

            <p>
              They also showed us how much harder the planning was than it
              needed to be. Pete did all of it, and it took the best part of a
              month: opening hours scattered across a dozen websites, half of
              them out of date, tours for July selling out in February.
            </p>

            <p>
              So we built what we had wanted before we went. Not simply to tell
              you what to drink, but to help you work out where to go, how to
              get there and what might be worth stopping for along the way
              &mdash; across both Islay and Jura.
            </p>

            {/* Restored 16 Sep 2026. Cut from v4 for length, and the second-
                pass review called losing it the costliest edit on the page:
                without it nothing here says what DramStory actually DOES.
                "Help you work out where to go" describes a guidebook or a
                blog just as well. This is the only sentence that does not. */}
            <p>
              Tell it what matters to you &mdash; distilleries, beaches, walks,
              somewhere good to eat &mdash; and it lays the days out end to end.
            </p>

            <p>
              That first journey led to others, and in turn to a book about
              whisky travel, now close to publication.
            </p>

            <p>
              We hope DramStory helps you plan a proper trip. More than that, we
              hope the island gives you a few moments that become entirely your
              own &mdash; the kind you will still enjoy retelling in twenty-five
              years.
            </p>

            <p>
              <strong>Pete &amp; Mark</strong>
              <br />
              <em>Founders of DramStory</em>
            </p>

            {/* The photo credit, last, as the approved copy places it. It is
                the only thing v4 carried that the recovered page did not -
                the commit it was in was dropped by a rebase on 11 Sep and
                rebuilt by hand from the working tree, which had the body
                but not this line. */}
            <p className="about-photo-credit">
              Photo: Pete and Mark at{" "}
              <Link href="/distilleries/ardbeg">Ardbeg</Link>, on the journey
              that started DramStory.
            </p>
          </div>

          <Link href="/" className="journal-post-back">
            &larr; Plan a journey
          </Link>
        </div>
      </article>

      <Footer />
    </>
  );
}
