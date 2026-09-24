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
import type { StoryType } from "../types";
import { ART_STYLES } from "./art-styles";
import { PALETTES, paletteVars } from "./palettes";
import { autoLook, getLook, type LookKey } from "./looks";
import { pickSubject } from "./subject";
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

export type Register = "narrative" | "reflective";

/**
 * NARRATIVE vs REFLECTIVE — which register the piece is written in.
 *
 * The whole engine was tuned for first-person travel narrative. A credo, an
 * essay, a list of advice ("small sparks") is a different animal: placeless,
 * second-person, imperative, aphoristic — and it fell through every
 * travel-shaped net onto wrong defaults (a "city" it isn't set in, a
 * "romantic" mood from the word "love", a dark neon look).
 *
 * The writer's chosen mode is authoritative where it is decisive: `thought`
 * is the reflective on-ramp, `story`/`moment` are narrative. `freeform`
 * ("just start") and an unset mode fall through to a structural read — a
 * placeless piece thick with "you/your" and imperatives is reflective.
 * Deterministic, no LLM (D1).
 */
export function detectRegister(
  raw: string,
  profile: SemanticStoryProfile,
  mode?: StoryType,
): Register {
  if (mode === "thought") return "reflective";
  if (mode === "story" || mode === "moment") return "narrative";
  const text = (raw || "").toLowerCase();
  const words = profile.wordCount || 1;
  const placeScore = profile.place[0]?.score ?? 0;
  const objects = profile.objects.length;
  const you = (text.match(/\b(you|your|yourself|yourselves)\b/g) ?? []).length;
  const imperatives = (raw.match(
    /(^|\n)\s*(become|spread|mention|spend|find|create|try|always|never|give|share|connect|make|do|say|smile|remember|start|notice|keep|choose|be)\b/gi,
  ) ?? []).length;
  const placeless = placeScore < 3 && objects <= 1;
  const advisory = you / words > 0.02 || imperatives >= 2;
  return placeless && advisory ? "reflective" : "narrative";
}

export function generateArtDirection(
  raw: string,
  profile: SemanticStoryProfile,
  opts: {
    seed?: number;
    environmentOverride?: string;
    moodOverride?: import("./atmosphere").MoodKey;
    visualIntensity?: VisualIntensity;
    lookOverride?: LookKey;
    /** the writer's entry mode — steers register (D3 mode, now non-cosmetic) */
    mode?: StoryType;
  } = {},
): StoryArtDirection {
  const seed = (opts.seed ?? seedHash(raw)) >>> 0;
  const register = detectRegister(raw, profile, opts.mode);
  const reflective = register === "reflective";

  // — environment —
  const envScored = scoreEnvironments(raw, profile);
  // A reflective piece names places only in passing ("go back to Oxford",
  // "walk down the street"); without a dominant, repeated setting it belongs
  // in the placeless `reverie`, not whatever travel world one stray word hit.
  const topPlace = envScored[0]?.score ?? 0;
  const reflectivePlaceless = reflective && topPlace < 3;
  const envKey = opts.environmentOverride
    ?? (reflectivePlaceless
      ? "reverie"
      : seededPick(envScored.map((e) => ({ item: e.key, score: e.score || 0.01 })), seed, 0.92));
  const backdrop = getBackdrop(envKey) ?? BACKDROPS.dawn;

  // — atmosphere —
  const mood = opts.moodOverride ?? inferMood(profile.emotion, backdrop.scheme === "dark");
  const atmosphere = buildAtmosphere(mood);

  // — art style / look / WORLD — a Look owns the medium, palette, type and
  //   format. Without a writer override the engine scores every world against
  //   the story (mood, place, entry mode, the actual words) and picks — no
  //   longer collapsing nine moods onto four fixed pages.
  const look = getLook(opts.lookOverride)
    ?? autoLook({ mood, energy: backdrop.energy, environment: envKey, type: opts.mode, raw, seed, lightOnly: reflective });
  const artStyleSpec = ART_STYLES[look.artStyle];
  const intensity: VisualIntensity = opts.visualIntensity ?? look.visualIntensity;

  // — palette — the story's colour identity: it owns the ground, not just the accent
  const paletteSpec = PALETTES[look.palette];
  const palette = {
    key: paletteSpec.key, label: paletteSpec.label,
    scheme: paletteSpec.scheme, vars: paletteVars(paletteSpec, seed),
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
  const sparkRefrain = /✨|\bspark(?:s|le|les|led|ing)?\b/i.test(raw);
  const signatureFallback = sparkRefrain ? "star" : (ENVIRONMENT_FALLBACK_ARTWORK[envKey] ?? "spiral");
  const signature = pickSignature(artwork, profile.narrative, signatureFallback);

  // — hero subject — the one big illustration that carries the story behind
  //   the words: a creature drifts, a landmark draws itself in on scroll.
  const subject = pickSubject(raw, profile, look.subjectBias ?? "rise", seed >>> 5, paletteSpec.scheme, signatureFallback);

  // colour comes from the palette now, not the world — that is the whole fix
  const accent = paletteSpec.baseAccent;
  const secondaryAccent = paletteSpec.baseAccent2;

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
    subject,
    visualIntensity: intensity,
    palette,
    look: look.key,
    format: look.format,
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
    `SUBJECT       ${d.subject ? `${d.subject.doodle} (${d.subject.mode})` : "(none)"}`,
    `FORMAT        ${d.format ?? "standard"}`,
    `ACCENT        ${d.accent}${d.secondaryAccent ? ` / ${d.secondaryAccent}` : ""}`,
  ].join("\n");
}
