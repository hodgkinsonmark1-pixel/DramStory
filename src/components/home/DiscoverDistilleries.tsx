import Link from "next/link";
import type { Distillery } from "@/lib/types";

// Exact editorial curation + copy from the approved mockup, restored here -
// same 4 distilleries, same tags, same descriptions.
const EDITORIAL: Record<string, { tag: string; description: string }> = {
  ardbeg: { tag: "Editor's Pick", description: "The peatiest dram on Islay — and the most celebrated." },
  kilchoman: { tag: "Hidden Gem", description: "Islay's only farm distillery. Intimate, authentic, unmissable." },
  ardnahoe: { tag: "Newest Opening", description: "Opened 2019 — already turning heads with its unpeated spirit." },
  bunnahabhain: { tag: "Off the Beaten Track", description: "A wild road leads to one of Scotland's most dramatic settings." },
};

export default function DiscoverDistilleries({ distilleries }: { distilleries: Distillery[] }) {
  const featured = Object.keys(EDITORIAL)
    .map((slug) => distilleries.find((d) => d.slug === slug))
    .filter((d): d is Distillery => !!d);

  return (
    <section className="discover-section">
      <div className="discover-header">
        <h2 className="how-title" style={{ marginBottom: 0 }}>
          Discover <em>distilleries</em>
        </h2>
        <Link href="/distilleries" className="discover-view-all">
          View all &rarr;
        </Link>
      </div>

      <div className="discover-grid">
        {featured.map((d) => {
          const editorial = EDITORIAL[d.slug];
          return (
            <Link href={`/distilleries/${d.slug}`} className="discover-card" key={d.slug}>
              <div className="discover-card-image" style={{ backgroundImage: `url(${d.image})` }} />
              <div className="discover-card-body">
                <div className="discover-card-tag">{editorial.tag}</div>
                <div className="discover-card-name">{d.name}</div>
                <p className="discover-card-desc">{editorial.description}</p>
                <div className="discover-card-footer">
                  <span className="discover-card-meta">
                    {d.region} &middot; Est. {d.founded}
                  </span>
                  <span className="discover-card-link">Explore &rarr;</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
