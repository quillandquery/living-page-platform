/**
 * THE SHARE COMPOSITION.
 *
 *   SETUP + TURN (`share-beats.ts`) + the writer's own PLACE/DATE + a
 *   deterministic issue number → everything `og-render.tsx` needs to
 *   draw one frame.
 *
 * v4 of this file picked between three competing layouts (cinematic /
 * quoteLed / journal) per story. That's the wrong axis: the PRD's own
 * quality bar is "one visual grammar per page" (§32), and three
 * grammars for the SAME page depending on line length reads as three
 * products, not one. There is exactly one composition now — the ruled
 * masthead over the story's own illustrated world — and it flexes by
 * scaling type to the line's length, the way a real page layout does,
 * not by swapping templates.
 */

/** "GOKARNA · MARCH" — the writer's own place + date, uppercased. No
 *  inference, no invented duration; either field alone still works. */
export function lifeLabel(place: string, date: string | null | undefined): string {
  const p = (place ?? "").trim();
  const d = (date ?? "").trim();
  if (p && d) return `${p} · ${d}`.toUpperCase();
  return (p || d || "").toUpperCase();
}

/** "LIVING PAGE / 047" — deterministic per story, so the same story
 *  always carries the same number, and a reader seeing several over
 *  time reads them as issues of one thing. */
export function pageMark(seed: number): string {
  const n = (seed % 999) + 1;
  return `LIVING PAGE / ${String(n).padStart(3, "0")}`;
}

/** The one-tap reactions a reader can stamp onto a card at share time
 *  (rev.3 concept — "the reaction-stamp loop"). Fixed, small, and
 *  written in the reader's own voice, not a marketing label. */
export const REACTIONS = ["same", "oof", "sending this", "i felt this"] as const;
export type Reaction = (typeof REACTIONS)[number];
export function isReaction(v: string | null | undefined): v is Reaction {
  return !!v && (REACTIONS as readonly string[]).includes(v);
}

export type ShareComposition = {
  /** the premise — short, sets the frame */
  setup: string;
  /** the payoff — the line the piece turns on; this is the hero */
  turn: string;
  /** the writer's own title, used as the masthead headline */
  title: string;
  lifeLabel: string;
  pageMark: string;
  /** the landing line, set as the handwritten note under the turn */
  coda: string;
  /** one mark per beat, height by salience — evidence the piece was composed */
  strip: number[];
  /** a reader's one-tap reaction, baked on as a stamp; absent for the
   *  writer's own share and for surfaces generated before any reader
   *  reacted (the OG/link-unfurl image, which is generated once, not
   *  per-viewer) */
  reaction?: Reaction | null;
};

export function composeShare(input: {
  setup: string;
  turn: string;
  title: string;
  coda?: string;
  place: string;
  date?: string | null;
  seed: number;
  strip: number[];
  reaction?: Reaction | null;
}): ShareComposition {
  return {
    setup: input.setup.trim(),
    turn: input.turn.trim(),
    title: input.title.trim(),
    coda: (input.coda ?? "").trim(),
    lifeLabel: lifeLabel(input.place, input.date),
    pageMark: pageMark(input.seed),
    strip: input.strip,
    reaction: input.reaction ?? null,
  };
}
