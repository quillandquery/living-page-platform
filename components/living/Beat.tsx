import React from "react";
import { DEFAULT_BODY, DEFAULT_MOVE, type Body, type Gesture, type Move, type Voice } from "@/lib/vocabulary";
import { Doodle } from "@/components/doodles/Doodle";

export type BeatProps = {
  children?: React.ReactNode;
  voice?: Voice;
  body?: Body;
  move?: Move;
  gesture?: Gesture;
  /** name from the doodle registry */
  doodle?: string;
  /** GESTURE become: what the doodle turns into */
  becomes?: string;
  side?: "left" | "right";
  /** a second doodle on the opposite margin — COLLIDE wants two */
  doodle2?: string;
  seed?: number;
  className?: string;
};

/** deterministic scatter so a rebuild doesn't reshuffle the page */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

function wordify(node: React.ReactNode, scatter: boolean, key = "w"): React.ReactNode {
  if (typeof node === "string") {
    const parts = node.split(/(\s+)/);
    let i = 0;
    return parts.map((p, k) => {
      if (/^\s*$/.test(p)) return p;
      const idx = i++;
      const style: React.CSSProperties & Record<string, string | number> = { ["--i"]: idx };
      if (scatter) {
        const h = hash(key + p + idx);
        // handed to CSS rather than set directly, so the arrival
        // animation can land ON the scatter instead of wiping it
        style["--tf"] = `translate(${((h - 0.5) * 1.6).toFixed(2)}em, ${((hash(p + idx) - 0.5) * 0.7).toFixed(2)}em) rotate(${((h - 0.5) * 7).toFixed(1)}deg)`;
      }
      return (
        <span className="word" key={`${key}-${k}`} style={style}>
          {p}
        </span>
      );
    });
  }
  if (Array.isArray(node)) return node.map((n, k) => <React.Fragment key={k}>{wordify(n, scatter, `${key}-${k}`)}</React.Fragment>);
  return node;
}

/**
 * A beat is the atom of the page: one thing said, in one voice, with one
 * body, optionally answered by one doodle in the margin. Everything on
 * the site is made of these.
 */
export function Beat({
  children, voice = "speak", body, move, gesture, doodle, becomes, doodle2, side = "right", seed = 7, className,
}: BeatProps) {
  const b = body ?? DEFAULT_BODY[voice];
  const m = move ?? DEFAULT_MOVE[voice];
  const scatter = b === "scattered" || voice === "drift";

  // move/gesture live on the beat (they choreograph the whole cell);
  // voice/body live on the words (they are typography, and must not
  // constrain the three-track grid around them)
  const classes = ["beat", `mv-${m}`, gesture ? `g-${gesture}` : "", className ?? ""]
    .filter(Boolean).join(" ");
  const wordClasses = ["words", `v-${voice}`, `b-${b}`].join(" ");

  const left = doodle2 ? doodle2 : side === "left" ? doodle : undefined;
  const right = doodle2 ? doodle : side === "right" ? doodle : undefined;

  return (
    <div className={classes}>
      {left ? (
        <span className="margin left">
          <Doodle name={left} seed={seed} becomes={side === "left" ? becomes : undefined} />
        </span>
      ) : null}
      <div className={wordClasses}>{wordify(children, scatter)}</div>
      {right ? (
        <span className="margin right">
          <Doodle name={right} seed={seed + 5} becomes={side === "right" ? becomes : undefined} />
        </span>
      ) : null}
    </div>
  );
}

export default Beat;
