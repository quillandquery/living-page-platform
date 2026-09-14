/**
 * ARTWORK — doodles evolved into something with a spatial role (§9/§10).
 * Candidates come from the semantic profile's OBJECTS (and, failing that, a
 * per-environment fallback so a story never ships with zero artwork); each
 * gets a placement drawn from the composition's placement pool and a
 * treatment from the art style. Every piece must trace to a reason (§38) —
 * here, always "semantic" (an object the story actually named) or
 * "compositional" (the environment's fallback icon, used only when the
 * story gave the extractor nothing to work with).
 */
import type { Signal } from "../semantic-profile";
import type { ArtworkPiece, ArtworkPlacement } from "./types";
import type { ArtworkTreatment } from "@/components/doodles/Doodle";
import type { CompositionSpec } from "./compositions";

/** every environment's default object, for a story with no strong OBJECT
 *  signal — never an empty page, never a random one (§38). */
export const ENVIRONMENT_FALLBACK_ARTWORK: Record<string, string> = {
  coast: "wave", underwater: "fish", forest: "tree", highland: "mountain",
  meadow: "flower", heat: "sun", desertroad: "car", dawn: "sun",
  city: "person", window: "window", cafe: "cup", palace: "chandelier",
  monsoon: "umbrella", nightcity: "eye", nightroad: "moon", nightsky: "moon",
  dreamscape: "spiral",
};

function pick<T>(arr: T[], seed: number, i: number): T {
  return arr[Math.abs(seed + i * 2654435761) % arr.length];
}

export function pickArtwork(
  objects: Signal<string>[],
  environment: string,
  composition: CompositionSpec,
  treatment: ArtworkTreatment,
  seed: number,
  count = 4,
  /** when the writer's chosen visual density calls for more pieces than the
   *  story actually named, repeat the strongest real signal (or the
   *  environment fallback, if the story named nothing) rather than invent
   *  unrelated decoration — a recurring motif still traces to a reason (§38),
   *  it just repeats more insistently at higher density. */
  pad = false,
): ArtworkPiece[] {
  const real = objects.slice(0, count).map((s) => s.key);
  const usedFallback = real.length === 0;
  const names = real.length ? [...real] : [ENVIRONMENT_FALLBACK_ARTWORK[environment] ?? "spiral"];
  if (pad) {
    while (names.length < count) names.push(names[0]);
  }

  const pool = composition.placements;
  const used = new Set<ArtworkPlacement>();
  return names.map((doodle, i) => {
    // spread placements across the pool before repeating one
    let placement = pick(pool, seed, i);
    if (used.size < pool.length) {
      let tries = 0;
      while (used.has(placement) && tries < pool.length) {
        placement = pool[(pool.indexOf(placement) + 1) % pool.length];
        tries++;
      }
    }
    used.add(placement);
    const reason: ArtworkPiece["reason"] =
      i === 0 ? (usedFallback ? "compositional" : "semantic") : i < real.length ? "semantic" : "stylistic";
    return { doodle, placement, treatment, reason } satisfies ArtworkPiece;
  });
}
