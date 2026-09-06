/**
 * THE INTERACTION VOCABULARY
 *
 * Four independent axes. A beat picks one from each (or lets the
 * default stand). New entries are only added when an existing one
 * genuinely cannot express the story — that constraint is what makes
 * the site read as one medium rather than a pile of effects.
 */

/** How the writing sounds. */
export const VOICES = [
  "whisper",
  "speak",
  "shout",
  "thought",
  "drift",
  "echo",
  "listen",
  "ledger",
] as const;
export type Voice = (typeof VOICES)[number];

/** How the type occupies physical space. */
export const BODIES = [
  "tiny",
  "normal",
  "oversized",
  "scattered",
  "offset",
  "handwritten",
  "compressed",
  "centered",
  "edge",
  "floating",
] as const;
export type Body = (typeof BODIES)[number];

/** What the doodle does. The doodle is the second narrator. */
export const GESTURES = [
  "follow",
  "underline",
  "react",
  "become",
  "escape",
  "collide",
  "loop",
  "scribble",
  "reveal",
  "trace",
  "breathe",
] as const;
export type Gesture = (typeof GESTURES)[number];

/** What scrolling does to the beat. `hold` means: nothing. */
export const MOVES = [
  "enter",
  "grow",
  "move",
  "transform",
  "disappear",
  "hold",
] as const;
export type Move = (typeof MOVES)[number];

/** Each voice has a body it wants unless the beat says otherwise. */
export const DEFAULT_BODY: Record<Voice, Body> = {
  whisper: "tiny",
  speak: "normal",
  shout: "oversized",
  thought: "handwritten",
  drift: "scattered",
  echo: "offset",
  listen: "centered",
  ledger: "normal",
};

export const DEFAULT_MOVE: Record<Voice, Move> = {
  whisper: "enter",
  speak: "enter",
  shout: "grow",
  thought: "enter",
  drift: "move",
  ledger: "move",
  echo: "disappear",
  listen: "enter",
};

/**
 * Voices that cost the reader something. The ratio check in /studio
 * counts these against the total: the target is roughly 70% plain
 * speak, 20% a different voice, 10% a full interaction.
 */
export const COSTLY_VOICES: readonly Voice[] = ["shout", "echo", "listen", "drift"];

export type BeatSpec = {
  text: string;
  voice: Voice;
  body?: Body;
  move?: Move;
  gesture?: Gesture;
  doodle?: string;
  side?: "left" | "right";
  /** true when this beat is a deliberate silence rather than words */
  hold?: boolean;
  /** how long that silence runs. 1 is a breath, 4 is a held pause. */
  beats?: number;
};

export type SceneSpec = {
  id?: string;
  beats: BeatSpec[];
};

export type StoryMeta = {
  /** the filename, and the only place a slug is ever decided */
  slug: string;
  place: string;
  date: string;
  /** one line that works as a doorway, not a headline */
  fragment: string;
  /** the single colour this memory is allowed */
  accent: string;
  /** turn the veil off for a piece that wants to be seen whole */
  veil?: boolean;
  /** the world this piece happens in — a name from lib/backdrops.ts */
  backdrop?: string;
};
