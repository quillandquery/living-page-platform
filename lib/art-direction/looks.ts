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
  minimal: {
    key: "minimal", label: "minimal", palette: "minimal",
    artStyle: "editorial-clean", material: "paper", composition: "stage",
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    visualIntensity: "minimal", ambient: [],
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

/** the smart default: when the writer hasn't chosen, the mood picks a Look,
 *  so auto stories still diverge instead of all sharing the cream ground. */
const MOOD_TO_LOOK: Record<MoodKey, LookKey> = {
  quiet: "minimal",
  cinematic: "eighties",
  raw: "eighties",
  dreamy: "maximal",
  playful: "maximal",
  chaotic: "maximal",
  restless: "maximal",
  romantic: "postcard",
  warm: "postcard",
};

export function autoLook(mood: MoodKey): Look {
  return LOOKS[MOOD_TO_LOOK[mood] ?? "minimal"];
}
