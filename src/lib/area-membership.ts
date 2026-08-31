import type { Distillery } from "@/lib/types";
import { DREAM_AREAS, type DreamArea } from "@/lib/dream-areas";

/**
 * Works out which distilleries belong to each of the four areas, and
 * where each area's centre is, FROM THE DATA rather than from a list
 * written by hand (31 Aug 2026, Mark: "the information needs to be
 * dynamic about the distilleries in each area, as more open").
 *
 * WHY THIS EXISTS. DREAM_AREAS.distilleries is a hardcoded array of
 * names. It was correct on the day it was written and it is correct
 * today, but it has no way of knowing that Portintruan and Laggan Bay
 * are already sitting in the Distilleries table waiting to open, and no
 * way of noticing the next one. Anything driven off that array would
 * quietly under-count the island from the moment a distillery starts
 * taking visitors.
 *
 * The Distilleries table already carries the answer: every record has a
 * Region, and /journeys/[slug] already trusts it enough to count the
 * island's distilleries by excluding `region === "Jura"`. So membership
 * is derived from Region, and the only thing written by hand here is
 * which Regions make up which area - four lines that change roughly
 * never, instead of a name list that changes every time the island does.
 *
 * WHAT IS AND IS NOT DERIVED. The distilleries in an area, the count,
 * and the centroid are all computed. The area's NAME and its editorial
 * description are not - those are voice, and a new distillery opening in
 * the west does not rewrite what the west is like.
 */

/** Which Distillery.Region values make up each area, keyed by
 *  DREAM_AREAS id.
 *
 *  "Port Ellen" is its own Region in Airtable rather than part of "South
 *  Islay", which is why the south takes two: the Port Ellen distillery
 *  sits on the same shore as Laphroaig, Lagavulin and Ardbeg and belongs
 *  with them, whatever the table calls it.
 *
 *  Jura is deliberately absent. It is a different island, it is not one
 *  of the four moods, and DREAM_AREAS' own comment says so. A Jura
 *  distillery therefore falls into no area and is excluded rather than
 *  quietly widening the north east - see UNPLACED_REGIONS. */
const AREA_REGIONS: Record<string, string[]> = {
  "peated-south": ["South Islay", "Port Ellen"],
  "the-middle": ["Central Islay"],
  "the-west": ["West Islay"],
  "north-east": ["North Islay"],
};

/** Regions that are known to belong to no area, and are excluded on
 *  purpose. Kept explicit so the "unknown region" warning below can tell
 *  the difference between "Jura, as designed" and "someone added an East
 *  Islay and nothing renders it". */
const UNPLACED_REGIONS = new Set(["Jura"]);

/** How far a distillery can sit from its own area's centre before it is
 *  probably misfiled. The island is 25 miles end to end, so 12 miles is
 *  generous - it flags a record in the wrong region, not a remote one. */
const OUTLIER_MILES = 12;

const R_MILES = 3958.8;
export function milesApart(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R_MILES * 2 * Math.asin(Math.sqrt(h));
}

export interface AreaMembership {
  area: DreamArea;
  /** The distilleries in this area, from the records passed in - so
   *  whatever the caller filtered to (visitable only, on the homepage)
   *  is what gets counted and named.
   *
   *  Sorted alphabetically, deliberately. Geographic orders were tried
   *  and each one lies somewhere: sorting west to east gives the south
   *  its true road order (Port Ellen, Laphroaig, Lagavulin, Ardbeg) but
   *  reverses the north east, where the road runs Caol Ila, Ardnahoe,
   *  Bunnahabhain going north from Port Askaig. No single rule matches
   *  the roads in all four areas, and a list that looks like a route but
   *  isn't one is worse than a list that plainly claims nothing. */
  distilleries: Distillery[];
  /** Mean position of the distilleries above. Falls back to the area's
   *  own DREAM_AREAS coordinate when it has none with usable
   *  coordinates, so a brand-new area or a data gap still puts a marker
   *  somewhere sensible rather than at [0, 0] in the Atlantic. */
  centre: { lat: number; lng: number };
  /** True when `centre` is the DREAM_AREAS fallback rather than computed
   *  from real records. Lets a caller decide not to draw an area that
   *  has nothing in it. */
  centreIsFallback: boolean;
}

/**
 * @param distilleries whatever set the caller wants counted. The
 *   homepage passes getVisitableDistilleries(), so a distillery that is
 *   built but not yet open to visitors is correctly absent until the day
 *   its Airtable record says otherwise - which is the whole point.
 */
export function areaMembership(distilleries: Distillery[]): AreaMembership[] {
  const regionToArea = new Map<string, string>();
  for (const [areaId, regions] of Object.entries(AREA_REGIONS)) {
    for (const r of regions) regionToArea.set(r, areaId);
  }

  const byArea = new Map<string, Distillery[]>(DREAM_AREAS.map((a) => [a.id, []]));
  const unknownRegions = new Set<string>();

  for (const d of distilleries) {
    const areaId = regionToArea.get(d.region);
    if (areaId) {
      byArea.get(areaId)!.push(d);
    } else if (!UNPLACED_REGIONS.has(d.region)) {
      /* A Region nobody has mapped. Not an error - the distillery simply
         doesn't appear in any area - but it must be visible, because the
         failure mode is a real distillery silently missing from the
         homepage while every count around it still looks plausible. */
      unknownRegions.add(d.region || "(blank)");
    }
  }

  const result = DREAM_AREAS.map((area) => {
    const inArea = (byArea.get(area.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    const located = inArea.filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
    const centreIsFallback = located.length === 0;
    const centre = centreIsFallback
      ? { lat: area.lat, lng: area.lng }
      : {
          lat: located.reduce((s, d) => s + d.lat, 0) / located.length,
          lng: located.reduce((s, d) => s + d.lng, 0) / located.length,
        };
    return { area, distilleries: inArea, centre, centreIsFallback };
  });

  if (process.env.NODE_ENV !== "production") {
    if (unknownRegions.size > 0) {
      console.warn(
        `[areaMembership] Distillery Region value(s) not mapped to any area: ` +
          `${[...unknownRegions].join(", ")}. Those distilleries appear in no area on the ` +
          `homepage. Add the region to AREA_REGIONS, or to UNPLACED_REGIONS if that is intended.`,
      );
    }
    for (const m of result) {
      if (m.distilleries.length === 0) {
        console.warn(
          `[areaMembership] "${m.area.name}" has no distilleries in the set it was given. ` +
            `Its marker falls back to the DREAM_AREAS coordinate.`,
        );
        continue;
      }
      /* A record filed under the wrong Region would move an area's
         centre - and therefore its shape on the map - without anything
         looking broken. Laggan Bay, for instance, is filed West Islay
         but sits near Bowmore; the day it opens to visitors this will
         say so rather than letting the west quietly stretch east. */
      for (const d of m.distilleries) {
        const away = milesApart(m.centre, d);
        if (away > OUTLIER_MILES) {
          console.warn(
            `[areaMembership] ${d.name} is ${away.toFixed(1)} mi from the centre of ` +
              `"${m.area.name}", which it is filed under (Region: ${d.region}). Check the ` +
              `Region on that record - it is pulling the area's shape on the homepage map.`,
          );
        }
      }
    }
  }

  return result;
}
