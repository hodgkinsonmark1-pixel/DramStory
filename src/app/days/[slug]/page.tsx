import { notFound } from "next/navigation";
import {
  getDays,
  getDayBySlug,
  getLocalFeatures,
  getAreas,
  getFeaturedStays,
  getJourneyBySlug,
} from "@/lib/data";
import { journeyBaseFor } from "@/lib/journey-derivations";
import type { DayBase } from "@/lib/day-derivations";
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
 * ?journey=SLUG (17 Aug 2026) says "I got here from this Journey's page",
 * which is the only thing that gives an un-added Day a bed to start and
 * end at - the Journey states its Base, the Day doesn't. Without it this
 * page keeps its existing, honest behaviour: no base, the clock starts at
 * the first stop, and the travel figure says "between stops". A Day can
 * appear in more than one Journey from different bases, so the base is
 * never inferred from the Day alone. An unknown or mismatched slug is
 * ignored rather than guessed at.
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
  searchParams: Promise<{ trip?: string; journey?: string }>;
}) {
  const [{ slug }, { trip, journey: journeySlug }] = await Promise.all([params, searchParams]);
  const [day, localFeatures] = await Promise.all([getDayBySlug(slug), getLocalFeatures()]);
  if (!day) notFound();

  // Deliberately strict: anything that isn't a non-negative integer is
  // treated as no answer at all rather than coerced (Number("") is 0,
  // which would silently mean "trip day 1").
  const tripParam = trip != null && /^\d+$/.test(trip) ? Number(trip) : null;

  const journeyBase = journeySlug ? await resolveJourneyBase(journeySlug, slug) : undefined;

  return (
    <>
      <PageHeader />
      <DayScreen day={day} localFeatures={localFeatures} tripParam={tripParam} journeyBase={journeyBase} />
      <Footer />
    </>
  );
}

/**
 * The Base of `journeySlug`, positioned at whichever of its days is this
 * one - carrying the routed base legs stored on that Journey Day. Returns
 * undefined for a journey that doesn't exist, doesn't contain this day,
 * or names no Base: all three mean "we don't know where you're sleeping",
 * and the page then behaves exactly as it does with no ?journey= at all.
 *
 * Coordinates (the per-leg fallback for a leg that was never routed) are
 * resolved Base Stay first, then Areas, then a Featured Stay matched on
 * the Base text - the same order scripts/compute-journey-base-legs.mjs
 * uses, so an estimated leg starts from the same door a routed one did.
 * Bridgend has no Areas record but Bridgend Hotel sits in it.
 */
async function resolveJourneyBase(journeySlug: string, daySlug: string): Promise<DayBase | undefined> {
  const journey = await getJourneyBySlug(journeySlug);
  if (!journey || !journey.base) return undefined;
  const dayIndex = journey.days.findIndex((d) => d.slug === daySlug);
  if (dayIndex === -1) return undefined;

  const [areas, stays] = await Promise.all([getAreas(), getFeaturedStays()]);
  const wanted = journey.base.toLowerCase();
  const baseStay = journey.baseStayId ? stays.find((s) => s.id === journey.baseStayId) : undefined;
  const area = areas.find((a) => a.name.toLowerCase() === wanted);
  const namedStay = stays.find(
    (s) => (s.nearestArea ?? "").toLowerCase().startsWith(wanted) || s.name.toLowerCase().startsWith(wanted)
  );
  const coords = baseStay ?? area ?? namedStay;

  // The journey's authored transfer origin first, when it has one - the
  // same precedence scripts/compute-journey-base-legs.mjs uses, so a leg
  // this page has to estimate is estimated from the point the routed legs
  // were measured from rather than from a centroid a few hundred metres
  // away. Everything else falls through unchanged.
  const origin =
    journey.transferOriginLat !== undefined && journey.transferOriginLng !== undefined
      ? { lat: journey.transferOriginLat, lng: journey.transferOriginLng }
      : coords
        ? { lat: coords.lat, lng: coords.lng }
        : undefined;

  return journeyBaseFor(journey, dayIndex, origin);
}
