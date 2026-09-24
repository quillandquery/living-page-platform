/**
 * WORLDS
 *
 * A story happens somewhere. A world is a bundle of art direction: layers,
 * a light scheme, an ENERGY level, a primary accent, a secondary accent, and
 * a paper tint. The engine chooses one from the writing; the writer never has
 * to. There is no "none".
 *
 * `worldVars()` turns a world into the CSS custom properties the reader
 * injects at `:root` for a story — so a bright coast reads bright, a monsoon
 * reads dark, and five worlds side by side read as five different places while
 * still being recognisably Living Pages. The story's world always wins over
 * the reader's OS theme.
 */

export const LAYERS = [
  "sky", "stars", "moon", "sun", "ridge", "road", "sea", "rain", "haze",
  "trees", "city", "window", "field", "glow",
  // Story Visual System 2.0 — a small, curated widening (D6), each new
  // layer is a distinct *ambient motif*, not a recolour of an old one.
  "bubbles", "raylight", "shimmer", "drape",
] as const;
export type Layer = (typeof LAYERS)[number];

export type Energy = "quiet" | "warm" | "vivid" | "electric";

/** Where the reader is standing. Debug/render-plan metadata today; the
 *  layers below are what actually draws the vantage point. */
export type Viewpoint =
  | "open_horizon" | "shoreline" | "underwater_depth" | "treeline" | "ridge_top"
  | "field_level" | "moving_vehicle" | "street_level" | "through_glass"
  | "interior" | "grand_hall" | "night_street" | "open_sky" | "floating";

export type Backdrop = {
  label: string;
  /** the world overrides the reader's theme */
  scheme: "dark" | "light";
  /** how much colour the world pushes into the page */
  energy: Energy;
  layers: Layer[];
  /** the sky warms toward the horizon as the piece goes on */
  dawn?: boolean;
  /** the primary colour — the water, the ink of emphasis */
  accent: string;
  /** a second colour — the sun, the sand, the warm margin */
  secondaryAccent?: string;
  /** the ground this world is printed on */
  paperTint?: string;
  /** words that pull the engine toward this world */
  cues: string[];
  /** where the reader is standing — used by the art-direction debug plan */
  viewpoint?: Viewpoint;
};

