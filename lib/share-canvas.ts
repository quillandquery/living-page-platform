/**
 * THE SHARE CANVASES.
 *
 * One list of the exact pixel sizes every share surface needs, shared by
 * the render target (which lays out at these dimensions) and the capture
 * worker (which sets the viewport to them). A single source so a 1080×1350
 * layout can never be screenshotted at 1080×1351.
 */
export type CanvasKey = "og" | "feed" | "story";

export type CanvasSpec = {
  w: number;
  h: number;
  /** how the transformation splits at this aspect ratio */
  axis: "row" | "column";
  /** base type scale relative to the OG canvas */
  scale: number;
  /** Instagram lays its own chrome over the top/bottom of a 9:16 story */
  safeTop: number;
  safeBottom: number;
};

export const CANVASES: Record<CanvasKey, CanvasSpec> = {
  og:    { w: 1200, h: 630,  axis: "row",    scale: 1,    safeTop: 0,   safeBottom: 0 },
  feed:  { w: 1080, h: 1350, axis: "column", scale: 1.25, safeTop: 0,   safeBottom: 0 },
  story: { w: 1080, h: 1920, axis: "column", scale: 1.45, safeTop: 200, safeBottom: 260 },
};

export function isCanvasKey(v: string | undefined): v is CanvasKey {
  return v === "og" || v === "feed" || v === "story";
}

export type RenderMode = "transform" | "page";
export function isRenderMode(v: string | undefined): v is RenderMode {
  return v === "transform" || v === "page";
}
