/**
 * Islay's real coastline, simplified to an SVG path for the "four moods"
 * homepage section (31 Aug 2026).
 *
 * PROVENANCE. OpenStreetMap relation 558033 (Islay), pulled from the
 * Overpass API, ODbL-licensed - the same source and licence the site
 * already uses for its map pins, so this adds no new obligation. The raw
 * relation is 36 ways and 27,713 points; those were stitched into one
 * closed ring and reduced with Douglas-Peucker (epsilon 0.002328 deg) to
 * the 205 points below. The result's bounding box is
 * [-6.5257, 55.5791] to [-6.0198, 55.9378], which matches Islay's real
 * extent - 25.6 miles on its longest axis, 24.8 north to south.
 *
 * WHY A TRACED OUTLINE AND NOT A TILE MAP. DreamingMap.tsx already
 * renders real Leaflet tiles, and that is the right tool where a visitor
 * needs to locate themselves. This section is not that: it is four
 * character sketches, seen at a glance, above the fold-and-a-half. A
 * tile map would pull in Leaflet, its CSS and a network round-trip of
 * raster tiles for a picture nobody pans, and it would put every road,
 * label and neighbouring island into a graphic whose whole job is to
 * show four places and nothing else.
 *
 * WHY THE ZONES ARE DOTS AND NOT SHADED AREAS. There are no zone
 * boundaries. The four "moods" are an editorial grouping of distilleries
 * (see DREAM_AREAS in dream-areas.ts), not administrative or geographic
 * regions, and no boundary data exists for them in Airtable or anywhere
 * else. Drawing four tinted polygons would mean inventing lines on a map
 * of a real island and presenting the invention with the same authority
 * as the coastline around it - a visitor would reasonably read a shaded
 * edge as "the west ends here". Dots at real computed positions claim
 * exactly what is true: these four groups sit here.
 */

