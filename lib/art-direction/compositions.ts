/**
 * COMPOSITION — where the visual world lives on the page. Nine, curated.
 * Each maps to a CSS class on the reading shell (`.comp-*` in globals.css)
 * that changes how artwork is placed and how the frame reads — a postcard
 * gets a border, a scrapbook scatters, a journey runs wide.
 */
import type { ArtworkPlacement, CompositionDirection, CompositionKey } from "./types";

export type CompositionSpec = CompositionDirection & {
  /** the placement pool this composition draws artwork from */
  placements: ArtworkPlacement[];
  framed: boolean;
};

export const COMPOSITIONS: Record<CompositionKey, CompositionSpec> = {
  stage:            { key: "stage", label: "stage", placements: ["margin-left", "margin-right"], framed: false },
  postcard:         { key: "postcard", label: "postcard", placements: ["corner-tl", "corner-br", "margin-right"], framed: true },
  scrapbook:        { key: "scrapbook", label: "scrapbook", placements: ["corner-tl", "corner-tr", "corner-bl", "corner-br", "margin-left", "margin-right"], framed: false },
  journey:          { key: "journey", label: "journey", placements: ["full-bleed", "margin-right"], framed: false },
  "edge-world":     { key: "edge-world", label: "edge world", placements: ["margin-left", "margin-right", "corner-tr"], framed: false },
  collision:        { key: "collision", label: "collision", placements: ["behind-text", "margin-left", "margin-right"], framed: false },
  floating:         { key: "floating", label: "floating", placements: ["full-bleed", "behind-text"], framed: false },
  diorama:          { key: "diorama", label: "diorama", placements: ["margin-left", "margin-right", "behind-text"], framed: false },
  "chaotic-collage":{ key: "chaotic-collage", label: "chaotic collage", placements: ["corner-tl", "corner-tr", "corner-bl", "corner-br", "behind-text", "margin-left", "margin-right"], framed: false },
};

export const COMPOSITION_KEYS = Object.keys(COMPOSITIONS) as CompositionKey[];
