/**
 * ATMOSPHERE — mood evolved past "warm/cool, dark/light, energy, density"
 * (§31) into a bundle that also carries spatial openness and motion
 * intensity. This is the one canonical source for the nine moods; the
 * editor's Mood control (`app/write/[id]/editor.tsx`) reads from here too,
 * so "quiet" means the same thing whether a writer picked it or the engine
 * inferred it.
 */
import type { AtmosphereDirection } from "./types";
import type { Signal } from "../semantic-profile";

export const MOODS = [
  "quiet", "dreamy", "raw", "playful", "cinematic", "warm", "romantic", "restless", "chaotic",
] as const;
export type MoodKey = (typeof MOODS)[number];

export type MoodSpec = {
  accent: string;
  secondaryAccent?: string;
  /** how alive the margins are, 0–10 — feeds `annotate()`'s doodleDensity */
  density: number;
  /** % of beats allowed a voice other than speak — feeds voiceBudget */
  budget: number;
} & Omit<AtmosphereDirection, "mood">;

export const MOOD_ATMOSPHERE: Record<MoodKey, MoodSpec> = {
  quiet:     { accent: "#4C6A8A", density: 4, budget: 35, energy: "quiet",    spatialOpenness: "sparse",   motionIntensity: "still" },
  dreamy:    { accent: "#7A6CE0", secondaryAccent: "#E86FA0", density: 7, budget: 51, energy: "vivid",    spatialOpenness: "balanced", motionIntensity: "slow" },
  raw:       { accent: "#D23B2E", density: 6, budget: 51, energy: "electric", spatialOpenness: "dense",    motionIntensity: "urgent" },
  playful:   { accent: "#E68A2E", secondaryAccent: "#3FA05C", density: 9, budget: 53, energy: "vivid",    spatialOpenness: "dense",    motionIntensity: "active" },
  cinematic: { accent: "#2E6E8E", density: 7, budget: 45, energy: "warm",     spatialOpenness: "balanced", motionIntensity: "slow" },
  warm:      { accent: "#C77D3A", density: 7, budget: 47, energy: "warm",     spatialOpenness: "balanced", motionIntensity: "slow" },
  romantic:  { accent: "#D0567F", density: 6, budget: 47, energy: "warm",     spatialOpenness: "balanced", motionIntensity: "slow" },
  restless:  { accent: "#2B5BD0", density: 8, budget: 53, energy: "vivid",    spatialOpenness: "dense",    motionIntensity: "urgent" },
  chaotic:   { accent: "#E24A3B", density: 10, budget: 60, energy: "electric", spatialOpenness: "dense",    motionIntensity: "urgent" },
};

/** the semantic EMOTION axis (`lib/semantic-profile.ts`) speaks a richer,
 *  more specific vocabulary than the nine curated moods — this is the fold
 *  from "what the story feels like" to "which mood bundle renders it." */
const EMOTION_TO_MOOD: Record<string, MoodKey> = {
  lonely: "quiet",
  peaceful: "quiet",
  nostalgic: "dreamy",
  anxious: "restless",
  ecstatic: "playful",
  funny: "playful",
  absurd: "playful",
  romantic: "romantic",
  melancholic: "raw",
  regretful: "raw",
  chaotic: "chaotic",
  hopeful: "warm",
  generous: "warm",
};

export function inferMood(emotion: Signal<string>[], environmentDark: boolean): MoodKey {
  for (const e of emotion) {
    const m = EMOTION_TO_MOOD[e.key];
    if (m) return m;
  }
  return environmentDark ? "cinematic" : "warm";
}

export function buildAtmosphere(mood: MoodKey): AtmosphereDirection {
  const spec = MOOD_ATMOSPHERE[mood];
  return { mood, energy: spec.energy, spatialOpenness: spec.spatialOpenness, motionIntensity: spec.motionIntensity };
}
