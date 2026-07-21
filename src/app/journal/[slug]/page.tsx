import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getJournalPosts, getJournalPostBySlug } from "@/lib/data";
import { renderJournalBody, estimateReadMinutes } from "@/lib/journal-render";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";

export async function generateStaticParams() {
  const posts = await getJournalPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getJournalPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | DramStory Journal`,
    description: post.metaDescription,
  };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getJournalPostBySlug(slug);

  if (!post) notFound();

  const bodyHtml = renderJournalBody(post.body, post.inlineImages);

  return (
    <>
      <PageHeader />

      <article className="journal-post">
        {post.heroImage && (
          <div className="journal-post-hero">
            <Image src={post.heroImage} alt={post.title} fill style={{ objectFit: "cover" }} unoptimized priority />
          </div>
        )}

        <div className="journal-post-content">
          <div className="journal-post-meta">
            {post.category ? `${post.category} · ` : ""}
            {formatDate(post.publishedDate)} · {estimateReadMinutes(post.body)} min read
          </div>
          <h1 className="journal-post-title">{post.title}</h1>

          {/* Body is authored Markdown from Airtable (Mark's own content,
              not user-submitted), rendered server-side via marked - not
              user input, so this is the standard safe use of
              dangerouslySetInnerHTML for CMS-authored content. */}
          <div className="journal-post-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          <Link href="/journal" className="journal-post-back">
            &larr; Back to the Journal
          </Link>
        </div>
      </article>

      <Footer />
    </>
  );
}
