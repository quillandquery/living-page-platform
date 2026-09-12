import type { Block } from "./story-blocks.mjs";

/**
 * READ TIME
 *
 * A rough, honest estimate from the story's own words — no separate field
 * to keep in sync when a piece is edited. Counts prose in `beat` and `raw`
 * blocks (tags stripped), ignores `hold` (silence) and `media`. Tuned
 * slower than silent-reading WPM because a Living Page pauses on purpose —
 * the animation and the held beats are part of the time, not just the words.
 */
const WPM = 165;

function wordsOf(text: string): number {
  const stripped = text.replace(/<[^>]+>/g, " ");
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function wordCount(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.kind === "beat" || b.kind === "raw") n += wordsOf(b.text);
  }
  return n;
}

export type ReadTime = { seconds: number; label: string };

/** { seconds: 45, label: "45 sec" } for a moment, { seconds: 240, label: "4 min" } for a story. */
export function estimateReadTime(blocks: Block[]): ReadTime {
  const words = wordCount(blocks);
  const seconds = Math.max(20, Math.round((words / WPM) * 60));
  const label = seconds < 60 ? `${seconds} sec` : `${Math.round(seconds / 60)} min`;
  return { seconds, label };
}
