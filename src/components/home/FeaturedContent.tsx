import Link from "next/link";
import type { Distillery } from "@/lib/types";

/** Picks up to 4 distilleries favoring style variety (one heavily peated,
 *  one unpeated, etc.) rather than just the first 4 alphabetically. */
function pickHighlighted(distilleries: Distillery[]): Distillery[] {
  const seenStyles = new Set<string>();
  const picked: Distillery[] = [];
  for (const d of distilleries) {
    if (picked.length >= 4) break;
    if (!seenStyles.has(d.style)) {
      seenStyles.add(d.style);
      picked.push(d);
    }
  }
  for (const d of distilleries) {
    if (picked.length >= 4) break;
    if (!picked.includes(d)) picked.push(d);
  }
  return picked;
}

export default function FeaturedContent({ distilleries }: { distilleries: Distillery[] }) {
  const highlighted = pickHighlighted(distilleries);

  return (
    <section className="featured-section">
      <div className="how-eyebrow">Featured</div>
      <h2 className="how-title">Get to know Islay</h2>

      <div className="featured-col-title">Highlighted distilleries</div>
      <div className="featured-distilleries-grid">
        {highlighted.map((d) => (
          <Link href={`/distilleries/${d.slug}`} className="featured-distillery-card" key={d.slug}>
            <div className="featured-distillery-image" style={{ backgroundImage: `url(${d.image})` }} />
            <div className="featured-distillery-name">{d.name}</div>
            <div className="featured-distillery-style">{d.style}</div>
          </Link>
        ))}
      </div>

      <div className="featured-col-title">From the journal</div>
      <div className="featured-coming-soon">
        <p>The DramStory Journal launches soon with distillery stories, travel tips, and craft itineraries.</p>
        <Link href="/journal" className="featured-coming-soon-link">
          Get notified &rarr;
        </Link>
      </div>

      <div className="featured-col-title">What visitors say</div>
      <div className="featured-coming-soon">
        <p>We&rsquo;re just getting started — real traveller stories will appear here once the first trips are booked.</p>
      </div>
    </section>
  );
}
