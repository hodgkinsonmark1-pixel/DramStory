/**
 * Static image background - temporary stand-in for BackgroundVideo.
 *
 * The video was reloading/restarting on every question-screen transition
 * (Hero -> Q2 -> Step 3 -> Q4), since each screen mounts its own <video>
 * element and React unmounts/remounts it on navigation. Fixing that
 * properly (e.g. a persistent video layer that survives across screens)
 * is parked for later - swapping to a static image in the meantime avoids
 * the jarring reload with zero risk of a half-fixed video bug.
 *
 * Same still frame as the video's poster, so visually nothing changes
 * apart from motion. Swap back to <BackgroundVideo /> once the
 * persistence issue is solved - same className prop, same usage sites.
 */
export default function BackgroundImage({ className = "hero-video" }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage:
          "url(https://images.pexels.com/videos/13610011/alcohol-bar-drink-drinks-13610011.jpeg?auto=compress&cs=tinysrgb&w=1920)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
