/**
 * READING WHAT THE ENGINE ALREADY DECIDED.
 *
 * Two previous attempts at picking a story's strongest line both failed
 * by inventing a new scorer: semantic-density scoring chose bureaucratic
 * travel logistics over the actual hook, and "take the opening line"
 * only worked on stories that happen to open with one.
 *
 * But `lib/annotate.ts` has already made this judgement. It moves a beat
 * off the default `speak` voice exactly when the writing earns it, and it
 * sets an explicit `body` only when the voice's own default will not do.
 * Those deviations ARE the engine's opinion about which sentences carry
 * the piece — reading them back is free, deterministic, and agrees with
 * the reader by construction.
 *
 * Measured on a real 32-beat story, the marked beats were:
 *   listen   "A lot of solo travel is a bad day with a good view."
 *   whisper  "If you're crying, you're crying alone in your room."
 *   listen   "And then something turns."
 *   thought+offset  "Can the girl who walked into the cave survive a Monday standup?"
 *   listen   "Nobody in the room needs to know it's there."
 * …against 16 unmarked `speak` beats of connective prose. The signal is
 * MARKEDNESS, not loudness: that story contains no `shout` at all.
 */
import type { Block } from "./story-blocks.mjs";
import { DEFAULT_BODY, type Voice, type Body } from "./vocabulary";

export type BeatPick = { text: string; voice?: string; body?: string; index: number };

/** How far off the unmarked default the engine moved this voice. `speak`
 *  is the resting state and scores nothing. */
const VOICE_SALIENCE: Record<string, number> = {
  shout: 5, thought: 5, whisper: 4, listen: 4,
  echo: 3.5, drift: 3, ledger: 2, speak: 0,
};

const BODY_SALIENCE: Record<string, number> = {
  oversized: 3, edge: 3, scattered: 2, floating: 2,
  offset: 2, centered: 2, handwritten: 1.5, tiny: 1.5,
  compressed: 1, normal: 0,
};

/** A quotable line is a sentence, not a clause and not a paragraph. */
function lengthFit(n: number): number {
  if (n < 18) return -2;
  if (n <= 95) return 2;
  if (n <= 130) return 0.5;
  return -2.5;
}

export function beatSalience(b: { text: string; voice?: string; body?: string }): number {
  const voice = b.voice ?? "speak";
  let score = VOICE_SALIENCE[voice] ?? 0;
  score += BODY_SALIENCE[b.body ?? ""] ?? 0;

  // An EXPLICIT body is the strongest tell there is: the engine declined
  // the voice's own default for this beat specifically. In the story
  // measured above exactly one beat of thirty-two had one, and it was
  // the line the piece turns on.
  const defaultBody = DEFAULT_BODY[voice as Voice] as Body | undefined;
  if (b.body && b.body !== defaultBody) score += 3;

  score += lengthFit(b.text.trim().length);
  return score;
}

function beatsOf(blocks: Block[] | null | undefined): BeatPick[] {
  if (!blocks?.length) return [];
  const out: BeatPick[] = [];
  blocks.forEach((b, i) => {
    if (b.kind === "beat" && b.text?.trim()) {
      out.push({ text: b.text.trim(), voice: b.voice, body: b.body, index: i });
    }
  });
  return out;
}

export type SetupTurn = {
  /** the premise — short, sets the frame */
  setup: string;
  /** the payoff — the line the piece turns on */
  turn: string;
};

/**
 * SETUP + TURN. A share frame is a two-beat story: the premise, then the
 * line that pays it off. The tension between them is the hook, and it
 * needs no motion to work — which matters, because a static PNG is what
 * WhatsApp, iMessage, Slack and Twitter actually render.
 *
 * The turn is taken from the back half of the piece (that is where a
 * story turns) but never the final beat, which is usually the resolution
 * and spoils it.
 */
export function pickSetupTurn(fragment: string, blocks: Block[] | null | undefined): SetupTurn {
  const beats = beatsOf(blocks);
  const title = fragment.trim();
  if (!beats.length) return { setup: title, turn: "" };

  const best = (pool: BeatPick[]) =>
    pool.length
      ? pool.reduce((a, b) => (beatSalience(b) >= beatSalience(a) ? b : a))
      : null;

  // The turn lives in the back half, minus the last beat (the landing).
  const from = Math.floor(beats.length * 0.4);
  const backHalf = beats.slice(from, Math.max(from + 1, beats.length - 1));
  const turn = best(backHalf) ?? best(beats);

  // The setup is the writer's own title when they gave a real one;
  // otherwise the strongest beat from the opening stretch.
  const opening = beats.slice(0, Math.max(1, from));
  const setup = title || best(opening)?.text || "";

  return {
    setup,
    turn: turn && turn.text !== setup ? turn.text : (best(opening)?.text ?? ""),
  };
}

/**
 * THE SCORE — the story's own rhythm, as a strip of marks.
 *
 * One mark per beat, its height the beat's salience. Unreadable by
 * design: it is not information, it is evidence that the piece was
 * COMPOSED rather than merely typed. A reader cannot say what it means
 * and can see instantly that something shaped this.
 */
export function scoreStrip(blocks: Block[] | null | undefined, max = 64): number[] {
  const beats = beatsOf(blocks);
  if (!beats.length) return [];
  const step = beats.length > max ? beats.length / max : 1;
  const out: number[] = [];
  for (let i = 0; i < Math.min(beats.length, max); i++) {
    const b = beats[Math.floor(i * step)];
    // normalise into 0.18–1 so even a quiet beat leaves a mark
    const s = Math.max(0, beatSalience(b));
    out.push(Math.min(1, 0.18 + (s / 10) * 0.82));
  }
  return out;
}
