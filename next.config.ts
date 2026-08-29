import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // The Peated South journey was renamed from "The South Coast
        // Walk" to "The Kildalton Road" on 30 Aug 2026 (the owner's
        // call), which moved its slug. The journey itself is unchanged -
        // still the walkable one, still the same two days - so the old
        // URL is not gone, it moved, and a 301 is the honest status.
        //
        // Anything already published against the old path keeps working:
        // the Grand Tour's own "Make It Yours" rows link to it by slug,
        // and so may anything shared before today.
        source: "/journeys/south-coast-walk",
        destination: "/journeys/kildalton-road",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
