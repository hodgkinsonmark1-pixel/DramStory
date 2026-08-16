import { notFound } from "next/navigation";
import { getDays, getDayBySlug, getLocalFeatures } from "@/lib/data";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import DayScreen from "@/components/journeys/DayScreen";

/**
 * A DAY - the one page that renders a Day (docs/days-trip-flow-handoff.md
 * §3.4). As of 16 Aug 2026 this is the ONLY one: /trip/day/[index] is now
 * a compatibility redirect here, and the two components that used to
 * render a Day differently (DayScreen for a trip day, JourneyDayDetail
 * for a published one) are merged into DayScreen. Same body either way;
 * the editing affordances are what's gated on whether the Day is in the
 * visitor's trip.
 *
 * ?trip=N disambiguates when the same Day has been added to the trip
 * more than once - it's a positional index into trip.days, the only thing
 * that tells two instances of one Day apart. Missing or stale, DayScreen
 * falls back to the first instance of this slug in the trip.
 *
 * JUDGEMENT CALL (unchanged from 13 Aug 2026): reads through
 * getDayBySlug() (ungated - see its own doc comment in
 * src/lib/data/index.ts) rather than getDays()' Status: Live-gated list,
 * because a Day reachable from inside a Journey can itself be Status:
 * Draft - gating this page the way /days' index gates its grid would 404
 * a day a Journey page just linked to. generateStaticParams still only
 * pre-builds the Live set; a Draft day's page renders correctly on
 * request thanks to `dynamic = "force-dynamic"`.
 */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const days = await getDays();
  return days.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const day = await getDayBySlug(slug);
  if (!day) return {};
  return {
    title: `${day.name} | DramStory`,
    description: day.hook || day.narrative.slice(0, 150),
  };
}

export default async function DayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trip?: string }>;
}) {
  const [{ slug }, { trip }] = await Promise.all([params, searchParams]);
  const [day, localFeatures] = await Promise.all([getDayBySlug(slug), getLocalFeatures()]);
  if (!day) notFound();

  // Deliberately strict: anything that isn't a non-negative integer is
  // treated as no answer at all rather than coerced (Number("") is 0,
  // which would silently mean "trip day 1").
  const tripParam = trip != null && /^\d+$/.test(trip) ? Number(trip) : null;

  return (
    <>
      <PageHeader />
      <DayScreen day={day} localFeatures={localFeatures} tripParam={tripParam} />
      <Footer />
    </>
  );
}
