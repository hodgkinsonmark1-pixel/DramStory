import Link from "next/link";

export default function FeaturedContent() {
  return (
    <section className="featured-section">
      <div className="how-eyebrow">Featured</div>
      <h2 className="how-title">Get to know Islay</h2>

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