/** Simplified coastline, [longitude, latitude], closed ring. */
export const ISLAY_OUTLINE: [number, number][] = [
  [-6.0708, 55.6636], [-6.0657, 55.6624], [-6.0657, 55.6579], [-6.0578, 55.6595],
  [-6.0513, 55.6652], [-6.0584, 55.6646], [-6.0499, 55.6716], [-6.0374, 55.678],
  [-6.0377, 55.6737], [-6.0324, 55.6749], [-6.0198, 55.6848], [-6.0309, 55.6836],
  [-6.0231, 55.6884], [-6.0263, 55.6907], [-6.0249, 55.6958], [-6.0365, 55.6923],
  [-6.0306, 55.7013], [-6.0394, 55.7038], [-6.0405, 55.7097], [-6.0288, 55.7236],
  [-6.0339, 55.7307], [-6.0476, 55.7344], [-6.0529, 55.742], [-6.0469, 55.7636],
  [-6.0633, 55.7751], [-6.084, 55.7826], [-6.1041, 55.8129], [-6.106, 55.8192],
  [-6.1024, 55.8253], [-6.1053, 55.836], [-6.1015, 55.8404], [-6.1043, 55.8489],
  [-6.1202, 55.8823], [-6.1281, 55.8843], [-6.1321, 55.8897], [-6.1204, 55.9216],
  [-6.1201, 55.9344], [-6.1244, 55.9378], [-6.1626, 55.9335], [-6.1737, 55.9258],
  [-6.1974, 55.9267], [-6.2083, 55.9152], [-6.2262, 55.9099], [-6.2418, 55.8974],
  [-6.269, 55.889], [-6.2683, 55.8821], [-6.3115, 55.8738], [-6.3049, 55.8667],
  [-6.3098, 55.857], [-6.3205, 55.8496], [-6.3193, 55.8419], [-6.3284, 55.8336],
  [-6.3188, 55.8219], [-6.3242, 55.8249], [-6.335, 55.8222], [-6.3331, 55.8249],
  [-6.3373, 55.825], [-6.3461, 55.8345], [-6.3368, 55.8555], [-6.338, 55.8685],
  [-6.3263, 55.8777], [-6.3218, 55.8864], [-6.3276, 55.8915], [-6.3587, 55.8789],
  [-6.3563, 55.8756], [-6.3709, 55.875], [-6.3751, 55.8698], [-6.386, 55.8668],
  [-6.3921, 55.8581], [-6.4115, 55.8558], [-6.4151, 55.8518], [-6.4281, 55.8607],
  [-6.436, 55.8553], [-6.4547, 55.8524], [-6.4522, 55.8502], [-6.4564, 55.8487],
  [-6.4512, 55.8436], [-6.4591, 55.8402], [-6.4513, 55.8419], [-6.4575, 55.8372],
  [-6.4551, 55.8333], [-6.4598, 55.8335], [-6.4566, 55.8299], [-6.465, 55.8278],
  [-6.4554, 55.8253], [-6.4599, 55.8209], [-6.4546, 55.8176], [-6.4586, 55.8157],
  [-6.4566, 55.8092], [-6.4823, 55.7993], [-6.4809, 55.7963], [-6.4853, 55.7956],
  [-6.4825, 55.7929], [-6.4871, 55.7925], [-6.483, 55.7905], [-6.4842, 55.7881],
  [-6.4622, 55.7871], [-6.4572, 55.7825], [-6.456, 55.7727], [-6.469, 55.7616],
  [-6.4709, 55.755], [-6.4611, 55.7518], [-6.4815, 55.7473], [-6.4863, 55.7397],
  [-6.4978, 55.7355], [-6.4981, 55.7314], [-6.5071, 55.7188], [-6.4932, 55.7131],
  [-6.501, 55.7092], [-6.4984, 55.706], [-6.5129, 55.7006], [-6.5155, 55.6946],
  [-6.5257, 55.6929], [-6.5213, 55.6887], [-6.5138, 55.6883], [-6.5137, 55.6819],
  [-6.5069, 55.6801], [-6.5098, 55.6769], [-6.4882, 55.671], [-6.4767, 55.6756],
  [-6.4745, 55.681], [-6.4389, 55.6928], [-6.4148, 55.706], [-6.3841, 55.7311],
  [-6.3765, 55.7398], [-6.3788, 55.7416], [-6.3718, 55.7447], [-6.3693, 55.7566],
  [-6.3468, 55.7841], [-6.3251, 55.7869], [-6.2799, 55.7811], [-6.2584, 55.7841],
  [-6.2596, 55.7806], [-6.2529, 55.779], [-6.2557, 55.7781], [-6.2513, 55.7747],
  [-6.2526, 55.7712], [-6.2617, 55.7686], [-6.2618, 55.7639], [-6.2885, 55.7588],
  [-6.3051, 55.7483], [-6.3143, 55.7494], [-6.3169, 55.745], [-6.3315, 55.742],
  [-6.3333, 55.7327], [-6.3401, 55.7296], [-6.3357, 55.7237], [-6.3414, 55.7161],
  [-6.3297, 55.7135], [-6.3124, 55.7163], [-6.3114, 55.7194], [-6.3115, 55.716],
  [-6.2876, 55.7022], [-6.2698, 55.6822], [-6.2614, 55.6621], [-6.2609, 55.6567],
  [-6.2733, 55.6496], [-6.3041, 55.6487], [-6.311, 55.6392], [-6.3227, 55.6321],
  [-6.3216, 55.6284], [-6.3285, 55.6254], [-6.3276, 55.6211], [-6.3336, 55.6196],
  [-6.3308, 55.6171], [-6.3324, 55.612], [-6.3279, 55.6093], [-6.3333, 55.6066],
  [-6.3308, 55.6032], [-6.3347, 55.5978], [-6.3321, 55.5972], [-6.3392, 55.5911],
  [-6.3142, 55.5889], [-6.3121, 55.5821], [-6.3037, 55.5843], [-6.2947, 55.5797],
  [-6.2679, 55.5791], [-6.2588, 55.5894], [-6.241, 55.5918], [-6.2344, 55.5966],
  [-6.2331, 55.6042], [-6.2261, 55.6064], [-6.2173, 55.618], [-6.2114, 55.6203],
  [-6.2202, 55.6266], [-6.2178, 55.6305], [-6.194, 55.633], [-6.1898, 55.6301],
  [-6.1908, 55.6267], [-6.1836, 55.6285], [-6.1903, 55.6248], [-6.1861, 55.6233],
  [-6.1656, 55.6308], [-6.1511, 55.6293], [-6.1494, 55.6256], [-6.1285, 55.6319],
  [-6.1309, 55.6339], [-6.1155, 55.6354], [-6.0863, 55.649], [-6.0826, 55.6414],
  [-6.0743, 55.6423], [-6.0705, 55.6518], [-6.0742, 55.6519], [-6.0727, 55.655],
  [-6.0784, 55.6592],
];

