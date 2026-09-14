import { Doodle } from "@/components/doodles/Doodle";
import type { ArtworkPiece } from "@/lib/art-direction/types";

/**
 * ARTWORK LAYER — doodles evolved past "tiny side illustration" (§9/§10).
 * Where `Beat`'s margin doodle answers one line, this layer sits at the
 * scale of the whole page: a handful of larger pieces placed by the
 * composition (margins, corners, full-bleed, behind the text), each tied to
 * something the story actually named. Fixed and inert, like the backdrop —
 * the writing stays the thing being read.
 */

const PLACEMENT_CLASS: Record<ArtworkPiece["placement"], string> = {
  "margin-left": "art-margin art-margin-left",
  "margin-right": "art-margin art-margin-right",
  "corner-tl": "art-corner art-corner-tl",
  "corner-tr": "art-corner art-corner-tr",
  "corner-bl": "art-corner art-corner-bl",
  "corner-br": "art-corner art-corner-br",
  "behind-text": "art-behind",
  "full-bleed": "art-bleed",
};

export function Artwork({ pieces, seed, ink }: { pieces: ArtworkPiece[]; seed: string; ink?: string }) {
  if (!pieces.length) return null;
  const base = seed.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <div className="artwork-layer" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={`${p.doodle}-${i}`} className={PLACEMENT_CLASS[p.placement]} style={{ ["--ai" as string]: i }}>
          <Doodle name={p.doodle} seed={base + i * 41} treatment={p.treatment} ink={ink} size={p.placement === "full-bleed" ? 220 : 92} />
        </span>
      ))}
    </div>
  );
}

export default Artwork;
