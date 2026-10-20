/**
 * THE VISUAL GRAMMAR ENGINE  (VisualProfile → StoryArtDirection)
 *
 *   VisualProfile  (the new Python brain, brain/*.py)
 *        ↓   this file
 *   StoryArtDirection  (the shape StoryView already renders)
 *
 * The new brain answers "what is in this story, and what does it evoke?" far
 * more richly than the regex `SemanticStoryProfile` did — 99 image concepts,
 * a real emotion classifier, and eight continuous visual dimensions. But the
 * renderer and the whole art-direction library (palettes, worlds, looks,
 * doodles, materials) already work and are not being replaced. So rather than
 * re-derive all of that, this engine *drives the existing generator* from the
 * VisualProfile: it chooses the high-leverage axes (mood, visual intensity,
 * environment) straight from the brain's signals and synthesises the
 * `SemanticStoryProfile` the generator expects (objects → artwork, etc.),
 * then hands off to `generateArtDirection`.
 *
 * Net effect: the page you see is a function of the new brain's VisualProfile,
 * but every pixel is still produced by the renderer you already trust.
 *
 * NOTE (docs/DECISIONS.md D1): the VisualProfile is produced by a Python ML
 * pass, not the in-browser heuristic engine — so this path is a build/offline
 * / server pass, not the per-keystroke live transform. This file is the
 * boundary where that richer, slower brain re-enters the deterministic
 * renderer.
 */

import type { SemanticStoryProfile, Signal } from "../semantic-profile";
import { generateArtDirection, type VisualIntensity } from "./generate";
import type { MoodKey } from "./atmosphere";
import type { LookKey } from "./looks";
import type { StoryArtDirection } from "./types";

// ── the shape the Python brain emits (brain/vprofile.py) ─────────────────────
export type VPScored = { name: string; score: number };
export type VisualProfile = {
  semantic: { concepts: VPScored[]; emotions: VPScored[] };
  linguistic: {
    objects: string[];
    actions: string[];
    places: string[];
    people: string[];
    temporalReferences: string[];
    sentenceLengths: number[];
    repetition: string[];
  };
  visual: {
    intimacy: number;
    chaos: number;
    nostalgia: number;
    surrealism: number;
    physicality: number;
    urgency: number;
    fragmentation: number;
    spatiality: number;
  };
  meta?: Record<string, unknown>;
};

const sig = (keys: string[], base = keys.length): Signal<string>[] =>
  keys.map((key, i) => ({ key, score: Math.max(1, base - i) }));

function topEmotion(vp: VisualProfile): string {
  return vp.semantic.emotions[0]?.name ?? "neutral";
}

/**
 * MOOD — the single most visible axis, chosen straight from the eight
 * dimensions + the classified emotion. Transparent priority rules (not a
 * black box), so a given profile always lands on the same mood and it's
 * clear *why*. Maps onto the nine curated moods in `atmosphere.ts`.
 */
export function moodFromVisual(vp: VisualProfile): MoodKey {
  const v = vp.visual;
  const emo = topEmotion(vp);
  // how *agitated* the writing is — the three restless dimensions together.
  // Nostalgia runs high on almost any past-tense prose, so it is a tiebreak,
  // not a driver; agitation and surrealism lead.
  const agitation = v.chaos + v.urgency + v.fragmentation;

  if (v.surrealism >= 0.18) return "dreamy";
  if (agitation >= 0.7) {
    if (v.chaos >= 0.3 || emo === "anger") return "chaotic";
    if (v.physicality >= 0.3 || emo === "sadness" || emo === "fear") return "raw";
    return "restless";
  }
  if (agitation >= 0.55) return "restless";
  if (v.spatiality >= 0.28 && v.spatiality >= v.intimacy && agitation < 0.6) return "cinematic";
  if (v.intimacy >= 0.35 && emo === "joy") return "romantic";
  if (v.intimacy >= 0.35 || (v.nostalgia >= 0.45 && v.intimacy >= 0.3)) return "warm";
  if (emo === "joy" && v.nostalgia < 0.35) return "playful";
  if (v.nostalgia >= 0.4) return "warm";
  return "quiet";
}

