/**
 * WORLDS
 *
 * A story happens somewhere. A world is not wallpaper and not a background
 * picker — it is a small bundle of art direction: a set of drawn layers, a
 * light scheme, a suggested accent, and the words that pull a story toward it.
 * The engine (the editor's Auto inference) chooses one from the writing; the
 * writer never has to. There is no "none".
 *
 * Every layer is tied to `--depth`, the reading-progress value the veil and
 * the ground already use, so scrolling a piece moves through its weather.
 *
 * Bright-biased on purpose: most stories are not told at 4am. Add a world by
 * composing layers, not by inventing effects — the constraint is what keeps
 * the site one medium instead of a pile of backgrounds.
 */

export const LAYERS = [
  "sky", "stars", "moon", "sun", "ridge", "road", "sea", "rain", "haze",
  "trees", "city", "window", "field", "glow",
] as const;
export type Layer = (typeof LAYERS)[number];

export type Backdrop = {
  label: string;
  /** the world overrides the reader's theme */
  scheme: "dark" | "light";
  layers: Layer[];
  /** the sky warms toward the horizon as the piece goes on */
  dawn?: boolean;
  /** the colour this world leans toward unless the mood overrides it */
  accent: string;
  /** words that pull the engine toward this world */
  cues: string[];
};

export const BACKDROPS: Record<string, Backdrop> = {
  // — daylight & nature —
  coast:     { label: "sunlit coast", scheme: "light", layers: ["sky", "sun", "haze", "sea"], accent: "#1C86C4",
    cues: ["beach", "sea", "ocean", "coast", "shore", "sand", "wave", "surf", "salt", "tide", "swim"] },
  forest:    { label: "forest", scheme: "light", layers: ["sky", "haze", "trees"], accent: "#2E7D4F",
    cues: ["forest", "jungle", "tree", "trees", "woods", "leaves", "trail", "moss", "pine", "green"] },
  highland:  { label: "highland", scheme: "light", layers: ["sky", "haze", "ridge"], accent: "#4C6A8A",
    cues: ["mountain", "hill", "ghat", "ridge", "valley", "cliff", "peak", "highland", "altitude"] },
  meadow:    { label: "wildflower field", scheme: "light", layers: ["sky", "sun", "field"], accent: "#C9962B",
    cues: ["field", "meadow", "flowers", "grass", "picnic", "wildflower", "garden", "bloom"] },
  heat:      { label: "desert heat", scheme: "light", layers: ["sky", "sun", "haze"], accent: "#D2691E",
    cues: ["desert", "heat", "hot", "noon", "dust", "dry", "dune", "scorching", "shimmer"] },
  dawn:      { label: "dawn", scheme: "light", layers: ["sky", "sun", "haze", "field"], dawn: true, accent: "#E0876B",
    cues: ["dawn", "sunrise", "morning", "early", "first light", "rooster"] },

  // — travel & interior —
  city:      { label: "city", scheme: "light", layers: ["sky", "haze", "city"], accent: "#3A5BD0",
    cues: ["city", "street", "downtown", "traffic", "crowd", "sidewalk", "avenue", "market", "old town"] },
  window:    { label: "rainy window", scheme: "light", layers: ["window", "rain"], accent: "#5B7C99",
    cues: ["window", "café", "cafe", "coffee", "train window", "indoors", "inside", "glass", "watching"] },
  cafe:      { label: "warm interior", scheme: "light", layers: ["window", "glow"], accent: "#C77D3A",
    cues: ["kitchen", "bedroom", "home", "lamp", "warm", "bed", "tea", "apartment", "sofa", "room"] },

  // — weather & night —
  monsoon:   { label: "monsoon", scheme: "dark", layers: ["sky", "haze", "rain"], accent: "#3E8E9E",
    cues: ["rain", "monsoon", "storm", "downpour", "wet", "thunder", "drizzle", "umbrella", "flood"] },
  nightcity: { label: "neon city", scheme: "dark", layers: ["sky", "stars", "city"], accent: "#B65CC0",
    cues: ["neon", "nightlife", "bar", "club", "late night", "streetlight", "midnight city"] },
  nightroad: { label: "night road", scheme: "dark", layers: ["sky", "stars", "moon", "ridge", "road"], dawn: true, accent: "#2B3ED0",
    cues: ["night", "midnight", "road", "drive", "bus", "highway", "stars", "moon", "4am", "asleep", "dark"] },
  nightsky:  { label: "night sky", scheme: "dark", layers: ["sky", "stars", "moon"], dawn: true, accent: "#2B3ED0",
    cues: ["sky", "stars", "constellation", "quiet night", "rooftop at night"] },

  // — surreal —
  dreamscape:{ label: "dreamscape", scheme: "dark", layers: ["glow", "stars", "field"], accent: "#7A6CE0",
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

/**
 * The token overrides a dark world needs, as a CSS declaration string.
 * Injected at :root by the reader so the whole document — body included —
 * arrives in the story's world rather than flashing the reader's theme first.
 * Only the BASES move; every derivation in globals.css still holds.
 */
export function schemeVars(scheme: "dark" | "light"): string {
  if (scheme === "light") return "";
  return [
    "--stock:#0E1015",
    "--stock-2:#161922",
    "--stock-3:#20242F",
    "--ink-base:#EEEBE3",
    "--soft-base:#B7B3AB",
    "--mute-base:#7F818C",
    "--grain:.055",
    "color-scheme:dark",
    "--counter:#E58A6C",
    "--counter:oklch(from var(--accent) 0.76 0.13 calc(h + 158))",
  ].join(";");
}
