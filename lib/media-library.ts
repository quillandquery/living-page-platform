/**
 * CURATED MEDIA LIBRARY — the compliant photo register (Decision D2).
 *
 * D2 draws a hard line: imagery is a *curated, tagged, hand-picked* library
 * selected by the same deterministic signals as everything else — "never an
 * AI image call and never a random web fetch." This is that library. Each
 * entry is a real, free-licence Unsplash photograph referenced by its stable
 * CDN id (hot-linked, never re-hosted), with photographer attribution. The
 * MANIFEST is static — selection is a pure function of the story's world and
 * seed, so there is no network in the transform loop; the browser loads the
 * chosen <img> at read time like any web image.
 *
 * NOTE (transparency): these are rectangular photographs, shown as framed /
 * full-bleed figures. The story's transparent, animated hero that "swims
 * behind the words" is the SVG subject layer (lib/art-direction/subject.ts) —
 * not a photo. To add photographic *cut-outs* later, drop transparent PNG/SVG
 * entries (e.g. unDraw, CC0) into a new tag and point a world at it.
 *
 * To grow the library: add ids under a tag, or a new tag + a world mapping.
 * No new code path (D6).
 */

export type MediaEntry = { id: string; author: string; alt: string };
export type MediaTag = "underwater" | "paris" | "desert" | "space" | "forest" | "citynight";

/** hand-picked free-licence Unsplash photographs, by world archetype. */
export const MEDIA_LIBRARY: Record<MediaTag, MediaEntry[]> = {
  underwater: [
    { id: "photo-1540202404-b2979d19ed37", author: "seefromthesky", alt: "a whale shark with white spots in deep blue ocean" },
    { id: "photo-1544552866-49ce864ff896", author: "sebaspenalambarri", alt: "a whale shark under rays of light" },
    { id: "photo-1563974514898-7aea295e12fa", author: "noaa", alt: "a grey whale underwater" },
    { id: "photo-1464926322190-70f42beb8250", author: "jeremybishop", alt: "a whale rising toward the surface of the sea" },
  ],
  paris: [
    { id: "photo-1609971757431-439cf7b4141b", author: "diofagundes", alt: "the eiffel tower in paris by day" },
    { id: "photo-1654448190693-f59b70e5ee3c", author: "real_jansen", alt: "the eiffel tower over the rooftops of paris" },
    { id: "photo-1563813433958-b953126a9c43", author: "rawcurve", alt: "the eiffel tower" },
    { id: "photo-1626806512616-972c578a7b4f", author: "mariuschristensen", alt: "people walking a paris street" },
  ],
  desert: [
    { id: "photo-1616906017691-277f5e9cec75", author: "gyostimages", alt: "an empty asphalt road under a blue sky" },
    { id: "photo-1639402477646-e88e811eef21", author: "andrew_svk", alt: "an empty road through the desert" },
    { id: "photo-1582063745023-666cf249c505", author: "walo_09", alt: "a road running toward a brown mountain" },
    { id: "photo-1685502659945-721d57e46b4d", author: "brice_cooper18", alt: "a road with a mountain in the distance" },
  ],
  space: [
    { id: "photo-1628498188904-036f5e25e93e", author: "olenkasergienko", alt: "stars scattered across the night sky" },
    { id: "photo-1464802686167-b939a6910659", author: "jeremythomasphoto", alt: "a blue and purple galaxy" },
    { id: "photo-1465101162946-4377e57745c3", author: "jeremythomasphoto", alt: "the milky way over a mountain range" },
    { id: "photo-1475274047050-1d0c0975c63e", author: "laup", alt: "a cluster of stars in the sky" },
  ],
  forest: [
    { id: "photo-1633298163600-93fa703aaa37", author: "capturelight", alt: "a path through a misty forest" },
    { id: "photo-1588202449507-9f9ca203637e", author: "lureofadventure", alt: "a dirt road through the forest" },
    { id: "photo-1574971111499-0c78f9186d60", author: "pjgalszabo", alt: "a green leafed tree" },
    { id: "photo-1692087460128-da4bc008931c", author: "blooddrainer", alt: "a road in the middle of a forest" },
  ],
  citynight: [
    { id: "photo-1599060052009-24d6d0b0161c", author: "hiepdaiduong93", alt: "a motorcycle through a narrow lit city street" },
    { id: "photo-1541702467897-41915a07d3a7", author: "trapnation", alt: "a person in a raincoat crossing a wet intersection" },
    { id: "photo-1608690158878-1a96b29b455b", author: "msohebzaidi", alt: "people walking a street at night" },
    { id: "photo-1672872476232-da16b45c9001", author: "nattgw", alt: "a city at night under neon light" },
  ],
};

/** a story's world (a lib/backdrops.ts key) → the media archetype for it. */
const WORLD_TO_TAG: Record<string, MediaTag> = {
  coast: "underwater", underwater: "underwater",
  forest: "forest", highland: "forest", meadow: "forest", reverie: "forest",
  heat: "desert", desertroad: "desert", dawn: "desert",
  city: "paris", cafe: "paris", palace: "paris",
  window: "citynight", monsoon: "citynight", nightcity: "citynight", nightroad: "citynight",
  nightsky: "space", dreamscape: "space",
};

/** cue words → tag, for when the world is unknown (fall back to the text). */
const TEXT_TAG: [MediaTag, RegExp][] = [
  ["underwater", /\b(dive|diving|underwater|whale|shark|reef|ocean|sea|coral|manta)\b/i],
  ["space", /\b(space|galaxy|stars?|cosmos|orbit|night sky|constellation|nebula)\b/i],
  ["desert", /\b(desert|highway|road trip|dune|drove across|open road)\b/i],
  ["citynight", /\b(neon|night|rain|monsoon|midnight|street|club|city at night)\b/i],
  ["paris", /\b(paris|eiffel|city|street|cobbled|old town|caf[eé]|boulevard)\b/i],
  ["forest", /\b(forest|trail|woods|trees|mountain|meadow|field|garden)\b/i],
];

function tagFor(world: string | undefined, text: string): MediaTag {
  if (world && WORLD_TO_TAG[world]) return WORLD_TO_TAG[world];
  for (const [tag, re] of TEXT_TAG) if (re.test(text)) return tag;
  return "forest";
}

export type MediaResult = { src: string; alt: string; credit: string; creditUrl: string; link: string };

const UTM = "utm_source=living_page&utm_medium=referral";
function toResult(e: MediaEntry): MediaResult {
  return {
    src: `https://images.unsplash.com/${e.id}?auto=format&fit=crop&w=1400&q=70`,
    alt: e.alt,
    credit: `Photo · @${e.author} / Unsplash`,
    creditUrl: `https://unsplash.com/@${e.author}?${UTM}`,
    link: `https://unsplash.com/@${e.author}?${UTM}`,
  };
}

/** deterministic pick(s) for a story — same world + seed → same photos. */
export function pickMedia(world: string | undefined, text: string, seed: number, count = 1): MediaResult[] {
  const arr = MEDIA_LIBRARY[tagFor(world, text)];
  const out: MediaResult[] = [];
  for (let i = 0; i < count; i++) out.push(toResult(arr[Math.abs(seed + i * 97) % arr.length]));
  return out;
}
