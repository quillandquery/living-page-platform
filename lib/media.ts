import type { Block } from "./story-blocks.mjs";
import { pickMedia, type MediaResult } from "./media-library";

/**
 * MEDIA — the image-forward register, now from the CURATED library
 * (lib/media-library.ts), replacing the earlier Pollinations.ai generator
 * (an AI image call + network per render, which D1/D2 forbid). Selection is a
 * pure function of the story's world + seed; the URLs are stable Unsplash CDN
 * links loaded lazily by the reader. Idempotent, never throws, never blocks a
 * save. Swappable later (unDraw cut-outs, self-hosted) without touching the
 * reader or the save path.
 */

export type { MediaResult };

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Resolve imagery for a story and splice it into its blocks. `world` is the
 * chosen backdrop key when known (art_direction.environment.key); otherwise
 * the archetype is read from the text. No network at save time.
 */
export async function resolveImagery(place: string, source: string, blocks: Block[], world?: string): Promise<Block[]> {
  const clean = blocks.filter((b) => b.kind !== "media");
  const seed = seedOf(`${world ?? ""}|${place}|${source}`);
  const count = Math.min(3, Math.max(1, Math.round(clean.filter((b) => b.kind === "beat").length / 6)));
  const picks = pickMedia(world, `${place} ${source}`, seed, count);
  if (!picks.length) return clean;

  const asBlock = (m: MediaResult): Block => ({
    kind: "media", src: m.src, alt: m.alt, credit: m.credit, creditUrl: m.creditUrl, link: m.link,
  } as Block);

  const beatIdx = clean.map((b, i) => (b.kind === "beat" ? i : -1)).filter((i) => i >= 0);
  const positions = new Set<number>();
  if (beatIdx.length) positions.add(beatIdx[Math.min(1, beatIdx.length - 1)]);
  for (let k = 1; k < picks.length; k++) {
    const at = beatIdx[Math.floor((beatIdx.length * k) / picks.length)];
    if (at != null) positions.add(at);
  }

  const out: Block[] = [];
  let mi = 0;
  clean.forEach((b, i) => {
    out.push(b);
    if (positions.has(i) && mi < picks.length) out.push(asBlock(picks[mi++]));
  });
  while (mi < picks.length) out.push(asBlock(picks[mi++]));
  return out;
}
