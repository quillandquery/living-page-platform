/**
 * PALETTE — a first-class colour identity for a story.
 *
 * Colour used to be a by-product: one fixed cream `--stock` tinted a few
 * percent by accent, so every story read as the same warm paper. A palette
 * instead OWNS the ground. And a palette is a *family*, not a fixed swatch:
 * each defines a base hue plus a spread, and every story rotates its own
 * hue within that spread from its seed (in OKLCH, so lightness and chroma —
 * the thing that makes a palette recognisable — stay put while the colour
 * shifts). Two "maximal" stories are both lavender-family, never identical.
 *
 * `paletteVars` emits exactly the CSS custom properties the reader already
 * injects (see `worldVars` in lib/backdrops.ts), so every derivation in
 * globals.css keeps holding; only the bases move.
 */

/** [lightness, chroma] — hue is supplied per story from the seed */
type LC = [number, number];
/** [lightness, chroma, hueDelta] — hue is (story hue + delta) */
type LCd = [number, number, number];

export type Palette = {
  key: string;
  label: string;
  scheme: "light" | "dark";
  /** a stable hex for the `accent` field / cards (the family's centre) */
  baseAccent: string;
  baseAccent2: string;
  /** family centre hue (deg) and how far a story may rotate from it */
  hue: number;
  hueSpread: number;
  accent: LC;
  accent2: LCd;
  pop: LCd;
  /** the ground: fixed hexes (neutral grounds) or [L,C] that tracks the hue */
  ground: { hex: [string, string, string] } | { lc: [LC, LC, LC] };
  inkBase: string; softBase: string; muteBase: string;
  grain: number;
  mix: { p: number; p2: number; p3: number; ink: number; soft: number; mute: number };
};

export const PALETTES: Record<string, Palette> = {
  // near-white, editorial; the accent barely shows but its hue is the story's
  minimal: {
    key: "minimal", label: "paper white", scheme: "light",
    baseAccent: "#3B5168", baseAccent2: "#3B5168", hue: 250, hueSpread: 55,
    accent: [0.42, 0.05], accent2: [0.42, 0.05, 0], pop: [0.55, 0.16, 20],
    ground: { hex: ["#FCFBF9", "#F3F1EC", "#E9E7E1"] },
    inkBase: "#16161A", softBase: "#58565C", muteBase: "#9C9A9E",
    grain: 0.015, mix: { p: 0, p2: 2, p3: 4, ink: 0, soft: 8, mute: 14 },
  },
  // bright pastel collage ground that shifts blue↔lilac↔pink; deep indigo ink
  maximal: {
    key: "maximal", label: "lavender collage", scheme: "light",
    baseAccent: "#5B3FE0", baseAccent2: "#E8619F", hue: 275, hueSpread: 50,
    accent: [0.52, 0.19], accent2: [0.62, 0.17, 100], pop: [0.82, 0.15, 185],
    ground: { lc: [[0.83, 0.085], [0.79, 0.10], [0.74, 0.115]] },
    inkBase: "#201E52", softBase: "#454391", muteBase: "#6D6BB4",
    grain: 0.05, mix: { p: 5, p2: 10, p3: 16, ink: 8, soft: 32, mute: 44 },
  },
  // aged paper + a shifting warm/teal accent pair — a real vintage postcard
  postcard: {
    key: "postcard", label: "aged postcard", scheme: "light",
    baseAccent: "#A66A3B", baseAccent2: "#5C7E75", hue: 45, hueSpread: 28,
    accent: [0.56, 0.11], accent2: [0.54, 0.06, 165], pop: [0.50, 0.15, 5],
    ground: { hex: ["#ECE3D0", "#E2D7C0", "#D4C6AB"] },
    inkBase: "#37301F", softBase: "#6A5D45", muteBase: "#978B72",
    grain: 0.06, mix: { p: 3, p2: 8, p3: 14, ink: 6, soft: 26, mute: 40 },
  },
  // near-black ground, neon that ranges orange↔pink↔lime per story
  eighties: {
    key: "eighties", label: "neon memphis", scheme: "dark",
    baseAccent: "#F4551E", baseAccent2: "#2FB877", hue: 35, hueSpread: 55,
    accent: [0.68, 0.21], accent2: [0.72, 0.19, 150], pop: [0.86, 0.17, 60],
    ground: { hex: ["#121014", "#18161B", "#211E25"] },
    inkBase: "#F5F1E8", softBase: "#CBC6BC", muteBase: "#8F8B83",
    grain: 0.04, mix: { p: 6, p2: 10, p3: 16, ink: 0, soft: 20, mute: 30 },
  },
};

/** deterministic [0,1) from the story seed */
function rnd(seed: number): number {
  let h = (seed >>> 0) || 1;
  h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
  return (h >>> 0) / 4294967296;
}
const oklch = (L: number, C: number, H: number) => `oklch(${L} ${C} ${(((H % 360) + 360) % 360).toFixed(1)})`;

/** the full CSS custom-property block for a palette at a story's seed —
 *  same shape the reader already injects for a world. */
export function paletteVars(p: Palette, seed = 0): string {
  const H = p.hue + (rnd(seed) - 0.5) * 2 * p.hueSpread;
  const accent = oklch(p.accent[0], p.accent[1], H);
  const accent2 = oklch(p.accent2[0], p.accent2[1], H + p.accent2[2]);
  const pop = oklch(p.pop[0], p.pop[1], H + p.pop[2]);
  const [s1, s2, s3] = "hex" in p.ground
    ? p.ground.hex
    : (p.ground.lc.map(([L, C]) => oklch(L, C, H)) as [string, string, string]);
  const m = p.mix;
  return [
    `--accent:${accent}`,
    `--accent2:${accent2}`,
    `--counter:${accent2}`,
    `--pop:${pop}`,
    `--stock:${s1}`, `--stock-2:${s2}`, `--stock-3:${s3}`,
    `--ink-base:${p.inkBase}`, `--soft-base:${p.softBase}`, `--mute-base:${p.muteBase}`,
    `--grain:${p.grain}`,
    `color-scheme:${p.scheme}`,
    `--paper:color-mix(in oklab, var(--accent) calc(${m.p}% + var(--depth) * 5%), var(--stock))`,
    `--paper-2:color-mix(in oklab, var(--accent) ${m.p2}%, var(--stock-2))`,
    `--paper-3:color-mix(in oklab, var(--accent) ${m.p3}%, var(--stock-3))`,
    `--ink:color-mix(in oklab, var(--accent) ${m.ink}%, var(--ink-base))`,
    `--ink-soft:color-mix(in oklab, var(--accent) ${m.soft}%, var(--soft-base))`,
    `--mute:color-mix(in oklab, var(--accent) ${m.mute}%, var(--mute-base))`,
    `--rule:color-mix(in oklab, var(--accent) 40%, transparent)`,
    `--rule-2:color-mix(in oklab, var(--accent) 16%, transparent)`,
    `--shade:color-mix(in oklab, var(--accent) 12%, transparent)`,
  ].join(";");
}
