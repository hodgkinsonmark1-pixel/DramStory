import Link from "next/link";
import type { JournalPost } from "@/lib/types";
import { estimateReadMinutes } from "@/lib/journal-render";

export default function LatestJournal({ posts }: { posts: JournalPost[] }) {
  const latest = posts.slice(0, 3);

  return (
    <section className="discover-section">
      <div className="discover-header">
        <h2 className="how-title" style={{ marginBottom: 0 }}>
          From the <em>Journal</em>
        </h2>
        <Link href="/journal" className="discover-view-all">
          View all &rarr;
        </Link>
      </div>

      {latest.length > 0 ? (
        <div className="discover-grid">
          {latest.map((p) => (
            <Link href={`/journal/${p.slug}`} className="discover-card" key={p.id}>
              {p.heroImage && <div className="discover-card-image" style={{ backgroundImage: `url(${p.heroImage})` }} />}
              <div className="discover-card-body">
                <div className="discover-card-tag">
                  {p.category ?? "Journal"} &middot; {estimateReadMinutes(p.body)} min read
                </div>
                <div className="discover-card-name">{p.title}</div>
                <p className="discover-card-desc">{p.metaDescription}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="featured-coming-soon">
          <p>The first Journal stories are being written — travel tips, distillery deep-dives, and trip planning advice, coming soon.</p>
        </div>
      )}
    </section>
  );
}
