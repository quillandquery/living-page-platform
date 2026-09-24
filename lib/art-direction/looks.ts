/**
 * LOOK — a whole visual identity in one choice.
 *
 * The nine art-direction axes are powerful but a writer shouldn't have to
 * tune five dials to get a coherent page. A Look bundles them: a palette
 * (the ground), an art style, material, composition, typography, how dense
 * the artwork is, and what moves. Picking "postcard" sets all of it at once
 * so the result reads as one deliberate thing, not a random mix.
 *
 * The writer can pick a Look; when they don't, the engine assigns one from
 * the story's mood (the "smart default"). Either way the environment (the
 * animated world behind the words) still comes from what the story is
 * about — a Look changes how the story LOOKS, not where it is set.
 */
import type { ArtStyleKey, CompositionKey, MaterialKey, TypographyDirection } from "./types";
import type { AmbientMotif } from "@/components/living/Backdrop";
import type { Energy } from "@/lib/backdrops";
import type { VisualIntensity } from "./generate";
import type { MoodKey } from "./atmosphere";

export type LookKey = "minimal" | "maximal" | "postcard" | "eighties";

export type Look = {
  key: LookKey;
  label: string;
  palette: string;
  artStyle: ArtStyleKey;
  material: MaterialKey;
  composition: CompositionKey;
  typography: TypographyDirection;
  visualIntensity: VisualIntensity;
  /** ambient motifs to force; omit to let the engine pick from environment */
  ambient?: AmbientMotif[];
};

export const LOOKS: Record<LookKey, Look> = {
  // RESTRAINED, NOT ABSENT. This used to be `visualIntensity: "minimal"`
  // with `ambient: []` — an explicit instruction to draw nothing, which
  // made every quiet story render as a bare cream page with no artwork,
  // no ambient layer and no visual identity at all. That is the "none"
  // Interaction Principle 3 says must not exist. It is still the calmest
  // look in the set; it just now has a floor.
  minimal: {
    key: "minimal", label: "minimal", palette: "minimal",
    artStyle: "editorial-clean", material: "paper", composition: "stage",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "illustrated", ambient: ["motes"],
  },
  maximal: {
    key: "maximal", label: "maximal", palette: "maximal",
    artStyle: "scrapbook", material: "canvas", composition: "chaotic-collage",
    typography: { rotateBias: 4, handwrittenBias: true, framed: false },
    visualIntensity: "maximal", ambient: ["motes", "paperdrift", "bloom"],
  },
  postcard: {
    key: "postcard", label: "postcard", palette: "postcard",
    artStyle: "vintage-postcard", material: "faded-print", composition: "postcard",
    typography: { rotateBias: -2, handwrittenBias: true, framed: true },
    visualIntensity: "illustrated",
  },
  eighties: {
    key: "eighties", label: "80s / memphis", palette: "eighties",
    artStyle: "screenprint-poster", material: "screenprint-grain", composition: "diorama",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "collage", ambient: ["bloom"],
  },
};

export const LOOK_KEYS = Object.keys(LOOKS) as LookKey[];

/** THE LOUDNESS LADDER — the four Looks ordered by how much they put on
 *  the page. A Look is picked by moving along it, never by a dice roll. */
const LADDER: LookKey[] = ["minimal", "postcard", "eighties", "maximal"];

/** the same ladder with the one dark Look removed — for content that must
 *  read bright/warm (reflective essays, credos) no matter how loud it gets. */
const LIGHT_LADDER: LookKey[] = ["minimal", "postcard", "maximal"];

/** Where a mood starts on the ladder. */
const MOOD_BASE: Record<MoodKey, number> = {
  quiet: 0,
  romantic: 1,
  warm: 1,
  dreamy: 1,
  cinematic: 2,
  raw: 2,
  restless: 2,
  playful: 3,
  chaotic: 3,
};

/** How far the PLACE pushes it. A still story told in a loud place is not
 *  the same page as a still story told at a window, and the system should
 *  say so. */
const ENERGY_SHIFT: Record<Energy, number> = {
  quiet: 0,
  warm: 1,
  vivid: 1,
  electric: 2,
};

/**
 * The smart default: when the writer hasn't chosen, the story's own mood
 * and its own setting decide the Look together.
 *
 * This replaced a strict 1:1 `Record<MoodKey, LookKey>`. Nine moods onto
 * four looks meant every story sharing a mood shared a treatment exactly
 * — and because `quiet` is the most commonly inferred mood, most
 * auto-directed stories landed on the identical bare page. (Observed:
 * three of five published stories all resolved to
 * quiet/minimal/minimal/paper/stage.) That is D2's own complaint that the
 * system "reads too uniform across stories."
 *
 * A seeded random pick was tried first and rejected: with four looks it
 * still clusters at realistic story counts, and — the real objection —
 * choosing a visual treatment by hash violates "every effect needs a
 * reason (narrative, not novelty)." Two quiet stories now diverge because
 * they are set in different places, which is a reason a reader could
 * actually feel.
 *
 * Fully deterministic, no seed involved: the same story always resolves
 * to the same Look.
 */
export function autoLook(mood: MoodKey, energy: Energy = "warm", opts: { lightOnly?: boolean } = {}): Look {
  const base = MOOD_BASE[mood] ?? 1;
  if (opts.lightOnly) {
    // placeless/reflective: no "place energy" to push it, and never dark.
    const i = Math.min(LIGHT_LADDER.length - 1, Math.max(0, base));
    return LOOKS[LIGHT_LADDER[i]];
  }
  const i = Math.min(LADDER.length - 1, Math.max(0, base + (ENERGY_SHIFT[energy] ?? 1)));
  return LOOKS[LADDER[i]];
}
