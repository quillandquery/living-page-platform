/**
 * PALETTE — a first-class colour identity for a story.
 *
 * A palette OWNS the ground (not "one cream tinted a few percent"). It is a
 * *family*: a base hue + a spread, and each story rotates its own hue within
 * the spread from its seed in OKLCH, so lightness and chroma — the thing that
 * makes a palette recognisable — stay put while the colour shifts. Two stories
 * in the same family are kin, never identical.
 *
 * Story Visual System 3.0: a palette also carries a TYPE bundle (see
 * ./typography.ts). Injecting the palette swaps colour AND type together, so a
 * dive log and a wanted poster are different places, not the same page recoloured.
 *
 * `paletteVars` emits exactly the CSS custom properties the reader injects
 * (same shape as `worldVars` in lib/backdrops.ts) plus the four `--f-*` type
 * overrides — self-contained, so a stored row never breaks if the registry moves.
 */
import { FONTS, fontVars, type FontBundle } from "./typography";

/** [lightness, chroma] — hue is supplied per story from the seed */
type LC = [number, number];
/** [lightness, chroma, hueDelta] — hue is (story hue + delta) */
type LCd = [number, number, number];

export type Palette = {
  key: string;
  label: string;
  scheme: "light" | "dark";
  baseAccent: string;
  baseAccent2: string;
  hue: number;
  hueSpread: number;
  accent: LC;
  accent2: LCd;
  pop: LCd;
  ground: { hex: [string, string, string] } | { lc: [LC, LC, LC] };
  inkBase: string; softBase: string; muteBase: string;
  grain: number;
  mix: { p: number; p2: number; p3: number; ink: number; soft: number; mute: number };
  /** the world's type — omitted keeps the default site hand (legacy-safe) */
  fonts?: FontBundle;
};

