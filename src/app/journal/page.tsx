import Link from "next/link";
import Image from "next/image";
import { getJournalPosts } from "@/lib/data";
import { estimateReadMinutes } from "@/lib/journal-render";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Forced dynamic 21 July 2026 - same fix as /distilleries (see
// docs/technical-notes.md): this was silently prerendered fully static,
// so a newly published Journal post wouldn't show up here until the next
// deploy regenerated it, same class of bug that hid Port Ellen and Isle
// of Jura on the distilleries page.
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const posts = await getJournalPosts();

  if (posts.length === 0) {
    return (
      <ComingSoon
        eyebrow="Coming in a later phase"
        title="The DramStory Journal"
        note="The first stories are being written. This page will list them once they're published."
      />
    );
  }

  return (
    <>
      <PageHeader />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 300,
            color: "var(--dark)",
            marginBottom: 40,
          }}
        >
          Stories, tips &amp; trip planning
        </h1>

        <div className="journal-grid">
          {posts.map((p) => (
            <Link key={p.id} href={`/journal/${p.slug}`} className="journal-card">
              <div className="journal-card-image">
                {p.heroImage && <Image src={p.heroImage} alt={p.title} fill style={{ objectFit: "cover" }} unoptimized />}
              </div>
              <div className="journal-card-body">
                <div className="journal-card-meta">
                  {p.category ? `${p.category} · ` : ""}
                  {formatDate(p.publishedDate)} · {estimateReadMinutes(p.body)} min read
                </div>
                <h2 className="journal-card-title">{p.title}</h2>
                <p className="journal-card-excerpt">{p.metaDescription}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
