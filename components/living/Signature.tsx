import { Doodle } from "@/components/doodles/Doodle";
import type { SignatureDirection } from "@/lib/art-direction/types";
import type { ArtworkTreatment } from "@/components/doodles/Doodle";

/**
 * THE PERSISTENT SIGNATURE (§16) — the one element that makes a story
 * recognisable the whole way down, replacing "every story gets the same
 * animated yellow circles." Fixed to the viewport, travels slowly down the
 * side of the page as `--depth` advances, and plays out its arc: grows,
 * shrinks, fades, separates into two, converges into one, or stays put.
 */
export function Signature({
  signature, seed, ink, treatment, side = "right",
}: {
  signature: SignatureDirection;
  seed: number;
  ink?: string;
  treatment: ArtworkTreatment;
  side?: "left" | "right";
}) {
  const twoUp = signature.arc === "separates" || signature.arc === "converges";
  const cls = `signature-layer signature-${side} signature-arc-${signature.arc}`;

  if (!twoUp) {
    return (
      <div className={cls} aria-hidden="true">
        <span className="signature">
          <Doodle name={signature.doodle} seed={seed} treatment={treatment} ink={ink} size={80} />
        </span>
      </div>
    );
  }
  return (
    <div className={cls} aria-hidden="true">
      <span className="signature signature-a">
        <Doodle name={signature.doodle} seed={seed} treatment={treatment} ink={ink} size={64} />
      </span>
      <span className="signature signature-b">
        <Doodle name={signature.doodle} seed={seed + 17} treatment={treatment} ink={ink} size={64} />
      </span>
    </div>
  );
}

export default Signature;
