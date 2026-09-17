/**
 * THE ART DIRECTION GENERATOR
 *
 *   extractStoryProfile(story)
 *          ↓
 *   generateArtDirection(profile, seed)
 *          ↓
 *   (StoryView / Backdrop / Artwork / Signature render it)
 *
 * Deterministic, heuristic, no LLM (D1/§21): the same story + seed always
 * produces the same direction. Diversity comes from weighting several
 * signals per axis and seed-breaking ties, not from randomness — two
 * stories with an identical profile would still render identically, which
 * is correct (§21) and different from two stories that merely share one
 * axis (§24, which is the common case and is fine).
 */
import { BACKDROPS, getBackdrop } from "../backdrops";
import type { SemanticStoryProfile } from "../semantic-profile";
import { ART_STYLES } from "./art-styles";
import { PALETTES, paletteVars } from "./palettes";
import { LOOKS, autoLook, type LookKey } from "./looks";
import { MATERIALS } from "./materials";
import { COMPOSITIONS } from "./compositions";
import { buildAtmosphere, inferMood } from "./atmosphere";
import { pickAmbientMotion } from "./ambient-motion";
import { pickArtwork, ENVIRONMENT_FALLBACK_ARTWORK } from "./artwork";
import { pickSignature } from "./signature";
import type { StoryArtDirection } from "./types";

function seedHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** the handful of PLACE signals that don't get their own environment —
 *  they fold into the nearest existing one, so the vocabulary stays
 *  curated (D6) without losing the signal entirely. */
const PLACE_ALIAS: Record<string, string> = {
  oldtown: "city", nightclub: "nightcity", train: "window",
  road: "desertroad", airport: "city", home: "cafe", office: "cafe",
};

export function scoreEnvironments(raw: string, profile: SemanticStoryProfile): { key: string; score: number }[] {
  const text = raw.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [key, b] of Object.entries(BACKDROPS)) {
    let s = 0;
    for (const cue of b.cues) if (text.includes(cue)) s += 1;
    scores[key] = s;
  }
  for (const sig of profile.place) {
    const key = PLACE_ALIAS[sig.key] ?? sig.key;
    if (key in scores) scores[key] += sig.score * 1.4;
  }
  return Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score);
}

/** seeded pick among candidates within `band` of the top score — ties break
 *  by seed, a clear winner still wins (§21, §24). */
function seededPick<T>(scored: { item: T; score: number }[], seed: number, band = 0.72): T {
  const top = scored[0].score || 1;
  const pool = scored.filter((s) => s.score >= top * band);
  return pool[Math.abs(seed) % pool.length].item;
}

/** the writer-facing Visuals dial (§14) — how much of the page the artwork
 *  is allowed to occupy. It steers artwork count/treatment and which of the
 *  art style's own compositions gets picked (sparser vs. denser), but it
 *  never invents artwork the story didn't earn (§38) and never overrides
 *  what the mood decided about motion — "maximal" is a louder page, not a
 *  busier one regardless of what the writing calls for. */
export type VisualIntensity = "minimal" | "illustrated" | "collage" | "maximal";
const INTENSITY_ARTWORK_COUNT: Record<VisualIntensity, number> = {
  minimal: 1, illustrated: 2, collage: 3, maximal: 4,
};
const INTENSITY_TREATMENT: Partial<Record<VisualIntensity, import("@/components/doodles/Doodle").ArtworkTreatment>> = {
  minimal: "line", collage: "filled", maximal: "filled",
};

