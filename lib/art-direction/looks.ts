/**
 * LOOK / WORLD — a whole visual identity in one choice.
 *
 * Story Visual System 3.0. A Look bundles the nine axes so a writer never
 * tunes dials: a palette + type (the ground and the voice), an art style,
 * material, composition, typography habits, how dense the artwork is, what
 * moves, the format it reads best in, and how its hero illustration behaves.
 *
 * The old engine had FOUR looks and collapsed all nine moods onto them via a
 * fixed ladder — so every auto-directed story became one of four pages, and
 * 7 art styles / 9 compositions / 6 materials sat unreachable. This is the
 * fix: a data-driven library of worlds, each with an AFFINITY, chosen by
 * scoring against the story (mood, energy, place, entry mode, cue words) and
 * seed-breaking ties. Deterministic, no LLM (D1). Adding a world is data, not
 * a new code path (D6). There is still no "none".
 */
import type { ArtStyleKey, CompositionKey, MaterialKey, TypographyDirection } from "./types";
import type { AmbientMotif } from "@/components/living/Backdrop";
import type { Energy } from "@/lib/backdrops";
import type { VisualIntensity } from "./generate";
import type { MoodKey } from "./atmosphere";
import type { StoryType } from "@/lib/types";
import { PALETTES } from "./palettes";

export type LookKey =
  | "minimal" | "maximal" | "postcard" | "eighties"
  | "diving" | "paris" | "noir" | "neon" | "wanted" | "space"
  | "fieldnotes" | "essay" | "ember";

/** how the story's hero illustration behaves behind the words */
export type SubjectBias = "drift" | "draw" | "rise";

export type LookAffinity = {
  moods?: MoodKey[];
  energies?: Energy[];
  /** backdrop keys (lib/backdrops.ts) this world belongs with */
  environments?: string[];
  types?: StoryType[];
  /** words in the raw text that pull toward this world */
  cues?: RegExp[];
  /** baseline weight — a world can be common (higher) or rare (lower) */
  base?: number;
};

export type Look = {
  key: LookKey;
  label: string;
  palette: string;
  artStyle: ArtStyleKey;
  material: MaterialKey;
  composition: CompositionKey;
  typography: TypographyDirection;
  visualIntensity: VisualIntensity;
  ambient?: AmbientMotif[];
  /** the format stage this world reads best in — an engine hint, not a lock */
  format?: string;
  /** the natural behaviour of this world's hero illustration */
  subjectBias?: SubjectBias;
  affinity: LookAffinity;
};

