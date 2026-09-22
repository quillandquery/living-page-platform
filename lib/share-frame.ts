/**
 * SHARE-FRAME DIRECTION — the mood-aware palette register.
 *
 * A raw or melancholic mood shouldn't render in the bright, sun-drenched
 * version of its world that a cheerful story in the same backdrop would
 * get. This nudges the frame darker/cooler for those moods, so the
 * atmosphere of the card matches the atmosphere of the writing — applied
 * as a veil inside the render, never as a whole second palette.
 */
export type MoodRegister = "loud" | "warm" | "muted" | "grave";

/** Read the mood off `art_direction.atmosphere.mood` (the nine curated
 *  MoodKey values — see `lib/story-hero.ts`). Falls back to `warm` when
 *  no mood is set, so a pre-Story-Visual-System-2.0 row still renders in
 *  the current bright register (no regression). */
export function moodRegister(mood?: string | null): MoodRegister {
  switch (mood) {
    case "raw": return "grave";
    case "quiet":
    case "romantic":
    case "dreamy":
    case "cinematic": return "muted";
    case "playful":
    case "restless":
    case "chaotic": return "loud";
    case "warm":
    default: return "warm";
  }
}

/** Veil opacity to lay over the scene per register, and how much the
 *  scene's own colours should darken. Used by `og-render.tsx` so the
 *  same story renders consistently across OG / Feed / Story. */
export function registerAdjust(register: MoodRegister): { veilAlpha: number; darken: number } {
  switch (register) {
    case "grave": return { veilAlpha: 0.30, darken: 0.16 };
    case "muted": return { veilAlpha: 0.16, darken: 0.08 };
    case "warm":  return { veilAlpha: 0.04, darken: 0.00 };
    case "loud":  return { veilAlpha: 0.00, darken: 0.00 };
  }
}