/** Attribution required by ODbL. Rendered under the map, not hidden in a
 *  comment - the licence obliges us to say so where the data is shown. */
export const ISLAY_OUTLINE_ATTRIBUTION = "Coastline © OpenStreetMap contributors";

/* ── Projection ───────────────────────────────────────────────────────
   Equirectangular, with longitude scaled by cos(latitude) so the island
   isn't stretched sideways. At Islay's latitude a degree of longitude is
   about 56% of a degree of latitude, and without the correction the
   island comes out visibly too wide. Proper map projections buy nothing
   at this scale for a 25-mile island; this is the standard "plate carrée
   with a standard parallel" and it is accurate to well under a pixel
   here.

   Everything below is computed once at module load from the coordinates
   above, rather than being a hardcoded path string - so if the outline is
   ever re-simplified or replaced, the viewBox and every dot move with it
   instead of silently disagreeing with the new shape.
   ─────────────────────────────────────────────────────────────────── */

const LATS = ISLAY_OUTLINE.map((p) => p[1]);
const LAT_MID = (Math.min(...LATS) + Math.max(...LATS)) / 2;
const LON_SCALE = Math.cos((LAT_MID * Math.PI) / 180);

const RAW = ISLAY_OUTLINE.map(([lon, lat]) => [lon * LON_SCALE, -lat] as [number, number]);
const MIN_X = Math.min(...RAW.map((p) => p[0]));
const MAX_X = Math.max(...RAW.map((p) => p[0]));
const MIN_Y = Math.min(...RAW.map((p) => p[1]));
const MAX_Y = Math.max(...RAW.map((p) => p[1]));

/** Padding in viewBox units, so a zone dot sitting on the coast (several
 *  of them very nearly do) isn't clipped by the edge of the SVG. */
const PAD = 26;
const SPAN_X = MAX_X - MIN_X;
const SPAN_Y = MAX_Y - MIN_Y;
const SCALE = 460 / SPAN_Y; // 460 units tall, width follows from the real aspect

export const ISLAY_VIEWBOX_WIDTH = Math.round(SPAN_X * SCALE + PAD * 2);
export const ISLAY_VIEWBOX_HEIGHT = Math.round(SPAN_Y * SCALE + PAD * 2);
export const ISLAY_VIEWBOX = `0 0 ${ISLAY_VIEWBOX_WIDTH} ${ISLAY_VIEWBOX_HEIGHT}`;

/** Project a real lon/lat into this SVG's coordinate space. Exported so
 *  the zone dots use the exact same transform as the coastline - if they
 *  each did their own, a change to one would drift the dots off the
 *  island without anything failing to compile. */
export function projectToIslaySvg(lng: number, lat: number): { x: number; y: number } {
  return {
    x: (lng * LON_SCALE - MIN_X) * SCALE + PAD,
    y: (-lat - MIN_Y) * SCALE + PAD,
  };
}

/** The coastline as an SVG path, closed. */
export const ISLAY_OUTLINE_PATH =
  ISLAY_OUTLINE.map(([lon, lat], i) => {
    const { x, y } = projectToIslaySvg(lon, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
