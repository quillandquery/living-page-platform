/**
 * PALETTE — a first-class colour identity for a story.
 *
 * Until now colour was a by-product: one fixed cream `--stock` in
 * globals.css, tinted a few percent by the world's accent. Every story
 * therefore read as the same warm paper. A palette instead OWNS the ground
 * — stock, ink, accent, grain, scheme — so a story can be near-white,
 * bright lavender, aged sepia, or black-with-neon, not just "cream with a
 * hint of blue". It emits exactly the same CSS custom properties the
 * reader already injects (see `worldVars` in lib/backdrops.ts), so every
 * derivation in globals.css keeps holding; only the bases move.
 */

export type Palette = {
  key: string;
  label: string;
  scheme: "light" | "dark";
  stock: string; stock2: string; stock3: string;
  inkBase: string; softBase: string; muteBase: string;
  accent: string; accent2: string; pop: string;
  grain: number;
  /** how much accent bleeds into ground (p*) and type (ink/soft/mute), % */
  mix: { p: number; p2: number; p3: number; ink: number; soft: number; mute: number };
};

export const PALETTES: Record<string, Palette> = {
  // near-white, editorial, the accent barely present — restraint as identity
  minimal: {
    key: "minimal", label: "paper white", scheme: "light",
    stock: "#FCFBF9", stock2: "#F3F1EC", stock3: "#E9E7E1",
    inkBase: "#16161A", softBase: "#58565C", muteBase: "#9C9A9E",
    accent: "#3B5168", accent2: "#3B5168", pop: "#C24A3B",
    grain: 0.015,
    mix: { p: 0, p2: 2, p3: 4, ink: 0, soft: 8, mute: 14 },
  },
  // bright lavender collage ground, deep indigo ink — loud and playful
  maximal: {
    key: "maximal", label: "lavender collage", scheme: "light",
    stock: "#C9CCFF", stock2: "#BEC1FB", stock3: "#B0B3F4",
    inkBase: "#201E52", softBase: "#454391", muteBase: "#6D6BB4",
    accent: "#5B3FE0", accent2: "#E8619F", pop: "#F0B429",
    grain: 0.05,
    mix: { p: 5, p2: 10, p3: 16, ink: 8, soft: 32, mute: 44 },
  },
  // aged paper + dusty teal, faded — a real vintage postcard
  postcard: {
    key: "postcard", label: "aged postcard", scheme: "light",
    stock: "#ECE3D0", stock2: "#E2D7C0", stock3: "#D4C6AB",
    inkBase: "#37301F", softBase: "#6A5D45", muteBase: "#978B72",
    accent: "#A66A3B", accent2: "#5C7E75", pop: "#B23A2E",
    grain: 0.06,
    mix: { p: 3, p2: 8, p3: 14, ink: 6, soft: 26, mute: 40 },
  },
  // near-black ground, neon orange/green/yellow — Memphis / 80s poster
  eighties: {
    key: "eighties", label: "neon memphis", scheme: "dark",
    stock: "#121014", stock2: "#18161B", stock3: "#211E25",
    inkBase: "#F5F1E8", softBase: "#CBC6BC", muteBase: "#8F8B83",
    accent: "#F4551E", accent2: "#2FB877", pop: "#F4C531",
    grain: 0.04,
    mix: { p: 6, p2: 10, p3: 16, ink: 0, soft: 20, mute: 30 },
  },
};

/** the full CSS custom-property block for a palette — same shape the reader
 *  already injects for a world, so globals.css derivations are untouched. */
export function paletteVars(p: Palette): string {
  const m = p.mix;
  return [
    `--accent:${p.accent}`,
    `--accent2:${p.accent2}`,
    `--counter:${p.accent2}`,
    `--pop:${p.pop}`,
    `--stock:${p.stock}`, `--stock-2:${p.stock2}`, `--stock-3:${p.stock3}`,
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
