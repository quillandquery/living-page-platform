/**
 * PERSISTENT SIGNATURE — the one visual element that makes a story
 * recognisable throughout the page (§16), replacing "every story gets the
 * same animated yellow circles." Picked from the artwork candidates
 * (preferring an object the NARRATIVE axis gives a reason to transform),
 * with a simple, honest arc: grows / shrinks / fades / separates /
 * converges / steady, rendered by `components/living/Signature.tsx` as a
 * small fixed element bound to `--depth`.
 */
import type { ArtworkPiece, SignatureDirection } from "./types";
import type { Signal } from "../semantic-profile";

const NARRATIVE_ARC: Record<string, SignatureDirection["arc"]> = {
  departure: "shrinks",
  breakup: "separates",
  reunion: "converges",
  transformation: "fades",
  discovery: "grows",
  escape: "shrinks",
  arrival: "grows",
  grief: "fades",
  celebration: "grows",
  boredom: "steady",
  absurdity: "grows",
  failure: "fades",
};

export function pickSignature(
  artwork: ArtworkPiece[],
  narrative: Signal<string>[],
  fallbackDoodle: string,
): SignatureDirection {
  const piece = artwork[0];
  const doodle = piece?.doodle ?? fallbackDoodle;
  const topNarrative = narrative[0]?.key;
  const arc = (topNarrative && NARRATIVE_ARC[topNarrative]) || "steady";
  const reason = topNarrative
    ? `the story's ${topNarrative} carries through as this recurring ${doodle}`
    : `${doodle} recurs as the story's throughline`;
  return { doodle, reason, arc };
}
