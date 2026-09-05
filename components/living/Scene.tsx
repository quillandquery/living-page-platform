import React from "react";
import { Doodle } from "@/components/doodles/Doodle";
import type { Gesture } from "@/lib/vocabulary";

/**
 * A story is made of scenes, not paragraphs. A scene is a unit of
 * attention: it holds its beats and, usually, ends in a pause.
 */
export function Scene({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section className="scene" id={id} data-scene={id}>
      {children}
    </section>
  );
}

/** `## THE MANTA` in MDX becomes a quiet scene mark, not a headline. */
export function StoryH2({ children }: { children?: React.ReactNode }) {
  return (
    <div className="beat">
      <div className="words">
        <p className="scene-mark">{children}</p>
      </div>
    </div>
  );
}

/**
 * PAUSE. Nothing happens here and that is the point. `beats` is roughly
 * how long the reader scrolls through nothing: 1 is a breath, 4 is a
 * held silence before something lands.
 */
export function Hold({ beats = 2 }: { beats?: number }) {
  return <div className="hold" style={{ height: `${beats * 22}vh` }} aria-hidden="true" />;
}

/**
 * A doodle beat with no words. This is how the second narrator gets
 * ahead of the first: the reader sees something before the sentence
 * admits it.
 */
export function Margin({
  doodle, side = "right", gesture, becomes, seed = 11, size = 120,
}: {
  doodle: string; side?: "left" | "right"; gesture?: Gesture; becomes?: string; seed?: number; size?: number;
}) {
  return (
    <div className={`beat mv-hold${gesture ? ` g-${gesture}` : ""}`}>
      <span className={`margin ${side}`}>
        <Doodle name={doodle} seed={seed} becomes={becomes} size={size} />
      </span>
      <div className="words" aria-hidden="true" />
    </div>
  );
}
