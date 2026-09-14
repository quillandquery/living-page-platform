/**
 * ART STYLE — the medium the story is drawn in. Changing this changes
 * artwork treatment, material default, which compositions it favours, and
 * a couple of typography habits — not just a filter over the same page
 * (§8 of the visual-system PRD). Seven, curated (D6): enough to feel like a
 * real medium each, few enough to stay one coherent site.
 */

import type { ArtStyleDirection, ArtStyleKey, CompositionKey, MaterialKey } from "./types";

export type ArtStyleSpec = ArtStyleDirection & {
  /** cue words that pull the engine toward this style */
  cues: RegExp[];
  materialDefault: MaterialKey;
  compositions: CompositionKey[];
  typography: { rotateBias: number; handwrittenBias: boolean; framed: boolean };
  /** emotions this style is a strong fit for — used as a scoring nudge */
  moodAffinity: string[];
};

export const ART_STYLES: Record<ArtStyleKey, ArtStyleSpec> = {
  "editorial-clean": {
    key: "editorial-clean", label: "editorial", artworkTreatment: "line", strokeWidth: 1.6,
    cues: [/\b(ordinary|nothing|quiet|calm|saturday)\b/i],
    materialDefault: "paper",
    compositions: ["stage", "edge-world"],
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    moodAffinity: ["peaceful", "hopeful"],
  },
  "vintage-postcard": {
    key: "vintage-postcard", label: "vintage postcard", artworkTreatment: "line", strokeWidth: 1.3,
    cues: [/\b(postcard|nostalgi|paris|old town|faded|remember|memory)\b/i],
    materialDefault: "faded-print",
    compositions: ["postcard", "edge-world"],
    typography: { rotateBias: -2, handwrittenBias: true, framed: true },
    moodAffinity: ["nostalgic", "melancholic", "regretful"],
  },
  "ink-comic": {
    key: "ink-comic", label: "comic", artworkTreatment: "filled", strokeWidth: 2.6,
    cues: [/\b(absurd|ridiculous|funny|laugh|hilarious|accidentally|overdressed)\b/i],
    materialDefault: "newsprint",
    compositions: ["stage", "collision"],
    typography: { rotateBias: 3, handwrittenBias: false, framed: false },
    moodAffinity: ["absurd", "funny", "chaotic"],
  },
  scrapbook: {
    key: "scrapbook", label: "scrapbook", artworkTreatment: "filled", strokeWidth: 1.8,
    cues: [/\b(scrapbook|ticket|kept|saved|collected|torn|taped)\b/i],
    materialDefault: "canvas",
    compositions: ["scrapbook", "collision"],
    typography: { rotateBias: 4, handwrittenBias: true, framed: false },
    moodAffinity: ["chaotic", "ecstatic", "nostalgic"],
  },
  "screenprint-poster": {
    key: "screenprint-poster", label: "screen print", artworkTreatment: "filled", strokeWidth: 2.2,
    cues: [/\b(road trip|highway|drove across|poster|desert|journey)\b/i],
    materialDefault: "screenprint-grain",
    compositions: ["journey", "diorama"],
    typography: { rotateBias: 0, handwrittenBias: false, framed: false },
    moodAffinity: ["hopeful", "ecstatic", "chaotic"],
  },
  "storybook-paint": {
    key: "storybook-paint", label: "storybook", artworkTreatment: "filled", strokeWidth: 1.6,
    cues: [/\b(grandmother|childhood|kitchen|smelled|warm|kettle|cardamom)\b/i],
    materialDefault: "canvas",
    compositions: ["diorama", "stage"],
    typography: { rotateBias: -1, handwrittenBias: true, framed: false },
    moodAffinity: ["nostalgic", "peaceful", "romantic"],
  },
  "surreal-collage": {
    key: "surreal-collage", label: "surreal collage", artworkTreatment: "filled", strokeWidth: 1.9,
    cues: [/\b(surreal|dream|dreamt|underwater|enormous|impossible|floating)\b/i],
    materialDefault: "film-grain",
    compositions: ["floating", "chaotic-collage"],
    typography: { rotateBias: 5, handwrittenBias: false, framed: false },
    moodAffinity: ["anxious", "lonely", "absurd"],
  },
};

export const ART_STYLE_KEYS = Object.keys(ART_STYLES) as ArtStyleKey[];