export const LOOKS: Record<LookKey, Look> = {
  // ── the calm centre — the default a plain story lands on ──────────────
  minimal: {
    key: "minimal", label: "minimal", palette: "minimal",
    artStyle: "editorial-clean", material: "paper", composition: "stage",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "illustrated", ambient: ["motes"], format: "standard", subjectBias: "rise",
    affinity: { moods: ["quiet"], energies: ["quiet"], base: 0.9 },
  },
  maximal: {
    key: "maximal", label: "maximal", palette: "maximal",
    artStyle: "scrapbook", material: "canvas", composition: "chaotic-collage",
    typography: { rotateBias: 4, handwrittenBias: true, framed: false },
    visualIntensity: "maximal", ambient: ["motes", "paperdrift", "bloom"], format: "scrapbook", subjectBias: "drift",
    affinity: { moods: ["chaotic", "playful"], energies: ["electric"], base: 0.4 },
  },
  postcard: {
    key: "postcard", label: "postcard", palette: "postcard",
    artStyle: "vintage-postcard", material: "faded-print", composition: "postcard",
    typography: { rotateBias: -2, handwrittenBias: true, framed: true },
    visualIntensity: "illustrated", format: "postcard", subjectBias: "draw",
    affinity: { moods: ["warm", "romantic", "dreamy"], environments: ["coast", "meadow", "cafe"], base: 0.5 },
  },
  eighties: {
    key: "eighties", label: "80s / memphis", palette: "eighties",
    artStyle: "screenprint-poster", material: "screenprint-grain", composition: "diorama",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "collage", ambient: ["bloom"], format: "marquee", subjectBias: "drift",
    affinity: { moods: ["playful", "restless"], base: 0.35 },
  },

  // ── new worlds ────────────────────────────────────────────────────────

  // Atlas diving — the deep. A translucent creature drifts behind the words.
  diving: {
    key: "diving", label: "the deep", palette: "diving",
    artStyle: "surreal-collage", material: "film-grain", composition: "floating",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "collage", ambient: ["motes", "bloom"], format: "standard", subjectBias: "drift",
    affinity: {
      moods: ["cinematic", "dreamy", "quiet"],
      environments: ["underwater", "coast", "monsoon"],
      cues: [/\b(dive|diving|dived|underwater|reef|ocean|sea|whale|shark|manta|ray|coral|scuba|deep|beneath|current|abyss|tide)\b/i],
      base: 0.3,
    },
  },
  // old-world romance — a city that sketches itself in as you read.
  paris: {
    key: "paris", label: "old world", palette: "paris",
    artStyle: "vintage-postcard", material: "faded-print", composition: "postcard",
    typography: { rotateBias: -1, handwrittenBias: true, framed: true },
    visualIntensity: "illustrated", format: "postcard", subjectBias: "draw",
    affinity: {
      moods: ["romantic", "dreamy", "warm"],
      environments: ["city", "cafe", "window"],
      cues: [/\b(paris|eiffel|old town|cobbled|cobblestone|piazza|boulevard|europe|venice|rome|balcony|café|cafe|tram)\b/i],
      base: 0.25,
    },
  },
  // 1940s film — charcoal & bone, one red, letterboxed.
  noir: {
    key: "noir", label: "black & white", palette: "noir",
    artStyle: "editorial-clean", material: "film-grain", composition: "stage",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "illustrated", ambient: ["headlights"], format: "film", subjectBias: "rise",
    affinity: {
      moods: ["raw", "cinematic", "restless"],
      environments: ["nightcity", "monsoon", "window", "nightroad"],
      cues: [/\b(noir|detective|smoke|shadow|rain-slick|1940|forties|black and white|cigarette|trench coat|stranger|confession|last time i saw)\b/i],
      base: 0.2,
    },
  },
  // synthwave — black, magenta, cyan, a lit sign at night.
  neon: {
    key: "neon", label: "neon night", palette: "neon",
    artStyle: "screenprint-poster", material: "screenprint-grain", composition: "diorama",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "collage", ambient: ["bloom", "headlights"], format: "marquee", subjectBias: "drift",
    affinity: {
      moods: ["restless", "chaotic", "playful"],
      environments: ["nightcity", "nightroad"],
      cues: [/\b(neon|synth|80s|eighties|arcade|club|midnight|2\s?am|glow|electric|dance floor|strobe|miami|vice)\b/i],
      base: 0.2,
    },
  },
  // wood-type broadside — the wanted poster.
  wanted: {
    key: "wanted", label: "wanted", palette: "sepia",
    artStyle: "screenprint-poster", material: "newsprint", composition: "postcard",
    typography: { rotateBias: 0, handwrittenBias: false, framed: true },
    visualIntensity: "illustrated", format: "poster", subjectBias: "draw",
    affinity: {
      moods: ["raw", "restless"],
      environments: ["desertroad", "heat"],
      cues: [/\b(wanted|outlaw|reward|sheriff|bounty|the west|frontier|saloon|dead or alive|on the run|fugitive|escaped)\b/i],
      base: 0.12,
    },
  },
  // a galaxy far, far away — the crawl.
  space: {
    key: "space", label: "far away", palette: "space",
    artStyle: "editorial-clean", material: "film-grain", composition: "floating",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "illustrated", ambient: [], format: "crawl", subjectBias: "rise",
    affinity: {
      moods: ["cinematic", "dreamy"],
      environments: ["nightsky", "dreamscape"],
      cues: [/\b(space|galaxy|stars?|cosmos|orbit|rocket|astronaut|far away|the universe|light years|another planet|nebula)\b/i],
      base: 0.15,
    },
  },
  // pencil on paper — field notes, sketched.
  fieldnotes: {
    key: "fieldnotes", label: "field notes", palette: "sketch",
    artStyle: "ink-comic", material: "paper", composition: "scrapbook",
    typography: { rotateBias: 2, handwrittenBias: true, framed: false },
    visualIntensity: "illustrated", ambient: ["motes"], format: "notebook", subjectBias: "draw",
    affinity: {
      moods: ["playful", "quiet", "warm"],
      types: ["moment", "thought"],
      cues: [/\b(sketch|sketched|notebook|notes|drew|pencil|margins|list of|things i)\b/i],
      base: 0.3,
    },
  },
  // a garden to think in — essays, credos, the reflective register.
  essay: {
    key: "essay", label: "essay", palette: "botanical",
    artStyle: "editorial-clean", material: "paper", composition: "stage",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "minimal", ambient: ["motes"], format: "letter", subjectBias: "rise",
    affinity: {
      moods: ["quiet", "warm"],
      types: ["thought", "freeform"],
      cues: [/\b(believe|meaning|truth|we are|to live|the point of|i've learned|philosoph|what matters|in the end)\b/i],
      base: 0.4,
    },
  },
  // campfire — a warm night that isn't cold.
  ember: {
    key: "ember", label: "firelight", palette: "ember",
    artStyle: "storybook-paint", material: "canvas", composition: "diorama",
    typography: { rotateBias: -1, handwrittenBias: true, framed: false },
    visualIntensity: "illustrated", ambient: ["motes", "bloom"], format: "letter", subjectBias: "rise",
    affinity: {
      moods: ["warm", "romantic", "dreamy"],
      environments: ["cafe", "nightroad", "nightsky"],
      cues: [/\b(fire|campfire|firelight|embers?|candle|lantern|home|kitchen|blanket|midnight talk)\b/i],
      base: 0.25,
    },
  },
};

export const LOOK_KEYS = Object.keys(LOOKS) as LookKey[];
export const LOOK_LIST = Object.values(LOOKS);

export function getLook(key?: string): Look | null {
  return (key && (LOOKS as Record<string, Look>)[key]) || null;
}

/** everything the auto picker needs to know about a story. */
export type LookContext = {
  mood: MoodKey;
  energy: Energy;
  environment: string;
  type?: StoryType;
  raw: string;
  seed: number;
  /** reflective pieces must read bright/warm — never a dark world */
  lightOnly?: boolean;
};

/** score every world against the story — the reasons a reader could feel:
 *  the mood it's in, how loud its place is, where it's set, how it was
 *  started, and the actual words on the page. */
export function scoreLooks(ctx: LookContext): { look: Look; score: number }[] {
  const text = (ctx.raw || "").toLowerCase();
  return LOOK_LIST.map((look) => {
    const a = look.affinity;
    let s = a.base ?? 0.3;
    if (a.moods?.includes(ctx.mood)) s += 3;
    if (a.energies?.includes(ctx.energy)) s += 1;
    if (a.environments?.includes(ctx.environment)) s += 3;
    if (ctx.type && a.types?.includes(ctx.type)) s += 2;
    if (a.cues) for (const re of a.cues) {
      const n = (text.match(new RegExp(re.source, "gi")) || []).length;
      if (n) s += Math.min(3, n) * 1.5;
    }
    // a dark world can never render a reflective/bright piece
    if (ctx.lightOnly && PALETTES[look.palette]?.scheme === "dark") s = -1;
    return { look, score: s };
  }).sort((x, y) => y.score - x.score);
}

/**
 * THE SMART DEFAULT. Score the worlds, then seed-break among the ones within
 * a band of the top — a clear winner (a dive story, a wanted poster) still
 * wins outright, while two ordinary stories that merely share a quiet mood
 * now diverge on their place, their words and their seed instead of all
 * landing on the identical bare page. Deterministic: same story + seed →
 * same world.
 */
export function autoLook(ctx: LookContext): Look {
  const scored = scoreLooks(ctx).filter((s) => s.score >= 0);
  if (!scored.length) return LOOKS.minimal;
  const top = scored[0].score;
  const band = Math.max(0.5, top * 0.8);
  const pool = scored.filter((s) => s.score >= band);
  return pool[Math.abs(ctx.seed >>> 3) % pool.length].look;
}
