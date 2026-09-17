/**
 * STORY ART DIRECTION — the data model.
 *
 * The core shift (Story Visual System 2.0): semantic extraction answers
 * "what is in this story?" (`lib/semantic-profile.ts`); art direction
 * answers "how should it exist visually?" This file is the second answer's
 * shape. Nine axes. Typography stays governed by `lib/vocabulary.ts` (the
 * four-axis voice/body/gesture/move system) — art direction only nudges it
 * (`typography` below), it never replaces it.
 */

import type { AmbientMotif } from "@/components/living/Backdrop";
import type { ArtworkTreatment } from "@/components/doodles/Doodle";

export type EnvironmentDirection = {
  /** a key into `lib/backdrops.ts` BACKDROPS */
  key: string;
  label: string;
  viewpoint?: string;
};

export type AtmosphereDirection = {
  mood: string;
  /** how saturated/loud the world gets to be */
  energy: "quiet" | "warm" | "vivid" | "electric";
  /** how much of the page is allowed to sit empty */
  spatialOpenness: "sparse" | "balanced" | "dense";
  motionIntensity: "still" | "slow" | "active" | "urgent";
};

export type ArtStyleKey =
  | "editorial-clean" | "vintage-postcard" | "ink-comic" | "scrapbook"
  | "screenprint-poster" | "storybook-paint" | "surreal-collage";

export type ArtStyleDirection = {
  key: ArtStyleKey;
  label: string;
  artworkTreatment: ArtworkTreatment;
  strokeWidth: number;
};

export type ArtworkPlacement =
  | "margin-left" | "margin-right" | "corner-tl" | "corner-tr" | "corner-bl" | "corner-br"
  | "behind-text" | "full-bleed";

export type ArtworkPiece = {
  /** a key into `components/doodles/registry.ts` DOODLES */
  doodle: string;
  placement: ArtworkPlacement;
  treatment: ArtworkTreatment;
  /** why this piece exists — never decoration for its own sake (§38) */
  reason: "semantic" | "atmospheric" | "narrative" | "stylistic" | "compositional";
};

export type MaterialKey =
  | "paper" | "faded-print" | "newsprint" | "canvas" | "screenprint-grain" | "film-grain";

export type MaterialDirection = {
  key: MaterialKey;
  label: string;
  grain: number;
  contrast: number;
};

export type CompositionKey =
  | "stage" | "postcard" | "scrapbook" | "journey" | "edge-world"
  | "collision" | "floating" | "diorama" | "chaotic-collage";

export type CompositionDirection = {
  key: CompositionKey;
  label: string;
};

export type TypographyDirection = {
  /** artwork/typography overlap — captions rotate, labels sit askew */
  rotateBias: number;
  handwrittenBias: boolean;
  framed: boolean;
};

export type SignatureDirection = {
  doodle: string;
  reason: string;
  /** how the signature changes as the reader gets deeper into the piece */
  arc: "grows" | "shrinks" | "fades" | "separates" | "converges" | "steady";
};

export type PaletteDirection = {
  /** key into lib/art-direction/palettes.ts PALETTES */
  key: string;
  label: string;
  scheme: "light" | "dark";
  /** the full CSS custom-property block the reader injects (self-contained,
   *  so a stored row never breaks if the palette registry later changes) */
  vars: string;
};

export type StoryArtDirection = {
  environment: EnvironmentDirection;
  atmosphere: AtmosphereDirection;
  artStyle: ArtStyleDirection;
  artwork: ArtworkPiece[];
  ambientMotion: AmbientMotif[];
  material: MaterialDirection;
  composition: CompositionDirection;
  typography: TypographyDirection;
  signature: SignatureDirection;
  /** the story's colour identity — owns the ground, not just the accent */
  palette: PaletteDirection;
  /** which named Look produced this, if any (minimal/maximal/postcard/eighties) */
  look?: string;
  /** for the reader: --accent / --accent2, unaffected by any of the above */
  accent: string;
  secondaryAccent?: string;
  /** the seed everything above was derived from, so re-running is a no-op */
  seed: number;
};

/** `stories.art_direction` defaults to `{}` for a row that predates this
 *  system (D4 — additive migration, nothing backfilled). Every reader of
 *  the column should go through this guard rather than assume the shape. */
export function isCompleteArtDirection(x: unknown): x is StoryArtDirection {
  return !!x && typeof x === "object" && "environment" in x && "artStyle" in x && "signature" in x;
}
