/**
 * MATERIAL — what the page is printed on. Six, procedural (CSS only, no
 * images — §35/§43). `grain` and `contrast` drive the CSS custom properties
 * `StoryView` sets; the actual texture lives in globals.css under
 * `.material-*`.
 */
import type { MaterialDirection, MaterialKey } from "./types";

export const MATERIALS: Record<MaterialKey, MaterialDirection> = {
  paper:              { key: "paper", label: "paper", grain: 0.4, contrast: 1.0 },
  "faded-print":      { key: "faded-print", label: "faded print", grain: 0.65, contrast: 0.82 },
  newsprint:          { key: "newsprint", label: "newsprint", grain: 0.7, contrast: 1.1 },
  canvas:             { key: "canvas", label: "canvas", grain: 0.5, contrast: 0.95 },
  "screenprint-grain":{ key: "screenprint-grain", label: "screen print", grain: 0.55, contrast: 1.25 },
  "film-grain":       { key: "film-grain", label: "film grain", grain: 0.8, contrast: 1.05 },
};
