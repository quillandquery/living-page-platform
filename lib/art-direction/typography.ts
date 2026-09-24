/**
 * TYPOGRAPHY BUNDLES — a world's voice on the page.
 *
 * Story Visual System 3.0. Colour used to own the ground while every world
 * spoke in the same four families (Newsreader / Instrument / Caveat / Space
 * Mono). Type is half of what makes a place feel like a place: a dive log is
 * not set in the same letters as a wanted poster. A bundle remaps the four
 * roles the reader CSS already consumes — `--f-body`, `--f-disp`, `--f-hand`,
 * `--f-mono` — to families loaded once in app/layout.tsx. A palette carries a
 * bundle; injecting the palette swaps the type with the colour, in one move,
 * self-contained in the stored row (D4) so an old story never breaks.
 */

export type FontBundle = { body: string; disp: string; hand: string; mono: string };

/** Every family here is loaded in app/layout.tsx as a `--font-*` variable. */
export const FONTS: Record<string, FontBundle> = {
  // the original site hand — the default when a palette names no bundle.
  editorial: {
    body: "var(--font-body), Georgia, 'Times New Roman', serif",
    disp: "var(--font-disp), Georgia, serif",
    hand: "var(--font-hand), 'Bradley Hand', cursive",
    mono: "var(--font-mono), ui-monospace, Menlo, monospace",
  },
  // Atlas diving — heavy condensed display, a literary serif, a lab mono.
  diving: {
    body: "var(--font-fraunces), Georgia, serif",
    disp: "var(--font-archivo), 'Arial Narrow', sans-serif",
    hand: "var(--font-fraunces), Georgia, serif",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
  // old-world romance — Playfair titling over a warm serif.
  paris: {
    body: "var(--font-fraunces), Georgia, serif",
    disp: "var(--font-playfair), Georgia, serif",
    hand: "var(--font-hand), 'Bradley Hand', cursive",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
  // 1940s film — a typewriter body, a stark condensed poster title.
  noir: {
    body: "var(--font-elite), 'Courier New', monospace",
    disp: "var(--font-bebas), 'Arial Narrow', sans-serif",
    hand: "var(--font-elite), 'Courier New', monospace",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
  // synthwave — a neon-tube display over a clean body.
  neon: {
    body: "var(--font-archivo), system-ui, sans-serif",
    disp: "var(--font-monoton), 'Arial Black', sans-serif",
    hand: "var(--font-hand), cursive",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
  // wood-type broadside — the wanted poster.
  poster: {
    body: "var(--font-body), Georgia, serif",
    disp: "var(--font-anton), 'Arial Narrow', sans-serif",
    hand: "var(--font-hand), cursive",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
  // a long time ago, in a galaxy far, far away.
  space: {
    body: "var(--font-archivo), Arial, sans-serif",
    disp: "var(--font-bebas), 'Arial Narrow', sans-serif",
    hand: "var(--font-hand), cursive",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
  // pencil on the back of a receipt.
  sketch: {
    body: "var(--font-body), Georgia, serif",
    disp: "var(--font-hand), 'Bradley Hand', cursive",
    hand: "var(--font-hand), 'Bradley Hand', cursive",
    mono: "var(--font-mono), ui-monospace, Menlo, monospace",
  },
  // an essay, a credo, a garden — serif for thinking in.
  literary: {
    body: "var(--font-fraunces), Georgia, serif",
    disp: "var(--font-fraunces), Georgia, serif",
    hand: "var(--font-hand), cursive",
    mono: "var(--font-plex), ui-monospace, Menlo, monospace",
  },
};

export type FontKey = keyof typeof FONTS;

/** the four custom-property overrides a bundle contributes to a palette's
 *  var block — empty for the default hand (so legacy rows keep their type). */
export function fontVars(bundle?: FontBundle): string {
  if (!bundle) return "";
  return `--f-body:${bundle.body};--f-disp:${bundle.disp};--f-hand:${bundle.hand};--f-mono:${bundle.mono}`;
}