/**
 * VISUAL INTENSITY — how much of the page the artwork may occupy, from the
 * story's overall energy. A frantic market fills the page; a quiet kitchen
 * breathes.
 */
export function intensityFromVisual(vp: VisualProfile): VisualIntensity {
  const v = vp.visual;
  const energy = v.chaos + v.urgency + v.fragmentation + 0.5 * v.physicality;
  if (energy > 1.2 || v.chaos > 0.45) return "maximal";
  if (energy > 0.8) return "collage";
  if (energy > 0.58 || v.spatiality > 0.3) return "illustrated";
  return "minimal";
}

/**
 * ENVIRONMENT — vote for one of the renderer's worlds (`backdrops.ts`) from
 * the matched image concepts, weighted by match strength. Returns undefined
 * when nothing maps, letting `generateArtDirection` auto-score the world from
 * the prose (its existing, reliable path) rather than forcing a wrong one.
 */
// Only concepts that genuinely imply a *setting* vote for a world. Placeless
// ephemera (a faded photograph, a receipt, a telephone cord) are things that
// can appear anywhere — they belong to the artwork layer, not the backdrop —
// so they are deliberately absent here; letting them vote dragged transit and
// outdoor stories into a "cafe" interior.
const CONCEPT_ENVIRONMENT: Record<string, string> = {
  // coast / water
  "ocean horizon": "coast", "crashing wave": "coast", "footprints in sand": "coast",
  "ferry wake": "coast", "seashell": "coast", "ripples spreading": "coast",
  // weather / open land
  "fog over a field": "reverie", "morning mist": "reverie", "snowfall": "reverie",
  "field of wildflowers": "meadow", "dew on grass": "meadow",
  "storm clouds": "monsoon", "lightning": "monsoon", "rain on a window": "monsoon",
  "wet pavement": "nightcity", "sunlight through leaves": "forest",
  "bare tree branches": "forest", "spider web": "forest",
  "murmuration of birds": "dawn", "bird in flight": "dawn",
  // transit
  "airport board": "city", "departure lounge": "city", "suitcase packed": "city",
  "passport stamp": "city", "open suitcase spilling": "city",
  "train window": "window", "empty platform": "window",
  "road at night": "nightroad", "car headlights": "nightroad",
  "highway vanishing point": "desertroad", "roadside motel sign": "nightroad",
  // domestic / interior (concepts that ARE a room)
  "kitchen table": "cafe", "cup of tea cooling": "cafe", "dust in a sunbeam": "cafe",
  "unmade bed": "cafe", "open window curtain": "window",
  // urban / night
  "neon sign": "nightcity", "streetlight glow": "nightcity", "crowded market": "city",
  "empty street at dawn": "dawn", "subway tunnel": "nightcity",
  "long exposure traffic": "nightcity", "flickering fluorescent": "nightcity",
  "shop window reflection": "city", "clocktower": "city",
  // surreal / dream
  "melting clock": "dreamscape", "staircase to nowhere": "dreamscape",
  "floating figure": "dreamscape", "mirror maze": "dreamscape",
  "double exposure": "dreamscape", "kaleidoscope": "dreamscape",
  "unspooled cassette tape": "reverie", "shadow on a wall": "nightsky",
};

/**
 * LOOK — the whole visual identity (palette, world, material, composition).
 * This is the most *visible* decision, and the one the legacy engine scores
 * mostly from place cues — which is why two stories that cue the same world
 * look the same. Here the new brain chooses it from mood + environment, so the
 * page's identity actually tracks what the writing feels like. Returned as a
 * `lookOverride`, so the engine renders this world instead of auto-scoring one.
 *
 * Reader output is allowed to go dark (D8); these are reader pages, not the
 * product UI, so dark worlds (noir, space, neon) are fair game here.
 */