export const PALETTES: Record<string, Palette> = {
  // ── the originals (unchanged; no font bundle → default hand) ──────────
  minimal: {
    key: "minimal", label: "paper white", scheme: "light",
    baseAccent: "#3B5168", baseAccent2: "#3B5168", hue: 250, hueSpread: 55,
    accent: [0.42, 0.05], accent2: [0.42, 0.05, 0], pop: [0.55, 0.16, 20],
    ground: { hex: ["#FCFBF9", "#F3F1EC", "#E9E7E1"] },
    inkBase: "#16161A", softBase: "#58565C", muteBase: "#9C9A9E",
    grain: 0.015, mix: { p: 0, p2: 2, p3: 4, ink: 0, soft: 8, mute: 14 },
  },
  maximal: {
    key: "maximal", label: "lavender collage", scheme: "light",
    baseAccent: "#5B3FE0", baseAccent2: "#E8619F", hue: 275, hueSpread: 50,
    accent: [0.52, 0.19], accent2: [0.62, 0.17, 100], pop: [0.82, 0.15, 185],
    ground: { lc: [[0.83, 0.085], [0.79, 0.10], [0.74, 0.115]] },
    inkBase: "#201E52", softBase: "#454391", muteBase: "#6D6BB4",
    grain: 0.05, mix: { p: 5, p2: 10, p3: 16, ink: 8, soft: 32, mute: 44 },
  },
  postcard: {
    key: "postcard", label: "aged postcard", scheme: "light",
    baseAccent: "#A66A3B", baseAccent2: "#5C7E75", hue: 45, hueSpread: 28,
    accent: [0.56, 0.11], accent2: [0.54, 0.06, 165], pop: [0.50, 0.15, 5],
    ground: { hex: ["#ECE3D0", "#E2D7C0", "#D4C6AB"] },
    inkBase: "#37301F", softBase: "#6A5D45", muteBase: "#978B72",
    grain: 0.06, mix: { p: 3, p2: 8, p3: 14, ink: 6, soft: 26, mute: 40 },
  },
  eighties: {
    key: "eighties", label: "neon memphis", scheme: "dark",
    baseAccent: "#F4551E", baseAccent2: "#2FB877", hue: 35, hueSpread: 55,
    accent: [0.68, 0.21], accent2: [0.72, 0.19, 150], pop: [0.86, 0.17, 60],
    ground: { hex: ["#121014", "#18161B", "#211E25"] },
    inkBase: "#F5F1E8", softBase: "#CBC6BC", muteBase: "#8F8B83",
    grain: 0.04, mix: { p: 6, p2: 10, p3: 16, ink: 0, soft: 20, mute: 30 },
  },

  // ── new worlds (Story Visual System 3.0) ─────────────────────────────

  // Atlas diving — abyss ground, bioluminescent mint, a coral pop. The exact
  // tokens from atlasofskills.com/diving, made a first-class Living Page world.
  diving: {
    key: "diving", label: "the deep", scheme: "dark",
    baseAccent: "#8FF0DD", baseAccent2: "#FF4B33", hue: 178, hueSpread: 10,
    accent: [0.88, 0.11], accent2: [0.74, 0.10, 28], pop: [0.68, 0.225, -148],
    ground: { hex: ["#04121D", "#072536", "#0D4B63"] },
    inkBase: "#F1ECE0", softBase: "#9FC4C0", muteBase: "#5E7B82",
    grain: 0.05, mix: { p: 0, p2: 3, p3: 6, ink: 0, soft: 16, mute: 26 },
    fonts: FONTS.diving,
  },
  // old-world romance — warm cream, indigo ink, a rose and a gold.
  paris: {
    key: "paris", label: "old world", scheme: "light",
    baseAccent: "#B0475F", baseAccent2: "#C79A3B", hue: 350, hueSpread: 18,
    accent: [0.55, 0.14], accent2: [0.70, 0.11, 55], pop: [0.50, 0.13, -110],
    ground: { hex: ["#F3EBDD", "#EAE0CE", "#DDD0B8"] },
    inkBase: "#2A2740", softBase: "#5B5670", muteBase: "#8B8698",
    grain: 0.04, mix: { p: 4, p2: 9, p3: 15, ink: 6, soft: 26, mute: 38 },
    fonts: FONTS.paris,
  },
  // 1940s film — charcoal & bone, near-neutral, one blood red. Film grain.
  noir: {
    key: "noir", label: "black & white", scheme: "dark",
    baseAccent: "#C4362B", baseAccent2: "#8A857D", hue: 20, hueSpread: 4,
    accent: [0.55, 0.19], accent2: [0.55, 0.02, 0], pop: [0.60, 0.20, 5],
    ground: { hex: ["#141312", "#1C1B19", "#272522"] },
    inkBase: "#E6E2D8", softBase: "#A7A29A", muteBase: "#6E6A63",
    grain: 0.09, mix: { p: 0, p2: 2, p3: 4, ink: 0, soft: 8, mute: 16 },
    fonts: FONTS.noir,
  },
  // synthwave — black ground, magenta, cyan, a lime pop.
  neon: {
    key: "neon", label: "neon night", scheme: "dark",
    baseAccent: "#FF3DCB", baseAccent2: "#22E0FF", hue: 320, hueSpread: 34,
    accent: [0.66, 0.25], accent2: [0.78, 0.16, -125], pop: [0.86, 0.20, -190],
    ground: { hex: ["#0B0714", "#120A1E", "#1B0F2B"] },
    inkBase: "#F4ECFF", softBase: "#C6AEE6", muteBase: "#8A6FB0",
    grain: 0.05, mix: { p: 5, p2: 10, p3: 16, ink: 0, soft: 22, mute: 32 },
    fonts: FONTS.neon,
  },
  // wood-type broadside — aged kraft, sepia ink, a faded stamp red. Newsprint.
  sepia: {
    key: "sepia", label: "broadside", scheme: "light",
    baseAccent: "#5A4326", baseAccent2: "#9A3320", hue: 40, hueSpread: 14,
    accent: [0.42, 0.09], accent2: [0.45, 0.13, -20], pop: [0.45, 0.15, -15],
    ground: { hex: ["#E7D9BC", "#DDCDA9", "#CDBA90"] },
    inkBase: "#33281A", softBase: "#665538", muteBase: "#94815C",
    grain: 0.10, mix: { p: 3, p2: 8, p3: 14, ink: 6, soft: 24, mute: 38 },
    fonts: FONTS.poster,
  },
  // a galaxy far, far away — black, a star's yellow, sabre blue & red.
  space: {
    key: "space", label: "far away", scheme: "dark",
    baseAccent: "#FFE81F", baseAccent2: "#4FA8FF", hue: 100, hueSpread: 6,
    accent: [0.90, 0.18], accent2: [0.75, 0.14, 130], pop: [0.62, 0.24, -75],
    ground: { hex: ["#020204", "#060608", "#0C0C10"] },
    inkBase: "#F6F3E7", softBase: "#B9B7AC", muteBase: "#7C7B73",
    grain: 0.04, mix: { p: 0, p2: 2, p3: 4, ink: 0, soft: 12, mute: 22 },
    fonts: FONTS.space,
  },
  // pencil on paper — near-white, graphite ink, one pencil blue.
  sketch: {
    key: "sketch", label: "sketchbook", scheme: "light",
    baseAccent: "#3E5C86", baseAccent2: "#6E7A88", hue: 235, hueSpread: 20,
    accent: [0.50, 0.08], accent2: [0.50, 0.05, 20], pop: [0.55, 0.16, -60],
    ground: { hex: ["#FBFAF7", "#F1F0EC", "#E7E5DF"] },
    inkBase: "#22252B", softBase: "#565A62", muteBase: "#9498A0",
    grain: 0.02, mix: { p: 2, p2: 5, p3: 9, ink: 4, soft: 14, mute: 24 },
    fonts: FONTS.sketch,
  },
  // a garden to think in — sage, cream, a gold pop. For essays and credos.
  botanical: {
    key: "botanical", label: "the garden", scheme: "light",
    baseAccent: "#4C7A5E", baseAccent2: "#B08A3E", hue: 150, hueSpread: 22,
    accent: [0.50, 0.09], accent2: [0.60, 0.08, 60], pop: [0.55, 0.14, -120],
    ground: { hex: ["#F4F1E6", "#EBE7D6", "#DED9C3"] },
    inkBase: "#26302A", softBase: "#556056", muteBase: "#8B948A",
    grain: 0.035, mix: { p: 3, p2: 7, p3: 12, ink: 5, soft: 22, mute: 34 },
    fonts: FONTS.literary,
  },
  // campfire — warm dark, amber, ember red. A night that isn't cold.
  ember: {
    key: "ember", label: "firelight", scheme: "dark",
    baseAccent: "#E5883C", baseAccent2: "#C24A2E", hue: 40, hueSpread: 26,
    accent: [0.68, 0.16], accent2: [0.60, 0.19, -20], pop: [0.80, 0.16, 10],
    ground: { hex: ["#140D0A", "#1C1310", "#271A14"] },
    inkBase: "#F1E6D6", softBase: "#C3AE97", muteBase: "#8A755F",
    grain: 0.05, mix: { p: 4, p2: 9, p3: 15, ink: 0, soft: 20, mute: 30 },
    fonts: FONTS.literary,
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES);

/** deterministic [0,1) from the story seed */
function rnd(seed: number): number {
  let h = (seed >>> 0) || 1;
  h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
  return (h >>> 0) / 4294967296;
}
const oklch = (L: number, C: number, H: number) => `oklch(${L} ${C} ${(((H % 360) + 360) % 360).toFixed(1)})`;

/** the full CSS custom-property block for a palette at a story's seed. */
export function paletteVars(p: Palette, seed = 0): string {
  const H = p.hue + (rnd(seed) - 0.5) * 2 * p.hueSpread;
  const accent = oklch(p.accent[0], p.accent[1], H);
  const accent2 = oklch(p.accent2[0], p.accent2[1], H + p.accent2[2]);
  const pop = oklch(p.pop[0], p.pop[1], H + p.pop[2]);
  const [s1, s2, s3] = "hex" in p.ground
    ? p.ground.hex
    : (p.ground.lc.map(([L, C]) => oklch(L, C, H)) as [string, string, string]);
  const m = p.mix;
  const type = fontVars(p.fonts);
  return [
    `--accent:${accent}`,
    `--accent2:${accent2}`,
    `--counter:${accent2}`,
    `--pop:${pop}`,
    `--stock:${s1}`, `--stock-2:${s2}`, `--stock-3:${s3}`,
    `--ink-base:${p.inkBase}`, `--soft-base:${p.softBase}`, `--mute-base:${p.muteBase}`,
    `--grain:${p.grain}`,
    `color-scheme:${p.scheme}`,
    `--paper:color-mix(in oklab, var(--accent) calc(${m.p}% + var(--depth, 0) * 5%), var(--stock))`,
    `--paper-2:color-mix(in oklab, var(--accent) ${m.p2}%, var(--stock-2))`,
    `--paper-3:color-mix(in oklab, var(--accent) ${m.p3}%, var(--stock-3))`,
    `--ink:color-mix(in oklab, var(--accent) ${m.ink}%, var(--ink-base))`,
    `--ink-soft:color-mix(in oklab, var(--accent) ${m.soft}%, var(--soft-base))`,
    `--mute:color-mix(in oklab, var(--accent) ${m.mute}%, var(--mute-base))`,
    `--rule:color-mix(in oklab, var(--accent) 40%, transparent)`,
    `--rule-2:color-mix(in oklab, var(--accent) 16%, transparent)`,
    `--shade:color-mix(in oklab, var(--accent) 12%, transparent)`,
    type,
  ].filter(Boolean).join(";");
}
