/**
 * AMBIENT MOTION — "what is naturally alive in this world?"
 *
 * A story's environment already animates itself (waves in `bd-sea`, rain in
 * `bd-rain`, city windows lighting with `--depth`, grass swaying in
 * `bd-field` — see `components/living/Backdrop.tsx`). This module picks the
 * small set of *additional*, universal motifs — bloom, motes, headlights,
 * paper drift — that used to render on every single story regardless of
 * fit. Absence of motion is a valid choice (§13): a lonely, still story can
 * come back empty.
 */
import type { AmbientMotif } from "@/components/living/Backdrop";
import type { ArtStyleKey } from "./types";

export function pickAmbientMotion(
  environment: string,
  mood: string,
  motionIntensity: "still" | "slow" | "active" | "urgent",
  artStyle: ArtStyleKey,
): AmbientMotif[] {
  const motifs = new Set<AmbientMotif>();

  // a night street gets traffic it was never told to draw
  if (environment === "nightcity" || environment === "nightroad") motifs.add("headlights");

  // the collage/scrapbook mediums are made of loose paper
  if (artStyle === "scrapbook" || artStyle === "surreal-collage") motifs.add("paperdrift");

  // dreamlike, floating, warm moods want motes; "quiet" (still) does not
  const wantsMotes = ["dreamy", "playful", "romantic", "warm", "cinematic"].includes(mood) || motionIntensity === "active";
  if (wantsMotes && motionIntensity !== "still") motifs.add("motes");

  // a bloom of light reads as "alive" — skip it for the starkest, quietest pages
  if (motionIntensity !== "still") motifs.add("bloom");

  return Array.from(motifs);
}