export function lookFromVisual(vp: VisualProfile): LookKey {
  const mood = moodFromVisual(vp);
  const env = environmentFromVisual(vp) ?? "";
  const coastal = env === "coast" || env === "underwater" || env === "monsoon";
  const nocturnal = env === "nightcity" || env === "nightroad";
  const cosmic = env === "dreamscape" || env === "nightsky";

  switch (mood) {
    case "chaotic": return "maximal";
    case "dreamy": return cosmic ? "space" : coastal ? "diving" : "postcard";
    case "restless": return nocturnal ? "neon" : "eighties";
    case "raw": return env === "desertroad" || env === "heat" ? "wanted" : "noir";
    case "cinematic": return coastal ? "diving" : cosmic ? "space" : "noir";
    case "romantic": return "paris";
    case "warm": return coastal || env === "meadow" || env === "cafe" ? "postcard" : "ember";
    case "playful": return "fieldnotes";
    case "quiet": default: return "minimal";
  }
}

export function environmentFromVisual(vp: VisualProfile): string | undefined {
  const votes = new Map<string, number>();
  for (const c of vp.semantic.concepts) {
    const env = CONCEPT_ENVIRONMENT[c.name];
    if (!env) continue;
    votes.set(env, (votes.get(env) ?? 0) + Math.max(c.score, 0.05));
  }
  let best: string | undefined;
  let bestScore = 0;
  for (const [env, score] of votes) {
    if (score > bestScore) {
      best = env;
      bestScore = score;
    }
  }
  return best;
}

/** Synthesise the `SemanticStoryProfile` the generator expects. The brain's
 *  richer signals are down-projected onto the six axes; `objects` is the
 *  load-bearing one (it chooses the doodles via `pickArtwork`). */
export function visualProfileToSemantic(vp: VisualProfile): SemanticStoryProfile {
  const sentences = vp.linguistic.sentenceLengths;
  const wordCount = sentences.reduce((a, b) => a + b, 0) || 40;
  // fold the classified emotions onto the generator's emotion vocabulary so
  // narrative/subject picks that still read it get a sane value (mood itself
  // is overridden below, so this is secondary).
  const EMO: Record<string, string> = {
    joy: "hopeful", sadness: "melancholic", fear: "anxious", anger: "chaotic",
    surprise: "ecstatic", disgust: "regretful", neutral: "peaceful",
  };
  const emotion = vp.semantic.emotions
    .map((e) => ({ key: EMO[e.name] ?? "peaceful", score: Math.round(e.score * 10) || 1 }))
    .slice(0, 3);

  return {
    place: sig(vp.linguistic.places, 5),
    objects: sig(vp.linguistic.objects, Math.max(vp.linguistic.objects.length, 1)),
    action: sig(vp.linguistic.actions, 5),
    emotion: emotion.length ? emotion : [{ key: "peaceful", score: 1 }],
    temporal: sig(vp.linguistic.temporalReferences, 4),
    narrative: [],
    wordCount,
    sentenceCount: sentences.length || 1,
  };
}

function seedHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The engine. Give it the brain's VisualProfile and the raw prose; get back a
 * complete StoryArtDirection the renderer can consume directly.
 */
export function artDirectionFromVisualProfile(
  vp: VisualProfile,
  raw: string,
  opts: { seed?: number } = {},
): StoryArtDirection {
  const semantic = visualProfileToSemantic(vp);
  const seed = (opts.seed ?? seedHash(raw)) >>> 0;
  return generateArtDirection(raw, semantic, {
    seed,
    moodOverride: moodFromVisual(vp),
    visualIntensity: intensityFromVisual(vp),
    environmentOverride: environmentFromVisual(vp),
    lookOverride: lookFromVisual(vp),
  });
}

/** Small human-readable summary of what the brain decided — for the debug
 *  panel on the test route. */
export function describeVisualDecision(vp: VisualProfile): string {
  const v = vp.visual;
  const dims = (Object.entries(v) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n.toFixed(2)}`)
    .join("  ");
  return [
    `MOOD          ${moodFromVisual(vp)}`,
    `LOOK          ${lookFromVisual(vp)}`,
    `INTENSITY     ${intensityFromVisual(vp)}`,
    `ENVIRONMENT   ${environmentFromVisual(vp) ?? "(auto from prose)"}`,
    `EMOTION       ${vp.semantic.emotions.slice(0, 3).map((e) => `${e.name} ${e.score.toFixed(2)}`).join(", ")}`,
    `CONCEPTS      ${vp.semantic.concepts.slice(0, 6).map((c) => c.name).join(", ")}`,
    `DIMENSIONS    ${dims}`,
  ].join("\n");
}