export const BACKDROPS: Record<string, Backdrop> = {
  // — daylight & nature —
  coast:     { label: "sunlit coast", scheme: "light", energy: "vivid", accent: "#00A6D6", secondaryAccent: "#FFB23E", paperTint: "#F7F1D8",
    layers: ["sky", "sun", "haze", "sea"], viewpoint: "shoreline",
    cues: ["beach", "sea", "ocean", "coast", "shore", "sand", "wave", "surf", "salt", "tide", "swim"] },
  forest:    { label: "forest", scheme: "light", energy: "vivid", accent: "#1F9E5A", secondaryAccent: "#B6D14B", paperTint: "#EDF2DB",
    layers: ["sky", "haze", "trees"], viewpoint: "treeline",
    cues: ["forest", "jungle", "tree", "trees", "woods", "leaves", "trail", "moss", "pine", "green"] },
  highland:  { label: "highland", scheme: "light", energy: "warm", accent: "#4C6A8A", secondaryAccent: "#AFC0CE", paperTint: "#EBEFF2",
    layers: ["sky", "haze", "ridge"], viewpoint: "ridge_top",
    cues: ["mountain", "hill", "ghat", "ridge", "valley", "cliff", "peak", "highland", "altitude"] },
  meadow:    { label: "wildflower field", scheme: "light", energy: "vivid", accent: "#E4A81F", secondaryAccent: "#3FA05C", paperTint: "#F3F0D6",
    layers: ["sky", "sun", "field"], viewpoint: "field_level",
    cues: ["field", "meadow", "flowers", "grass", "picnic", "wildflower", "garden", "bloom"] },
  heat:      { label: "desert heat", scheme: "light", energy: "electric", accent: "#FF7A1A", secondaryAccent: "#FF4D5E", paperTint: "#FBF0DA",
    layers: ["sky", "sun", "haze"], viewpoint: "open_horizon",
    cues: ["desert", "heat", "hot", "noon", "dust", "dry", "dune", "scorching", "shimmer"] },
  desertroad:{ label: "desert highway", scheme: "light", energy: "electric", accent: "#E85A1A", secondaryAccent: "#C9A227", paperTint: "#F4E3C6",
    layers: ["sky", "sun", "shimmer", "road", "haze"], viewpoint: "moving_vehicle",
    cues: ["road trip", "drove across", "driving across", "highway", "open road", "rajasthan", "quit my job and drove"] },
  dawn:      { label: "dawn", scheme: "light", energy: "vivid", dawn: true, accent: "#E8734F", secondaryAccent: "#E86FA0", paperTint: "#F7E7DC",
    layers: ["sky", "sun", "haze", "field"], viewpoint: "open_sky",
    cues: ["dawn", "sunrise", "morning", "early", "first light", "rooster"] },

  // — travel & interior —
  city:      { label: "city", scheme: "light", energy: "warm", accent: "#3A5BD0", secondaryAccent: "#7183A6", paperTint: "#ECEDF3",
    layers: ["sky", "haze", "city"], viewpoint: "street_level",
    cues: ["city", "street", "downtown", "traffic", "crowd", "sidewalk", "avenue", "market", "old town", "paris", "cobbled"] },
  window:    { label: "rainy window", scheme: "light", energy: "quiet", accent: "#5B7C99", secondaryAccent: "#93A8B8", paperTint: "#ECEEEF",
    layers: ["window", "rain"], viewpoint: "through_glass",
    cues: ["window", "café", "cafe", "coffee", "train window", "indoors", "inside", "glass", "watching"] },
  cafe:      { label: "warm interior", scheme: "light", energy: "warm", accent: "#C77D3A", secondaryAccent: "#B98A55", paperTint: "#F3E9D6",
    layers: ["window", "glow"], viewpoint: "interior",
    // "home"/"kitchen"/"bedroom"/"room"/"office"/"desk"/"bed" were dropped —
    // audit (claude/world-differentiation-audit-2026-09-24.md) found these
    // generic domestic nouns firing on almost any personal narrative that
    // mentions being indoors at all, regardless of whether the scene reads
    // as a cozy "warm interior" specifically. Kept only the more distinctive
    // coziness words.
    cues: ["lamp", "tea", "apartment", "sofa"] },
  palace:    { label: "palace interior", scheme: "light", energy: "vivid", accent: "#C9A227", secondaryAccent: "#7A2E3A", paperTint: "#F6EFD8",
    layers: ["window", "drape", "glow"], viewpoint: "grand_hall",
    cues: ["palace", "chandelier", "ballroom", "royal", "overdressed", "grand hall", "throne"] },
  underwater:{ label: "underwater", scheme: "dark", energy: "vivid", accent: "#0E7C86", secondaryAccent: "#39FFB0",
    layers: ["raylight", "bubbles", "sea"], viewpoint: "underwater_depth",
    cues: ["underwater", "dive", "dived", "diving", "reef", "scuba", "beneath the surface", "submerged", "something enormous moving beneath"] },

  // — weather & night —
  monsoon:   { label: "monsoon", scheme: "dark", energy: "warm", accent: "#3E9BAB", secondaryAccent: "#7FB0B8",
    layers: ["sky", "haze", "rain"], viewpoint: "street_level",
    cues: ["rain", "monsoon", "storm", "downpour", "wet", "thunder", "drizzle", "umbrella", "flood"] },
  nightcity: { label: "neon city", scheme: "dark", energy: "electric", accent: "#C25AD0", secondaryAccent: "#31C8D8",
    layers: ["sky", "stars", "city"], viewpoint: "night_street",
    cues: ["neon", "nightlife", "bar", "club", "late night", "streetlight", "midnight city", "2am", "2:13", "didn't want the night to end"] },
  nightroad: { label: "night road", scheme: "dark", energy: "warm", dawn: true, accent: "#2B3ED0", secondaryAccent: "#E58A6C",
    layers: ["sky", "stars", "moon", "ridge", "road"], viewpoint: "moving_vehicle",
    cues: ["midnight", "night bus", "moonlit", "4am", "red-eye", "drove through the night", "asleep on the bus"] },
  nightsky:  { label: "night sky", scheme: "dark", energy: "quiet", dawn: true, accent: "#3145C0", secondaryAccent: "#8AA6E6",
    layers: ["sky", "stars", "moon"], viewpoint: "open_sky",
    cues: ["sky", "stars", "constellation", "quiet night", "rooftop at night"] },

  // — placeless / reflective —
  // A credo, an essay, a letter to no one in particular has no place — and
  // forcing it into "city" or "night road" is exactly why such pieces used
  // to render wrong. `reverie` is a bright, warm, abstract light: soft rays
  // over a glow, no literal scenery. Built from existing layers, so it needs
  // no new render code. It carries no cues — the engine reaches it through
  // the reflective fallback in art-direction/generate.ts, never by keyword,
  // so it can never steal a story that is actually set somewhere.
  reverie:   { label: "open light", scheme: "light", energy: "warm", accent: "#E0A24A", secondaryAccent: "#5FA98C", paperTint: "#F8F0DE",
    layers: ["glow", "raylight"], viewpoint: "open_horizon",
    cues: [] },

  // — surreal —
  dreamscape:{ label: "dreamscape", scheme: "dark", energy: "vivid", accent: "#7A6CE0", secondaryAccent: "#E86FA0",
    layers: ["glow", "stars", "field"], viewpoint: "floating",
    cues: ["dream", "dreamt", "surreal", "floating", "memory", "unreal", "blur", "imagine"] },
};

