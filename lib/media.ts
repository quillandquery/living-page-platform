import type { Block } from "./story-blocks.mjs";

/**
 * MEDIA — the image-forward register, generated free by Pollinations.ai.
 *
 * No key, no account, no rate-limited stock API: an image URL is built from
 * the story's own words plus a locked house style, and Pollinations renders
 * it on request. Deterministic seed per prompt, so a story always shows the
 * same picture. Swappable later (unDraw, another model) without touching the
 * reader or the save path.
 */

export type MediaResult = {
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
  link: string;
};

// One look for the whole product, so a story's images read as one hand.
const STYLE =
  "flat editorial illustration, storybook, soft muted palette, textured grain, " +
  "minimal shapes, gentle, tasteful, no text, no watermark";

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100000;
}

function pollinations(subject: string): string {
  const prompt = `${subject}, ${STYLE}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1280&height=720&nologo=true&seed=${seedOf(prompt)}`;
}

const STOP = new Set(
  ("the a an and or but of to in on at for with from into over under is was were are be been being " +
    "i you he she it we they me my your his her our their this that these those then than just really " +
    "very so as if too not no yes did do does had have has will would could should about after before " +
    "again back down out up off only even still much more most some any all one two like got get went " +
    "go going came come said says felt feel knew know think thought there here when where what which who " +
    "how why because while until around through").split(/\s+/),
);

function subjects(text: string, max: number): string[] {
  const freq: Record<string, number> = {};
  for (const w of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (STOP.has(w)) continue;
    freq[w] = (freq[w] ?? 0) + 1;
  }
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, max);
}

/**
 * Resolve imagery for a story and splice it into its blocks. Idempotent; no
 * network at save time (the URLs generate lazily when the reader loads them),
 * so it never throws or blocks a save.
 */
export async function resolveImagery(place: string, source: string, blocks: Block[]): Promise<Block[]> {
  const clean = blocks.filter((b) => b.kind !== "media");

  const queries: string[] = [];
  if (place && place.trim()) queries.push(place.trim());
  for (const s of subjects(source, 4)) if (!queries.includes(s)) queries.push(s);
  const picks = queries.slice(0, 3);
  if (!picks.length) return clean;

  const asBlock = (subject: string): Block =>
    ({
      kind: "media",
      src: pollinations(subject),
      alt: subject,
      credit: "AI illustration · Pollinations",
      creditUrl: "https://pollinations.ai",
      link: "https://pollinations.ai",
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
