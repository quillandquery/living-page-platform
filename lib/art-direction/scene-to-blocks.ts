/**
 * SCENE GRAPH → BLOCKS  (the per-beat timeline drives the page)
 *
 * The brain's scene graph is an ordered list of beats, each with a narrative
 * type and an energy. This maps it onto the renderer's Block[] — but the
 * governing principle is RESTRAINT, per the locked vision:
 *
 *   • DESIGN-TOKENS §7: a mood's "budget" (share of beats allowed to leave
 *     plain `speak`) is 0.18–0.46 — i.e. MOST beats stay plain.
 *   • PRD §32: readable at all times · quiet and loud alternate · 2–3 genuine
 *     moments of surprise (not a page made entirely of surprises).
 *
 * So the scene graph is used to ALLOCATE SCARCITY, which is the one thing a
 * keyword engine can't do and a narrative read can:
 *
 *   LOUD   (shout + oversized): only the energy-arc peak(s) and true climaxes
 *          (reveal / turn) — capped at 2 per page. These are the surprises.
 *   TEXTURE(a quiet, distinct voice, NOT enlarged): the naturally-quiet beats
 *          — a reflection goes handwritten, a silence is centered and held, a
 *          repetition echoes — capped by the budget.
 *   PLAIN  (speak / normal, readable ~1.1rem): everything else, the default.
 *          A plain beat still carries a per-type MOVE, so it animates on scroll
 *          — motion conveys the beat without inflating its size.
 *
 * Result: a mostly-readable page that breathes, with a couple of genuine loud
 * moments where the story actually peaks. Same Block[] the renderer eats.
 */

import type { Block } from "@/lib/story-blocks.mjs";
import type { Voice, Body, Move } from "@/lib/vocabulary";

export type SceneBeat = {
  text: string;
  type: string;
  emotion: string;
  energy: number;
  visualBehavior: {
    scale?: number;
    motion?: string;
    position?: string;
    density?: number;
    opacity?: number;
    emphasis?: number;
  };
};

export type SceneGraph = {
  beats: SceneBeat[];
  arc: number[];
  profile: Record<string, unknown>;
  meta: Record<string, unknown>;
};

/** Per-beat scroll motion by narrative type — animates the beat WITHOUT
 *  changing its size (so a plain beat still "does something"). */
const MOVE: Record<string, Move> = {
  arrival: "enter", observation: "rise", waiting: "hold", movement: "move",
  repetition: "ripple", anticipation: "rise", interruption: "snap",
  discovery: "grow", turn: "transform", rush: "stretch", release: "fall",
  reflection: "smear", reveal: "grow", silence: "hold",
};

/** The quiet, distinct voices the naturally-quiet beats earn — medium at most,
 *  never the giant display sizes. These are texture, not surprise. */
const TEXTURE: Record<string, { voice: Voice; body: Body }> = {
  reflection:   { voice: "thought", body: "handwritten" },
  silence:      { voice: "listen",  body: "centered" },
  waiting:      { voice: "whisper", body: "tiny" },
  anticipation: { voice: "whisper", body: "normal" },
  repetition:   { voice: "echo",    body: "offset" },
};
const TEXTURE_TYPES = new Set(Object.keys(TEXTURE));

const PEAK_MIN = 0.22;     // a loud peak must clear this absolute energy…
const PEAK_OVER_MEAN = 0.12; // …AND stand this far above the story's own baseline,
                             // so a uniformly calm story gets NO shout at all.
const MAX_LOUD = 2;        // at most this many shout/oversized beats per page
const BUDGET = 0.35;       // share of beats allowed to leave plain speak (DESIGN-TOKENS §7)

function block(beat: SceneBeat, i: number, tier: "loud" | "texture" | "plain"): Block {
  let voice: Voice = "speak";
  let body: Body = "normal";
  if (tier === "loud") {
    voice = "shout";
    body = "oversized";
  } else if (tier === "texture") {
    const t = TEXTURE[beat.type];
    if (t) { voice = t.voice; body = t.body; }
  }
  return {
    kind: "beat",
    voice,
    text: beat.text,
    bare: false,
    body,
    move: MOVE[beat.type] ?? "enter",
    side: i % 2 === 0 ? "right" : "left",
  } as unknown as Block;
}

export function sceneToBlocks(scene: SceneGraph): Block[] {
  const beats = scene.beats ?? [];
  const n = beats.length;
  if (!n) return [];
  const energy = beats.map((b) => b.energy ?? 0);

  // — LOUD: the genuine surprises. The single highest-energy beat (if it clears
  //   PEAK_MIN) plus any reveal/turn climax, capped at MAX_LOUD. —
  const loud = new Set<number>();
  const mean = energy.reduce((a, e) => a + e, 0) / n;
  const peak = energy.reduce((best, e, i) => (e > energy[best] ? i : best), 0);
  if (energy[peak] >= PEAK_MIN && energy[peak] >= mean + PEAK_OVER_MEAN) loud.add(peak);
  beats.forEach((b, i) => { if (b.type === "reveal" || b.type === "turn") loud.add(i); });
  if (loud.size > MAX_LOUD) {
    const keep = [...loud].sort((a, b) => energy[b] - energy[a]).slice(0, MAX_LOUD);
    loud.clear();
    keep.forEach((i) => loud.add(i));
  }

  // — TEXTURE: the naturally-quiet beats, up to the remaining budget. —
  const cap = Math.max(2, Math.round(n * BUDGET));
  const texture = new Set<number>();
  for (let i = 0; i < n && texture.size < cap - loud.size; i++) {
    if (!loud.has(i) && TEXTURE_TYPES.has(beats[i].type)) texture.add(i);
  }

  // — assemble; a held pause before a low-energy silence gives it room. —
  const out: Block[] = [];
  beats.forEach((b, i) => {
    if (i > 0 && b.type === "silence" && (b.energy ?? 1) < 0.2) {
      out.push({ kind: "hold", beats: 1 } as unknown as Block);
    }
    const tier = loud.has(i) ? "loud" : texture.has(i) ? "texture" : "plain";
    out.push(block(b, i, tier));
  });
  return out;
}
