import Image from "next/image";
import Link from "next/link";

/**
 * The founders' band, low on the homepage (18 Sep 2026).
 *
 * WHY IT EXISTS. "Who we are →" was a single link at the foot of the
 * cost block, so the story of the two people behind the site was a
 * footnote to a pricing panel. The About page is the strongest
 * trust-building thing on the site - Kildalton churchyard, twenty-five
 * years of friendship, a photo of two men outside Ardbeg - and nothing
 * pointed at it properly.
 *
 * WHY IT SITS HERE. Between Before you go and the newsletter, which is
 * the last thing before the footer. Nobody arrives wanting the founders'
 * story; they arrive wanting to plan a trip. But by this point they have
 * read the practical sections, and the question quietly changes from
 * "can this site help me" to "who is telling me this". That is the
 * moment the answer is worth having, and not before.
 *
 * WHY IT IS SMALL. It is a band, not a section: one photo, three
 * sentences, one link. The page's job is planning a trip and this is not
 * that job - it is the credential that makes the rest believable. Give it
 * a full section and it competes with the thing people came for.
 *
 * The copy is NOT lifted from the About page. A teaser that repeats the
 * page's own opening gives someone who clicks through the same sentences
 * twice, and the site's no-duplication rule exists for exactly that.
 * These lines say who and why; the page says what happened.
 */
export default function OurStory() {
  return (
    <section className="our-story" aria-labelledby="our-story-title">
      <div className="our-story-inner">
        <div className="our-story-photo">
          <Image
            src="/images/about/pete-and-mark-ardbeg.jpg"
            alt="Pete and Mark outside the Ardbeg warehouse on Islay, July 2022"
            fill
            sizes="(max-width: 860px) 100vw, 380px"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="our-story-text">
          <span className="our-story-eyebrow">Who&rsquo;s behind this</span>
          <h2 id="our-story-title" className="our-story-title">
            Two friends, five days, and a month of planning
          </h2>
          <p className="our-story-body">
            We&rsquo;re Pete and Mark. We came to Islay for five days in 2022
            and left with rather more than we&rsquo;d bargained for &mdash; and
            with the knowledge that Pete had spent the best part of a month
            working out where to go.
          </p>
          <p className="our-story-body">
            DramStory is the thing we wanted before we went.
          </p>
          <Link href="/about" className="our-story-link">
            Read our story &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