export function generateArtDirection(
  raw: string,
  profile: SemanticStoryProfile,
  opts: {
    seed?: number;
    environmentOverride?: string;
    moodOverride?: import("./atmosphere").MoodKey;
    visualIntensity?: VisualIntensity;
    lookOverride?: LookKey;
  } = {},
): StoryArtDirection {
  const seed = (opts.seed ?? seedHash(raw)) >>> 0;

  // — environment —
  const envScored = scoreEnvironments(raw, profile);
  const envKey = opts.environmentOverride
    ?? seededPick(envScored.map((e) => ({ item: e.key, score: e.score || 0.01 })), seed, 0.92);
  const backdrop = getBackdrop(envKey) ?? BACKDROPS.dawn;

  // — atmosphere —
  const mood = opts.moodOverride ?? inferMood(profile.emotion, backdrop.scheme === "dark");
  const atmosphere = buildAtmosphere(mood);

  // — art style / look — a Look owns the medium; without one the mood picks it
  const look = opts.lookOverride ? LOOKS[opts.lookOverride] : autoLook(mood);
  const artStyleSpec = ART_STYLES[look.artStyle];
  const intensity: VisualIntensity = opts.visualIntensity ?? look.visualIntensity;

  // — palette — the story's colour identity: it owns the ground, not just the accent
  const paletteSpec = PALETTES[look.palette];
  const palette = {
    key: paletteSpec.key, label: paletteSpec.label,
    scheme: paletteSpec.scheme, vars: paletteVars(paletteSpec),
  };

  // — composition — the Look sets where the visual world lives
  const composition = COMPOSITIONS[look.composition];

  // — artwork —
  const artworkTreatment = INTENSITY_TREATMENT[intensity] || artStyleSpec.artworkTreatment;
  const artworkCount = INTENSITY_ARTWORK_COUNT[intensity];
  const artwork = pickArtwork(
    profile.objects, envKey, composition, artworkTreatment, seed >>> 7, artworkCount, true,
  );

  // — ambient motion — the Look may force it, otherwise infer from the world
  const ambientMotion = look.ambient ?? pickAmbientMotion(envKey, mood, atmosphere.motionIntensity, artStyleSpec.key);

  // — material —
  const material = MATERIALS[look.material] ?? MATERIALS[artStyleSpec.materialDefault];

  // — signature —
  const signature = pickSignature(artwork, profile.narrative, ENVIRONMENT_FALLBACK_ARTWORK[envKey] ?? "spiral");

  // colour comes from the palette now, not the world — that is the whole fix
  const accent = paletteSpec.accent;
  const secondaryAccent = paletteSpec.accent2;

  return {
    environment: { key: envKey, label: backdrop.label, viewpoint: backdrop.viewpoint },
    atmosphere,
    artStyle: { key: artStyleSpec.key, label: artStyleSpec.label, artworkTreatment, strokeWidth: artStyleSpec.strokeWidth },
    artwork,
    ambientMotion,
    material,
    composition: { key: composition.key, label: composition.label },
    typography: look.typography ?? artStyleSpec.typography,
    signature,
    palette,
    look: look.key,
    accent,
    secondaryAccent,
    seed,
  };
}

/** A readable dump for a development/debug view (§45) — never shown to a
 *  reader, just what a build tool or `app/dev/preview` can print. */
export function describeArtDirection(d: StoryArtDirection): string {
  return [
    `LOOK          ${d.look ?? "(auto)"} · palette ${d.palette?.label ?? "?"} (${d.palette?.scheme ?? "?"})`,
    `ENVIRONMENT   ${d.environment.label}${d.environment.viewpoint ? ` / ${d.environment.viewpoint}` : ""}`,
    `ATMOSPHERE    ${d.atmosphere.mood} · ${d.atmosphere.energy} energy · ${d.atmosphere.spatialOpenness} · ${d.atmosphere.motionIntensity}`,
    `STYLE         ${d.artStyle.label} (${d.artStyle.artworkTreatment})`,
    `ARTWORK       ${d.artwork.map((a) => `${a.doodle}@${a.placement}`).join(", ")}`,
    `AMBIENT       ${d.ambientMotion.join(", ") || "(none — stillness is the choice)"}`,
    `MATERIAL      ${d.material.label}`,
    `COMPOSITION   ${d.composition.label}`,
    `SIGNATURE     ${d.signature.doodle} (${d.signature.arc}) — ${d.signature.reason}`,
    `ACCENT        ${d.accent}${d.secondaryAccent ? ` / ${d.secondaryAccent}` : ""}`,
  ].join("\n");
}