export const BACKDROP_NAMES = Object.keys(BACKDROPS);

export const getBackdrop = (name?: string): Backdrop | null => {
  const b = name ? BACKDROPS[name] : null;
  return b && b.layers.length ? b : null;
};

/** The accent a world leans toward, for when the writer hasn't set one. */
export const worldAccent = (name?: string): string | null =>
  (name && BACKDROPS[name]?.accent) || null;

/** How much of the accent bleeds into paper and ink, per energy level. */
const ENERGY: Record<Energy, { p: number; p2: number; p3: number; ink: number; soft: number; mute: number }> = {
  quiet:    { p: 5,  p2: 8,  p3: 12, ink: 9,  soft: 28, mute: 38 },
  warm:     { p: 8,  p2: 12, p3: 16, ink: 13, soft: 34, mute: 42 },
  vivid:    { p: 14, p2: 20, p3: 26, ink: 16, soft: 40, mute: 48 },
  electric: { p: 20, p2: 28, p3: 34, ink: 20, soft: 46, mute: 54 },
};

/**
 * A world → the full set of CSS custom properties for a story, injected at
 * `:root` by the reader. The story's world is authoritative: it sets the
 * scheme, the ground (paperTint), how vivid the colour is (energy), the
 * primary `--accent` (passed in, from the story), and the secondary
 * `--accent2` / `--counter` (the world's second colour). Every derivation in
 * globals.css keeps holding — this only moves the bases and the mix ratios.
 */
export function worldVars(b: Backdrop | null, accent: string): string {
  const dark = b?.scheme === "dark";
  const e = ENERGY[b?.energy ?? "warm"];
  const stock  = b?.paperTint ?? (dark ? "#0E1015" : "#EEEBE4");
  const stock2 = dark ? "#161922" : "#E6E2DA";
  const stock3 = dark ? "#20242F" : "#DAD5CB";
  const inkB   = dark ? "#EEEBE3" : "#191819";
  const softB  = dark ? "#B7B3AB" : "#4C4A4A";
  const muteB  = dark ? "#7F818C" : "#8A857D";
  const sec = b?.secondaryAccent;
  return [
    `--accent:${accent}`,
    `--accent2:${sec ?? "var(--counter)"}`,
    sec ? `--counter:${sec}` : "",
    `--stock:${stock}`, `--stock-2:${stock2}`, `--stock-3:${stock3}`,
    `--ink-base:${inkB}`, `--soft-base:${softB}`, `--mute-base:${muteB}`,
    `--grain:${dark ? ".055" : ".035"}`,
    `color-scheme:${dark ? "dark" : "light"}`,
    `--paper:color-mix(in oklab, var(--accent) calc(${e.p}% + var(--depth, 0) * 5%), var(--stock))`,
    `--paper-2:color-mix(in oklab, var(--accent) ${e.p2}%, var(--stock-2))`,
    `--paper-3:color-mix(in oklab, var(--accent) ${e.p3}%, var(--stock-3))`,
    `--ink:color-mix(in oklab, var(--accent) ${e.ink}%, var(--ink-base))`,
    `--ink-soft:color-mix(in oklab, var(--accent) ${e.soft}%, var(--soft-base))`,
    `--mute:color-mix(in oklab, var(--accent) ${e.mute}%, var(--mute-base))`,
    `--rule:color-mix(in oklab, var(--accent) 40%, transparent)`,
    `--rule-2:color-mix(in oklab, var(--accent) 16%, transparent)`,
    `--shade:color-mix(in oklab, var(--accent) 12%, transparent)`,
  ].filter(Boolean).join(";");
}

/**
 * Legacy scheme-only vars (kept for compatibility). The reader now uses
 * worldVars(); this remains for any caller that only knows a scheme.
 */
export function schemeVars(scheme: "dark" | "light"): string {
  return worldVars(scheme === "dark" ? { scheme: "dark", energy: "warm" } as Backdrop : null, "var(--accent)");
}
