import TripDayRedirect from "./TripDayRedirect";

/**
 * COMPATIBILITY REDIRECT, 16 Aug 2026. This route used to be one of two
 * pages rendering a Day; /days/[slug] is now the only one (see that
 * page's own comment). Old links and bookmarks still work: this sends
 * /trip/day/N to /days/{slug}?trip=N, where the slug comes from that
 * trip day's own sourceHubDaySlug.
 *
 * It has to redirect on the CLIENT, not in this server component or a
 * next.config rewrite: the mapping from a positional trip index to a Day
 * slug only exists in the visitor's own localStorage trip, which the
 * server cannot see. Hence the small client component below.
 */
export const dynamic = "force-dynamic";

export default async function TripDayPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = await params;
  return <TripDayRedirect index={Number(index)} />;
}
