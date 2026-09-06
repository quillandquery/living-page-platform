/**
 * BACKDROPS
 *
 * A story can declare the world it happens in. `backdrop: nightroad` in the
 * frontmatter and the piece is read against a night sky with the road
 * running away underneath it.
 *
 * Not wallpaper: every layer is tied to `--depth`, the same reading-progress
 * value the veil and the ground already use. The sky turns from night to
 * dawn as you descend, the stars go out, the moon rises, the road keeps
 * coming. A reader who scrolls the piece watches the night end.
 *
 * A backdrop also declares its own `scheme`, because a night sky is not a
 * light-mode or dark-mode decision — it is what the story is made of. A
 * piece that happens at 4am renders dark whatever the reader's OS says.
 *
 * To add one: compose existing layers. Add a layer only when a story needs
 * a thing the kit cannot draw.
 */

export const LAYERS = ["sky", "stars", "moon", "sun", "ridge", "road", "sea", "rain", "haze"] as const;
export type Layer = (typeof LAYERS)[number];

export type Backdrop = {
  label: string;
  /** the world overrides the reader's theme */
  scheme: "dark" | "light";
  layers: Layer[];
  /** the sky warms toward the horizon as the piece goes on */
  dawn?: boolean;
};

export const BACKDROPS: Record<string, Backdrop> = {
  none: { label: "none", scheme: "light", layers: [] },

  nightroad: { label: "night road", scheme: "dark", layers: ["sky", "stars", "moon", "ridge", "road"], dawn: true },
  nightsky:  { label: "night sky",  scheme: "dark", layers: ["sky", "stars", "moon"], dawn: true },
  monsoon:   { label: "monsoon",    scheme: "dark", layers: ["sky", "haze", "rain"] },

  coast:     { label: "coast",      scheme: "light", layers: ["sky", "haze", "sea"] },
  highland:  { label: "highland",   scheme: "light", layers: ["sky", "haze", "ridge"] },
  heat:      { label: "heat",       scheme: "light", layers: ["sky", "sun", "haze"] },
};

export const BACKDROP_NAMES = Object.keys(BACKDROPS);

export const getBackdrop = (name?: string): Backdrop | null => {
  const b = name ? BACKDROPS[name] : null;
  return b && b.layers.length ? b : null;
};

/**
 * The token overrides a backdrop's scheme needs, as a CSS declaration string.
 * Injected at :root by the story page so the whole document — body included —
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
