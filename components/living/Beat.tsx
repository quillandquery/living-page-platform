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
  /** override the ink colour of this beat — "accent", "accent2", or a css colour */
  ink?: string;
  /** a bespoke co-located element the old engine couldn't do — "phone" | "flame".
   *  Rendered beside the words, with its own life (a phone pings, a flame flickers). */
  element?: "phone" | "flame";
  /** a per-beat behaviour the words perform — "tremor" | "heartbeat".
   *  Additive: absent leaves the beat exactly as the original engine rendered it. */
  behavior?: "tremor" | "heartbeat";
};

/** the bespoke elements — the new capability (Nightline's phone, the flame). */
const BEAT_ELEMENT: Record<NonNullable<BeatProps["element"]>, string> = {
  phone: `<svg viewBox="0 0 44 72"><rect x="4" y="2" width="36" height="68" rx="7" fill="#0c0d11" stroke="#2a2b33" stroke-width="1.5"/><rect x="9" y="12" width="26" height="34" rx="4" fill="rgba(94,208,230,.1)" stroke="rgba(94,208,230,.5)" stroke-width="1"/><circle cx="22" cy="60" r="3" fill="#2a2b33"/><circle class="beat-ping" cx="22" cy="26" r="4" fill="var(--pop,#E23A2E)"/></svg>`,
  flame: `<svg viewBox="0 0 40 60"><g class="beat-flick"><path d="M20 30 C12 22 16 12 20 2 C24 12 28 22 20 30 Z" fill="#F0A24A"/><path d="M20 26 C16 21 18 15 20 9 C22 15 24 21 20 26 Z" fill="#F6D27A"/></g><rect x="11" y="30" width="18" height="24" rx="3" fill="#2a2420" stroke="#5a4c3e" stroke-width="1.2"/></svg>`,
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
        style["--tf"] = `translate(${((h - 0.5) * 0.4).toFixed(2)}em, ${((hash(p + idx) - 0.5) * 0.34).toFixed(2)}em) rotate(${((h - 0.5) * 5).toFixed(1)}deg)`;
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
  children, voice = "speak", body, move, gesture, doodle, becomes, doodle2, side = "right", seed = 7, className, ink,
  element, behavior,
}: BeatProps) {
  const b = body ?? DEFAULT_BODY[voice];
  const m = move ?? DEFAULT_MOVE[voice];
  const scatter = b === "scattered" || voice === "drift";

  // move/gesture live on the beat (they choreograph the whole cell);
  // voice/body live on the words (they are typography, and must not
  // constrain the three-track grid around them)
  const classes = ["beat", `mv-${m}`, gesture ? `g-${gesture}` : "",
    behavior ? `beh-${behavior}` : "", element ? "has-el" : "", className ?? ""]
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
      <div className={wordClasses} style={ink ? ({ color: ink === "accent" ? "var(--accent)" : ink === "accent2" ? "var(--accent2)" : ink } as React.CSSProperties) : undefined}>
        {element ? <span className="beat-el" aria-hidden dangerouslySetInnerHTML={{ __html: BEAT_ELEMENT[element] }} /> : null}
        {wordify(children, scatter)}
        {behavior === "heartbeat" ? <span className="beat-hb"> ♥</span> : null}
      </div>
      {right ? (
        <span className="margin right">
          <Doodle name={right} seed={seed + 5} becomes={side === "right" ? becomes : undefined} />
        </span>
      ) : null}
    </div>
  );
}

export default Beat;
