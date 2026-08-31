import Link from "next/link";
import type { HubDay, JournalPost, Practicality } from "@/lib/types";
import { spellCount } from "@/lib/journey-derivations";

/**
 * "Before you go" - rebuilt 30 Aug 2026 to Mark's mockup, replacing
 * TripEssentials on the homepage. Three numbered cards on navy: the two
 * things that catch people out before they arrive, and the question every
 * group asks once they're here.
 *
 * SPLIT, on Mark's call. The editorial - what is actually true about
 * Islay and will still be true in five years - is written here. The
 * perishable half is in the Practicalities table: hire firms, taxi
 * guides, collection points. If it could be wrong in six months without
 * anyone touching the site, it is not in this file.
 *
 * The no-car count is COMPUTED from the same Transport Clause test the
 * day plans section uses, so the two cannot disagree. The mockup said
 * "four of the fifteen"; it is five of sixteen today and will be whatever
 * it is tomorrow.
 */

/** Same rule as HomeDayPlans: a Transport Clause that starts with "car"
 *  means a car, anything else does not. One test, imported by neither -
 *  it is four lines and duplicating it here is safer than exporting a
 *  homepage helper into a second homepage component and pretending that
 *  is shared logic. If it ever grows, move it to day-derivations. */
function isCarFree(day: HubDay): boolean {
  const clause = (day.transportClause ?? "").trim().toLowerCase();
  return !!clause && !clause.startsWith("car");
}

function LinkRow({ item }: { item: Practicality }) {
  const inner = (
    <>
      <span className="byg-link-name">
        {item.name}
        {/* Said out loud, in the same breath as the name. The two firms
            above this one pay us nothing, and the reader cannot tell
            which is which unless we say so. */}
        {item.affiliate && <span className="byg-affiliate">we earn a commission</span>}
      </span>
      {item.note && <span className="byg-link-note">{item.note}</span>}
    </>
  );
  // No URL means no link. A row with nothing to point at still carries
  // its name and note, rather than becoming an anchor to nowhere.
  if (!item.url) return <li className="byg-link byg-link-flat">{inner}</li>;
  return (
    <li className="byg-link">
      <a
        href={item.url}
        target="_blank"
        // sponsored + nofollow on anything we are paid for. Search
        // engines ask for it, and it is the machine-readable half of the
        // label the reader sees below.
        rel={item.affiliate ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer"}
      >
        {inner}
      </a>
    </li>
  );
}

export default function BeforeYouGo({
  practicalities,
  days,
  journalPosts,
}: {
  practicalities: Practicality[];
  days: HubDay[];
  journalPosts: JournalPost[];
}) {
  const islayHire = practicalities.filter((p) => p.category === "Car hire on Islay");
  const mainlandHire = practicalities.filter((p) => p.category === "Car hire mainland");
  const taxis = practicalities.filter((p) => p.category === "Taxis and guides");

  const carFreeCount = days.filter(isCarFree).length;
  // The ferry piece by name rather than by position - journalPosts[0] is
  // whatever was published last, which is not necessarily about getting
  // here.
  const gettingHerePost = journalPosts.find((p) => /getting-to-islay/.test(p.slug));

  return (
    <section className="byg-section" id="before-you-go">
      <div className="byg-inner">
        <div className="byg-head">
          <div className="byg-eyebrow">The things that catch people out</div>
          <div className="byg-head-note">Three things worth knowing before you book anything</div>
        </div>
        <h2 className="byg-title">Before you go</h2>

        <div className="byg-grid">
          <article className="byg-card">
            <div className="byg-num">01</div>
            <h3 className="byg-card-title">Getting here</h3>
            <p className="byg-card-copy">
              Port Ellen&rsquo;s ferry terminal is closed until 2029 &mdash; that changes more than
              people expect, and car spaces go months ahead.
            </p>
            {gettingHerePost && (
              <Link className="byg-card-foot" href={`/journal/${gettingHerePost.slug}`}>
                <span className="byg-foot-eyebrow">From the blog</span>
                <span className="byg-foot-link">{gettingHerePost.title} &rarr;</span>
              </Link>
            )}
          </article>

          <article className="byg-card">
            <div className="byg-num">02</div>
            <h3 className="byg-card-title">Car hire</h3>
            <p className="byg-card-copy">
              Two small local firms, a fixed number of cars, and no mainland-sized fleet to fall back
              on.
            </p>
            {islayHire.length > 0 && (
              <ul className="byg-links">
                {islayHire.map((p) => (
                  <LinkRow key={p.id} item={p} />
                ))}
              </ul>
            )}
            {mainlandHire.length > 0 && (
              <>
                <p className="byg-card-copy byg-card-copy-tight">
                  Or bring one over &mdash; collect on the mainland and drive it onto the ferry.
                </p>
                <ul className="byg-links">
                  {mainlandHire.map((p) => (
                    <LinkRow key={p.id} item={p} />
                  ))}
                </ul>
              </>
            )}
          </article>

          <article className="byg-card byg-card-wide">
            <div className="byg-card-head">
              <span className="byg-num">03</span>
              <h3 className="byg-card-title">Somebody has to drive</h3>
            </div>
            <p className="byg-card-copy">
              It&rsquo;s the question every group asks and no whisky site answers. There are four
              honest answers, and none of them is &ldquo;don&rsquo;t worry about it&rdquo;.
            </p>
            <div className="byg-answers">
              <Link className="byg-answer" href="/distilleries">
                <span className="byg-answer-title">Drivers&rsquo; drams</span>
                {/* Deliberately not "most distilleries bottle it" - that is
                    a blanket policy claim no record on this site supports.
                    Asking is the advice we can stand behind. */}
                <span className="byg-answer-copy">
                  Ask when you book &mdash; several will bottle the driver&rsquo;s measure to take
                  away.
                </span>
              </Link>
              {taxis.map((t) => (
                <a
                  className="byg-answer"
                  key={t.id}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="byg-answer-title">Let someone else</span>
                  <span className="byg-answer-copy">
                    Island taxis and private guides &mdash; both need booking well ahead.
                  </span>
                </a>
              ))}
              <Link className="byg-answer" href="/days">
                <span className="byg-answer-title">Days without a car</span>
                <span className="byg-answer-copy">
                  {spellCount(carFreeCount).charAt(0).toUpperCase() + spellCount(carFreeCount).slice(1)}{" "}
                  of the {spellCount(days.length)} work on foot or by bus.
                </span>
              </Link>
              <Link className="byg-answer" href="/journeys/islay-grand-tour">
                <span className="byg-answer-title">Take turns</span>
                <span className="byg-answer-copy">
                  Build a trip where the driver rotates and nobody loses twice.
                </span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
