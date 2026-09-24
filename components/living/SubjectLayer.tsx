import { Doodle } from "@/components/doodles/Doodle";
import type { SubjectDirection } from "@/lib/art-direction/types";

/**
 * THE HERO SUBJECT LAYER — the one big illustration that carries the story,
 * drawn large and translucent behind the words. Like atlasofskills.com/diving:
 * a whale shark swims behind the page; the Eiffel Tower sketches itself in as
 * you scroll. Three behaviours (see lib/art-direction/subject.ts):
 *   • drift — the creature moves across the page (filled silhouette)
 *   • draw  — the landmark's strokes reveal with scroll depth (line)
 *   • rise  — a quiet subject floats gently (line)
 * Fixed, inert to input, low opacity — the writing stays the thing being read.
 */
export function SubjectLayer({ subject, seed = "s" }: { subject?: SubjectDirection | null; seed?: string }) {
  if (!subject) return null;
  const base = seed.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 9);
  const treatment = subject.mode === "drift" ? "filled" : "line";
  return (
    <div
      className={`subject-layer subject-${subject.mode}`}
      aria-hidden="true"
      style={{ ["--subj-op" as string]: subject.opacity, ["--subj-scale" as string]: subject.scale }}
    >
      <span className="subject-art">
        <Doodle name={subject.doodle} seed={base} treatment={treatment} size={640} ink="currentColor" width={1.4} wobble={2.2} />
      </span>
    </div>
  );
}

export default SubjectLayer;
