import { Doodle } from "@/components/doodles/Doodle";
import type { SubjectDirection } from "@/lib/art-direction/types";

/**
 * THE HERO SUBJECT LAYER — the one big illustration that carries the story,
 * drawn large and translucent behind the words. Like atlasofskills.com/diving:
 * a whale shark swims behind the page; the Eiffel Tower sketches itself in as
 * you scroll. Two renderings of the same three behaviours (drift/draw/rise):
 *
 *   - a curated PNG cutout (lib/art-direction/subject.ts SUBJECT_IMAGES) —
 *     a real photograph, background removed once and checked in — when one
 *     exists for this subject. `draw` reveals it bottom-to-top via a mask
 *     tied to --depth (a photo can't stroke-draw, but it can build up).
 *   - the hand-drawn SVG doodle otherwise — `draw` reveals it stroke by
 *     stroke via stroke-dashoffset, also tied to --depth.
 *
 * Either way: fixed, inert to input, translucent — the writing stays the
 * thing being read.
 */
export function SubjectLayer({ subject, seed = "s" }: { subject?: SubjectDirection | null; seed?: string }) {
  if (!subject) return null;
  const base = seed.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 9);
  const treatment = subject.mode === "drift" ? "filled" : "line";
  const style = { ["--subj-op" as string]: subject.opacity, ["--subj-scale" as string]: subject.scale };

  if (subject.image) {
    return (
      <div className={`subject-layer subject-photo subject-${subject.mode}`} aria-hidden="true" style={style}>
        <span className="subject-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={subject.image.src} alt="" />
        </span>
      </div>
    );
  }

  return (
    <div className={`subject-layer subject-${subject.mode}`} aria-hidden="true" style={style}>
      <span className="subject-art">
        <Doodle name={subject.doodle} seed={base} treatment={treatment} size={640} ink="currentColor" width={1.4} wobble={2.2} />
      </span>
    </div>
  );
}

export default SubjectLayer;
