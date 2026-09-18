import React, { Fragment } from "react";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { worldVars } from "@/lib/backdrops";
import { paletteStyle } from "@/lib/palette-style";
import { isCompleteArtDirection } from "@/lib/art-direction/types";
import type { StoryViewData } from "@/components/living/StoryView";
import type { Block } from "@/lib/story-blocks.mjs";
import type { Body, Gesture, Move, Voice } from "@/lib/vocabulary";

/**
 * FORMAT SHELL — the guarantee that a format changes the STAGE, never the
 * behaviour. Every format built on this gets the palette ground, the veil,
 * and real <Beat>s (voice, movement, scatter) for free. A format supplies a
 * class, a header, an optional per-beat wrapper, and CSS — nothing more.
 */

const VOICES = new Set<Voice>(["speak", "whisper", "shout", "thought", "drift", "echo", "listen", "ledger"]);
const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

export type BeatInfo = { text: string; voice: Voice; body?: Body; move?: Move; gesture?: Gesture; doodle?: string };

export function beatsFrom(blocks: Block[]): BeatInfo[] {
  const out: BeatInfo[] = [];
  for (const b of blocks) {
    if (b.kind === "beat" && (b.text ?? "").trim()) {
      out.push({
        text: b.text.trim(),
        voice: VOICES.has(b.voice as Voice) ? (b.voice as Voice) : "speak",
        body: b.body as Body | undefined,
        move: b.move as Move | undefined,
        gesture: b.gesture as Gesture | undefined,
        doodle: b.doodle,
      });
    } else if (b.kind === "raw" && !b.text.trim().startsWith("<")) {
      const t = strip(b.text);
      if (t && t !== "---") out.push({ text: t, voice: "speak" });
    }
  }
  return out;
}

export function hashAt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

export function FormatShell({
  variant, header, footer, wrap, flat = true, veil = true, scoped = false, accent, artDirection, seed = "preview", blocks,
}: Pick<StoryViewData, "accent" | "artDirection" | "seed" | "blocks"> & {
  veil?: boolean;
  scoped?: boolean;
  variant: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  flat?: boolean;
  wrap?: (beat: React.ReactNode, info: BeatInfo, i: number) => React.ReactNode;
}) {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#4C6A8A";
  const ad = isCompleteArtDirection(artDirection) ? artDirection : null;
  const vars = ad?.palette?.vars ?? worldVars(null, safeAccent);
  const scheme = ad?.palette?.scheme ?? "light";
  const beats = beatsFrom(blocks);

  return (
    <main className={`frame story-reading fmt-${variant} ${flat ? "fmt-flat" : ""} scheme-${scheme}`} style={scoped ? paletteStyle(vars) : undefined}>
      {scoped ? null : <style>{`:root{${vars}}`}</style>}
      {header}
      <StoryFrame veil={veil} accent={safeAccent}>
        {beats.map((b, i) => {
          const beat = (
            <Beat voice={b.voice} body={b.body} move={b.move} gesture={b.gesture} seed={i * 7 + 3}>
              {b.text}
            </Beat>
          );
          return <Fragment key={i}>{wrap ? wrap(beat, b, i) : beat}</Fragment>;
        })}
      </StoryFrame>
      {footer}
    </main>
  );
}

export default FormatShell;
