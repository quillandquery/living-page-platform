/**
 * SHARE MOTION — pre-generated loop frames from the SAME still frame.
 *
 * The share OG/IG still is a Satori render of <ShareFrame> (lib/og-render).
 * A moving share asset is just that same frame rendered at a sequence of
 * loop phases `t` (0..1): the world's rain falls and stars drift
 * (share-scene), and the page reveals — masthead, setup, the emphasis
 * landing, then the handwritten coda (og-render's reveal timeline). We
 * render the PNGs here and let the caller (scripts/gen-share-loops) encode
 * them to MP4/WebP with ffmpeg. Pre-generated, so nothing renders per
 * request; identical look to the still, because it IS the still, moving.
 */
import React from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { ShareFrame } from "./og-render";
import { buildComposition, shareHost } from "./share-render";
import { loadShareFonts, availableFamilies } from "./og-fonts";
import { CANVASES, type CanvasKey } from "./share-canvas";

type StoryLike = Parameters<typeof buildComposition>[0] & { author: { handle: string } };

export type LoopFrames = { png: Buffer[]; w: number; h: number; fps: number };

export async function renderLoopFrames(
  story: StoryLike,
  canvas: CanvasKey = "story",
  { frames = 36, fps = 12 }: { frames?: number; fps?: number } = {},
): Promise<LoopFrames> {
  const fonts = await loadShareFonts();
  const fam = availableFamilies(fonts);
  const { composition, environmentKey, mood } = buildComposition(story);
  const { w, h } = CANVASES[canvas];
  const png: Buffer[] = [];
  for (let i = 0; i < frames; i++) {
    const t = i / frames; // 0..1, seamless loop
    const el = React.createElement(ShareFrame, {
      composition, environmentKey, authorHandle: `@${story.author.handle}`, mood,
      host: shareHost(), canvas,
      hasDisplay: fam.has("Instrument Serif"), hasBody: fam.has("Newsreader"),
      hasHand: fam.has("Caveat"), hasMono: fam.has("Space Mono"), t,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(el as any, { width: w, height: h, fonts: fonts as any });
    png.push(Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng()));
  }
  return { png, w, h, fps };
}
