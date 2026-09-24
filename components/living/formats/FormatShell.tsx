import React, { Fragment } from "react";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Backdrop } from "@/components/living/Backdrop";
import { SubjectLayer } from "@/components/living/SubjectLayer";
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

/** A new list-entry begins at a blank-line silence (a hold) or at an
 *  imperative "headline" line — so a list-piece groups into entries whether
 *  the writer double-spaced their items or not. The lead-in line before the
 *  first headline (if any) is its own entry. Used by the listicle format. */
const ITEM_OPENER = /^(become|spread|mention|spend|find|create|try|always|never|give|share|connect|make|smile|remember|start|notice|keep|choose|introduce|default|or it could|the smallest)\b/i;
export const isListOpener = (t: string) => ITEM_OPENER.test(t.trim());
export const isCoda = (t: string) => /\bsay to yourself\b/i.test(t);

export function groupsFrom(blocks: Block[]): BeatInfo[][] {
  // Item boundaries are, in order of trust: a blank-line silence (hold), the
  // first sentence of a source line (`lineStart`, emitted by annotate — the
  // reliable signal for a pasted list), and only failing both, an imperative
  // headline word (legacy/hand-authored blocks that carry neither).
  const hasLineStart = blocks.some((b) => b.kind === "beat" && (b as { lineStart?: boolean }).lineStart);
  type Cell = { info: BeatInfo; boundary: boolean } | "break";
  const flat: Cell[] = [];
  for (const b of blocks) {
    if (b.kind === "hold") { flat.push("break"); continue; }
    if (b.kind === "beat" && (b.text ?? "").trim()) {
      const info: BeatInfo = {
        text: b.text.trim(),
        voice: VOICES.has(b.voice as Voice) ? (b.voice as Voice) : "speak",
        body: b.body as Body | undefined,
        move: b.move as Move | undefined,
        gesture: b.gesture as Gesture | undefined,
        doodle: b.doodle,
      };
      const boundary = hasLineStart
        ? !!(b as { lineStart?: boolean }).lineStart
        : ITEM_OPENER.test(info.text);
      flat.push({ info, boundary });
    } else if (b.kind === "raw" && !b.text.trim().startsWith("<")) {
      const t = strip(b.text);
      if (t && t !== "---") flat.push({ info: { text: t, voice: "speak" }, boundary: !hasLineStart && ITEM_OPENER.test(t) });
    }
  }
  const groups: BeatInfo[][] = [];
  let cur: BeatInfo[] = [];
  const flush = () => { if (cur.length) { groups.push(cur); cur = []; } };
  for (const cell of flat) {
    if (cell === "break") { flush(); continue; }
    if (cur.length && cell.boundary) flush();
    cur.push(cell.info);
  }
  flush();
  return groups;
}

export function hashAt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

export function FormatShell({
  variant, header, footer, wrap, renderGroup, flat = true, veil = true, scoped = false, accent, artDirection, seed = "preview", blocks,
}: Pick<StoryViewData, "accent" | "artDirection" | "seed" | "blocks"> & {
  veil?: boolean;
  scoped?: boolean;
  variant: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  flat?: boolean;
  wrap?: (beat: React.ReactNode, info: BeatInfo, i: number) => React.ReactNode;
  /** group the beats into entries (list-pieces); overrides the flat map */
  renderGroup?: (children: React.ReactNode, info: { beats: BeatInfo[]; index: number; total: number }) => React.ReactNode;
}) {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#4C6A8A";
  const ad = isCompleteArtDirection(artDirection) ? artDirection : null;
  const vars = ad?.palette?.vars ?? worldVars(null, safeAccent);
  const scheme = ad?.palette?.scheme ?? "light";
  const materialVars = ad ? `--material-grain:${ad.material.grain};--material-contrast:${ad.material.contrast};--art-rotate:${ad.typography.rotateBias}deg;` : "";
  const worldClass = ad ? `material-${ad.material.key} look-${ad.look} palette-${ad.palette.key}` : "";
  const beats = beatsFrom(blocks);

  return (
    <main className={`frame story-reading fmt-${variant} ${flat ? "fmt-flat" : ""} scheme-${scheme} ${worldClass}`} style={scoped ? paletteStyle(`${vars};${materialVars}`) : undefined}>
      {scoped ? null : <style>{`:root{${vars};${materialVars}}`}</style>}
      {ad ? <Backdrop name={ad.environment.key} seed={seed} ambient={ad.ambientMotion} scheme={ad.palette?.scheme} /> : null}
      {ad ? <SubjectLayer subject={ad.subject} seed={seed} /> : null}
      {ad ? <div className="material-layer" /> : null}
      {header}
      <StoryFrame veil={veil} accent={safeAccent}>
        {renderGroup
          ? (() => {
              const groups = groupsFrom(blocks);
              let n = 0;
              return groups.map((g, gi) => {
                const kids = g.map((b, j) => {
                  const key = n++;
                  const beat = (
                    <Beat voice={b.voice} body={b.body} move={b.move} gesture={b.gesture} seed={key * 7 + 3}>
                      {b.text}
                    </Beat>
                  );
                  return <Fragment key={key}>{wrap ? wrap(beat, b, key) : beat}</Fragment>;
                });
                return (
                  <Fragment key={`g${gi}`}>{renderGroup(kids, { beats: g, index: gi, total: groups.length })}</Fragment>
                );
              });
            })()
          : beats.map((b, i) => {
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
