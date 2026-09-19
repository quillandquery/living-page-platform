import type { StorySeed, SeedForm } from "./discover";

/**
 * AUTHOR-PAGE-ONLY VARIETY NUDGE
 *
 * `buildSeed()` (lib/discover.ts) picks each story's archetype from that
 * story's own content signals -- the same function Wander uses to build its
 * field, deliberately left untouched here so nothing about Wander changes.
 * A field of many strangers' stories absorbs several seeds landing on the
 * same archetype without anyone noticing; a single author's small archive
 * does not -- several of an author's punchy one-line stories can easily all
 * score highest on bare "giant word", which reads as repetition rather than
 * honesty to the content once it's someone's own shelf instead of Wander's
 * open field (design treatment §5.2).
 *
 * First version of this only reassigned a form when three ADJACENT array
 * entries matched. That under-fired in practice: an archive can have, say,
 * four of nine stories land on "giant-word" while never having three of
 * them literally back-to-back in story order (a couple of floating-thought
 * or handwritten pieces sitting between them is enough to dodge the
 * adjacency check) -- so the repetition a visitor actually sees on the page
 * went untouched. This version instead caps how many times any ONE
 * archetype may appear across the WHOLE archive: the first two uses of a
 * form are left alone (the doc: "a three-story archive that happens to
 * produce three postcards is fine ... honest to the content"), and every
 * use after that gets reassigned to whichever eligible alternate form has
 * been used least so far, so no single archetype can come to dominate a
 * small archive no matter how it's distributed through the story list.
 *
 * Every field a form's SeedBody switch reads (place, date, hook,
 * chargedWord, dominantVoice, doodle, secondDoodle, themes) is populated on
 * every seed regardless of which form buildSeed originally chose, so
 * reassigning `form` here is safe on its own terms -- nothing renders blank.
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Mirrors discover.ts's private tierOf() so a reassigned seed still gets the
// tier its NEW form would naturally have (not stranded on its old one).
function tierFor(form: SeedForm, energy: StorySeed["energy"]): StorySeed["tier"] {
  if (energy === "electric" || ((form === "collage" || form === "typographic") && energy !== "quiet")) return "burst";
  if (energy === "quiet" || form === "floating-thought") return "quiet";
  return "mid";
}

const ALL_FORMS: SeedForm[] = [
  "paper-scrap", "typographic", "floating-thought", "micro-scene", "postcard", "collage", "giant-word",
];

/** A deterministic, content-aware alternative to `exclude`, preferring
 * whichever eligible form has been used least so far in THIS archive (so
 * reassignments spread out rather than piling onto a second favourite).
 * Richer signals (a second doodle, a real backdrop) earn first claim on the
 * forms built to show them off; every seed can always fall through to the
 * plain forms that only need what every seed already has. */
function alternateFormFor(seed: StorySeed, exclude: SeedForm, used: Map<SeedForm, number>): SeedForm {
  const candidates: SeedForm[] = [];
  if (seed.secondDoodle) candidates.push("collage", "micro-scene");
  if (seed.backdrop) candidates.push("postcard");
  candidates.push(...ALL_FORMS);
  const pool = candidates.filter((f) => f !== exclude);

  let bestCount = Infinity;
  for (const f of pool) bestCount = Math.min(bestCount, used.get(f) ?? 0);
  const tied = pool.filter((f) => (used.get(f) ?? 0) === bestCount);
  return tied[hash(seed.key) % tied.length];
}

/** Walk the archive once, left to right, tracking how many times each
 * archetype has been used. A form's 3rd (and every later) appearance gets
 * reassigned; its first two are left exactly as buildSeed chose them. */
export function diversifyArchetypes(seeds: StorySeed[]): StorySeed[] {
  if (seeds.length < 3) return seeds;
  const out = seeds.slice();
  const used = new Map<SeedForm, number>();
  for (let i = 0; i < out.length; i++) {
    const original = out[i].form;
    const priorUses = used.get(original) ?? 0;
    if (priorUses >= 2) {
      const form = alternateFormFor(out[i], original, used);
      out[i] = { ...out[i], form, tier: tierFor(form, out[i].energy) };
      used.set(form, (used.get(form) ?? 0) + 1);
    } else {
      used.set(original, priorUses + 1);
    }
  }
  return out;
}
