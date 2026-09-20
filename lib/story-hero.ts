/**
 * THE STORY HERO — direction.
 *
 *   StoryContext (what exists) → HeroDirection (how it opens) → renderer
 *
 * Deliberately thin: the "how should it look" work already lives in
 * `lib/art-direction/generate.ts` (environment, artwork, composition,
 * signature, palette — all of it already rendering on every story via
 * `Backdrop`/`Artwork`/`Signature`). The one thing missing from the first
 * viewport was the headline itself — the story's own hook line (`fragment`)
 * was being computed for `<title>` but never actually shown to a reader.
 * This file's only job is picking *which voice* says that headline, so a
 * quiet story opens quietly and a loud one doesn't.
 *
 * The pick reuses the existing, curated mood vocabulary
 * (`lib/art-direction/atmosphere.ts`'s nine `MoodKey`s) rather than
 * inventing a parallel classifier — one more instance of "the strongest
 * expression of the existing system," not a second visual system.
 */
import type { Voice, Body } from "./vocabulary";

export type HeroDirection = {
  /** which of the eight existing voices reads the headline */
  voice: Voice;
  /** only set when the voice's own default body would under-sell an
   *  opening line (plain `speak` reads as a paragraph, not a headline) */
  body?: Body;
  /** the writer's own hook line, verbatim — never rewritten */
  headline: string;
};

/** Whisper for the quiet/intimate moods, Drift for the dreamlike, Thought
 *  for the unspoken/regretful ("raw" — see atmosphere.ts's own
 *  EMOTION_TO_MOOD: melancholic/regretful land here), Shout for the moods
 *  that already read as loud or turning, plain Speak (bumped to an
 *  oversized body below) for everything in between. Six distinct
 *  treatments across nine moods — curated, not one-voice-per-mood (D6). */
const MOOD_TO_HERO_VOICE: Record<string, Voice> = {
  quiet: "whisper",
  romantic: "whisper",
  dreamy: "drift",
  raw: "thought",
  playful: "shout",
  restless: "shout",
  chaotic: "shout",
  cinematic: "speak",
  warm: "speak",
};

export function deriveHeroDirection(input: { title: string; mood?: string | null }): HeroDirection {
  const voice: Voice = (input.mood && MOOD_TO_HERO_VOICE[input.mood]) || "speak";
  // every voice but `speak` already has a body that reads as an opening
  // statement (shout→oversized, whisper→tiny-but-set-apart, drift→scattered,
  // thought→handwritten); `speak`'s own default ("normal") would blend
  // straight into body prose, so a mood-less or plain-mood story still gets
  // a headline-scale presence.
  const body: Body | undefined = voice === "speak" ? "oversized" : undefined;
  return { voice, body, headline: input.title.trim() };
}
