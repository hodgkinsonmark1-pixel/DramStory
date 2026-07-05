"use client";

/**
 * Full-bleed background video, reused across the homepage Hero and all
 * three journey intake screens (Q2, trip length, Q3) for a consistent
 * immersive feel.
 *
 * Deliberately self-hosted rather than hotlinked to a third-party stock
 * site — the previous hero video pointed directly at mixkit.co's CDN and
 * started returning 503s once that asset moved/aged out. Point this at a
 * file you've downloaded (under that site's free license) and placed at
 * /public/videos/hero.mp4 so it's served reliably from Vercel's own CDN
 * instead of depending on someone else's server staying up.
 *
 * If the file is missing, the poster image still shows and the layout
 * doesn't break — it just won't animate until the file is added.
 */
export default function BackgroundVideo({ className = "hero-video" }: { className?: string }) {
  return (
    <video
      className={className}
      autoPlay
      muted
      loop
      playsInline
      poster="https://images.pexels.com/videos/13610011/alcohol-bar-drink-drinks-13610011.jpeg?auto=compress&cs=tinysrgb&w=1920"
    >
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  );
}
