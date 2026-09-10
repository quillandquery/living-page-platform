import "server-only";
import type { Block } from "./story-blocks.mjs";

/**
 * MEDIA — the image-forward register.
 *
 * A story can be typographic (Bali) or image-forward (a photographic scene
 * behind and between the lines). This is the provider that fetches the
 * pictures. It is a swappable abstraction: PexelsProvider today, an
 * AI/illustration provider later, without touching the reader or the save
 * path. Server-only: the API key never reaches the browser.
 */

export type MediaResult = {
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
  link: string;
};

export type MediaBlock = {
  kind: "media";
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
  link: string;
};

const STOP = new Set(
  ("the a an and or but of to in on at for with from into over under is was were are be been being " +
    "i you he she it we they me my your his her our their this that these those then than just really " +
    "very so as if too but not no yes did do does had have has will would could should about after " +
    "before again back down out up off only even still much more most some any all one two into like " +
    "got get went go going came come said says felt feel knew know think thought there here when where " +
    "what which who how why because while until around through").split(/\s+/),
);

/** The strongest concrete words in a draft — crude, but a good photo query. */
function subjects(text: string, max: number): string[] {
  const freq: Record<string, number> = {};
  for (const w of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (STOP.has(w)) continue;
    freq[w] = (freq[w] ?? 0) + 1;
  }
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, max);
}

/** One best photo for a query, or null if the key is missing / nothing found. */
export async function searchPexels(query: string): Promise<MediaResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const r = await fetch(url, { headers: { Authorization: key }, next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      photos?: Array<{
        alt?: string; url?: string; photographer?: string; photographer_url?: string;
        src?: { large2x?: string; large?: string; original?: string };
      }>;
    };
    const p = j.photos?.[0];
    const src = p?.src?.large2x || p?.src?.large || p?.src?.original;
    if (!p || !src) return null;
    return {
      src,
      alt: p.alt || query,
      credit: p.photographer || "Pexels",
      creditUrl: p.photographer_url || "https://www.pexels.com",
      link: p.url || "https://www.pexels.com",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve imagery for a story and splice it into its blocks. Idempotent:
 * strips any prior media first, so re-saving refreshes rather than stacks.
 * Never throws and never blocks a save — no key or no results just returns
 * the story unchanged.
 */
export async function resolveImagery(place: string, source: string, blocks: Block[]): Promise<Block[]> {
  const clean = blocks.filter((b) => b.kind !== "media");

  const queries: string[] = [];
  if (place && place.trim()) queries.push(place.trim());
  for (const s of subjects(source, 4)) if (!queries.includes(s)) queries.push(s);
  const picks = queries.slice(0, 3);
  if (!picks.length) return clean;

  const found = (await Promise.all(picks.map(searchPexels))).filter(Boolean) as MediaResult[];
  if (!found.length) return clean;

  const asBlock = (m: MediaResult): Block =>
    ({ kind: "media", src: m.src, alt: m.alt, credit: m.credit, creditUrl: m.creditUrl, link: m.link } as Block);

  // where images may land: after a beat. Hero after the opening line; the
  // rest spread evenly across the piece.
  const beatIdx = clean.map((b, i) => (b.kind === "beat" ? i : -1)).filter((i) => i >= 0);
  const positions = new Set<number>();
  if (beatIdx.length) positions.add(beatIdx[Math.min(1, beatIdx.length - 1)]);
  for (let k = 1; k < found.length; k++) {
    const at = beatIdx[Math.floor((beatIdx.length * k) / found.length)];
    if (at != null) positions.add(at);
  }

  const out: Block[] = [];
  let mi = 0;
  clean.forEach((b, i) => {
    out.push(b);
    if (positions.has(i) && mi < found.length) out.push(asBlock(found[mi++]));
  });
  while (mi < found.length) out.push(asBlock(found[mi++]));
  return out;
}
