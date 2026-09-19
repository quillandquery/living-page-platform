import type { StorySeed, SeedForm } from "./discover";

/**
 * AUTHOR-PAGE-ONLY VARIETY NUDGE
 *
 * `buildSeed()` (lib/discover.ts) picks each story's archetype from that
 * story's own content signals -- the same function Wander uses to build its
 * field, deliberately left untouched here so nothing about Wander changes.
 * A field of many strangers' stories absorbs a run of similar archetypes
 * without anyone noticing; a single author's small, intimate archive does
 * not -- three of someone's nine stories landing on bare "giant word" reads
 * as repetition, not honesty to the content (design treatment §5.2: "a
 * thirty-story archive that renders thirty identical cards is the failure
 * mode this whole system exists to prevent" -- the same logic just shows up
 * sooner at nine).
 *
 * This never invents a new archetype and never randomizes: it only steps in
 * once three ADJACENT seeds would render identically, and only reassigns
 * the middle one, to a form the seed's own already-computed signals still
 * plausibly support. Two of a kind is left alone -- the doc is explicit
 * that "a three-story archive that happens to produce three postcards is
 * fine ... that's honest to the content."
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

/** A deterministic, content-aware alternative to `exclude` -- richer
 * signals (a second doodle, a real backdrop) earn first claim on the forms
 * built to show them off; every seed can always fall through to the plain
 * forms. */
function alternateFormFor(seed: StorySeed, exclude: SeedForm): SeedForm {
  const candidates: SeedForm[] = [];
  if (seed.secondDoodle) candidates.push("collage", "micro-scene");
  if (seed.backdrop) candidates.push("postcard");
  candidates.push("paper-scrap", "typographic", "floating-thought", "micro-scene", "postcard", "collage", "giant-word");
  const pool = candidates.filter((f) => f !== exclude);
  return pool[hash(seed.key) % pool.length];
}

/** Walk the archive once; wherever three seeds in a row share a form,
 * reassign the middle one. A single left-to-right pass is enough -- fixing
 * seed i can only ever create a NEW run starting at i, never resurrect the
 * one just broken, so longer runs (four, five, ...) resolve correctly too. */
export function diversifyArchetypes(seeds: StorySeed[]): StorySeed[] {
  if (seeds.length < 3) return seeds;
  const out = seeds.slice();
  for (let i = 1; i < out.length - 1; i++) {
    if (out[i - 1].form === out[i].form && out[i].form === out[i + 1].form) {
      const form = alternateFormFor(out[i], out[i].form);
      out[i] = { ...out[i], form, tier: tierFor(form, out[i].energy) };
    }
  }
  return out;
}
