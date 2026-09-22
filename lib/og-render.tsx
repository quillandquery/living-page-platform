/**
 * THE SHARE FRAME — v5. One page in miniature, one engine, three canvases.
 *
 * v4 drew a flat gradient wash behind a big pull-quote — a nicely
 * typeset quote card, but not recognisably a LIVING PAGE (no world, one
 * font actually loaded, three competing layout templates). This version
 * draws the same thing every reader page draws, reduced to a still: a
 * ruled masthead (the site's most recognisable signature), the story's
 * own illustrated world behind it (`share-scene.tsx`, driven by the same
 * `lib/backdrops.ts` data the reader uses), the line the piece turns on
 * set in the voice the engine actually chose for it
 * (`lib/story-hero.ts`), and the byline. One composition, one grammar,
 * at three sizes — not three templates.
 */
import type { CSSProperties, ReactNode } from "react";
import { getBackdrop, BACKDROPS } from "./backdrops";
import { moodRegister, registerAdjust } from "./share-frame";
import { PageEdge, Signature, LifeLabel, type ChromePalette } from "./share-chrome";
import { ShareScene, sceneGround, alphaHex } from "./share-scene";
import { deriveHeroDirection } from "./story-hero";
import { CANVASES, type CanvasKey } from "./share-canvas";
import type { ShareComposition } from "./share-layout";

export const OG_SIZE = { width: CANVASES.og.w, height: CANVASES.og.h };
export const IG_FEED_SIZE = { width: CANVASES.feed.w, height: CANVASES.feed.h };
export const IG_STORY_SIZE = { width: CANVASES.story.w, height: CANVASES.story.h };

export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const p = (h: string) => {
    const m = /^#([0-9a-f]{6})$/i.exec(h.trim());
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = p(hexA);
  const [br, bg, bb] = p(hexB);
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), b = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b})`;
}

/* ── per-canvas padding (the pixel sizes/scale live in share-canvas.ts;
   this is purely a layout detail of THIS frame) ────────────────────── */
const PAD: Record<CanvasKey, { x: number; edge: number }> = {
  og: { x: 88, edge: 40 },
  feed: { x: 100, edge: 44 },
  story: { x: 100, edge: 44 },
};

/** The turn line carries the whole canvas, so it's sized off its own
 *  length — a short hook goes enormous, a long one stays legible. Base
 *  sizes for the OG frame; every canvas multiplies by its own `scale`. */
function turnSize(text: string): number {
  const n = text.length;
  if (n > 200) return 30;
  if (n > 150) return 38;
  if (n > 110) return 48;
  if (n > 80) return 60;
  if (n > 55) return 76;
  if (n > 32) return 96;
  return 116;
}

type HeroStyle = {
  fontFamily: string;
  fontStyle: "normal" | "italic";
  uppercase: boolean;
  scaleMul: number;
  colorMix: number; // 0..1 toward accent2
  rotate: number;
  letterSpacingEm: number;
};

/** The five voices `deriveHeroDirection` can hand back, translated into
 *  a still-frame treatment. Mirrors `.v-*` in `app/globals.css` (font,
 *  colour-lean) at poster scale rather than reading scale. */
function heroStyle(voice: string, hasHand: boolean): HeroStyle {
  switch (voice) {
    case "whisper": return { fontFamily: "Instrument Serif", fontStyle: "italic", uppercase: false, scaleMul: 0.82, colorMix: 0.12, rotate: 0, letterSpacingEm: 0 };
    case "drift":   return { fontFamily: "Instrument Serif", fontStyle: "italic", uppercase: false, scaleMul: 0.92, colorMix: 0.3, rotate: 0, letterSpacingEm: 0 };
    case "shout":   return { fontFamily: "Instrument Serif", fontStyle: "normal", uppercase: true, scaleMul: 1.05, colorMix: 0.55, rotate: 0, letterSpacingEm: 0.01 };
    case "thought": return { fontFamily: hasHand ? "Caveat" : "Instrument Serif", fontStyle: "normal", uppercase: false, scaleMul: hasHand ? 1.3 : 1.0, colorMix: 0.25, rotate: -1.6, letterSpacingEm: 0 };
    default:        return { fontFamily: "Instrument Serif", fontStyle: "normal", uppercase: false, scaleMul: 1.0, colorMix: 0, rotate: 0, letterSpacingEm: -0.02 };
  }
}

export type ShareFrameProps = {
  composition: ShareComposition;
  environmentKey: string;
  authorHandle?: string | null;
  mood?: string | null;
  /** "livingpage.one" — read from the configured site host, never hardcoded */
  host: string;
  canvas: CanvasKey;
  hasDisplay?: boolean;
  hasBody?: boolean;
  hasHand?: boolean;
  hasMono?: boolean;
};

export function ShareFrame({
  composition, environmentKey, authorHandle, mood, host, canvas,
  hasDisplay = false, hasBody = false, hasHand = false, hasMono = false,
}: ShareFrameProps) {
  const c = CANVASES[canvas];
  const pad = PAD[canvas];
  const s = (n: number) => Math.round(n * c.scale);

  const backdrop = getBackdrop(environmentKey) ?? BACKDROPS.dawn;
  const dark = backdrop.scheme === "dark";
  const ground = sceneGround(backdrop);
  const accent = backdrop.accent;
  const accent2 = backdrop.secondaryAccent ?? accent;
  const ink = dark ? "#F3F1EA" : "#181410";
  const soft = dark ? "rgba(243,241,234,0.76)" : "rgba(24,20,16,0.72)";
  const mute = dark ? "rgba(243,241,234,0.5)" : "rgba(24,20,16,0.46)";
  const rule = dark ? "rgba(243,241,234,0.22)" : "rgba(24,20,16,0.16)";
  const palette: ChromePalette = { ink, mute, rule, accent };

  const reg = registerAdjust(moodRegister(mood));
  const veil = reg.veilAlpha > 0 ? (dark ? `rgba(0,0,0,${reg.veilAlpha})` : `rgba(20,16,14,${reg.veilAlpha})`) : null;

  const serif = hasDisplay ? "Instrument Serif" : "serif";
  const body = hasBody ? "Newsreader" : "serif";
  const hand = hasHand ? "Caveat" : serif;
  const mono = hasMono ? "Space Mono" : "monospace";

  const hero = deriveHeroDirection({ title: composition.turn, mood });
  const style = heroStyle(hero.voice, hasHand);
  const heroFamily = style.fontFamily === "Caveat" ? hand : style.fontFamily === "Instrument Serif" ? serif : body;
  const heroColor = style.colorMix > 0 ? mixHex(ink, accent2, style.colorMix) : ink;

  const safeTop = c.safeTop || s(pad.x * 0.6);
  const safeBottom = c.safeBottom || s(pad.x * 0.5);

  const shell: CSSProperties = {
    width: c.w, height: c.h, display: "flex", position: "relative", background: ground, overflow: "hidden",
  };
  const inner: CSSProperties = {
    position: "relative", width: c.w, height: c.h, display: "flex", flexDirection: "column",
    paddingTop: safeTop, paddingBottom: safeBottom,
    paddingLeft: s(pad.x), paddingRight: s(pad.x) - s(16),
  };

  const Rule = ({ mt = 0, mb = 0 }: { mt?: number; mb?: number }) => (
    <div style={{ display: "flex", width: "100%", height: 1, background: rule, marginTop: mt, marginBottom: mb }} />
  );

  return (
    <div style={shell}>
      <ShareScene backdrop={backdrop} w={c.w} h={c.h} seed={composition.pageMark.length + hero.headline.length} />
      {veil ? <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: veil }} /> : null}
      <PageEdge height={c.h} pageMark={composition.pageMark} palette={palette} left={s(pad.edge)} fontSize={s(13)} />

      <div style={inner}>
        {/* ── MASTHEAD ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", flex: "0 0 auto" }}>
          <Rule mb={s(18)} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <LifeLabel label={composition.lifeLabel} palette={palette} fontSize={s(18)} />
          </div>
          <div style={{
            display: "flex", marginTop: s(14), fontFamily: mono, fontSize: s(22), lineHeight: 1.2,
            letterSpacing: s(3), textTransform: "uppercase", color: ink, fontWeight: 700, maxWidth: c.w - s(pad.x) * 2,
          }}>
            {composition.title}
          </div>
          <Rule mt={s(20)} />
        </div>

        {/* ── THE PAGE ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: "1 1 0", minHeight: 0, gap: s(14) }}>
          {composition.setup && composition.setup !== composition.title ? (
            <div style={{
              display: "flex", fontFamily: body, fontSize: s(26), lineHeight: 1.5,
              fontWeight: 400, color: soft, maxWidth: c.w - s(pad.x) * 2 - s(40),
            }}>
              {composition.setup}
            </div>
          ) : null}
          <div style={{
            display: "flex", fontFamily: heroFamily,
            fontStyle: style.fontStyle, fontWeight: style.fontFamily === "Caveat" ? 700 : 400,
            fontSize: s(Math.round(turnSize(composition.turn) * style.scaleMul)),
            lineHeight: style.fontFamily === "Caveat" ? 1.06 : 1.02,
            letterSpacing: `${style.letterSpacingEm}em`,
            textTransform: style.uppercase ? "uppercase" : "none",
            color: heroColor,
            transform: `rotate(${style.rotate || 0}deg)`,
            maxWidth: c.w - s(pad.x) * 2,
          }}>
            {composition.turn}
          </div>
          {composition.coda ? (
            <div style={{
              display: "flex", fontFamily: hand, fontWeight: 700, fontSize: s(38),
              lineHeight: 1.12, color: mixHex(ink, accent2, 0.7),
              maxWidth: c.w - s(pad.x) * 2 - s(60),
            }}>
              {composition.coda}
            </div>
          ) : null}
        </div>

        {/* ── BYLINE ───────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: s(14), flex: "0 0 auto", paddingTop: s(14), borderTop: `1px solid ${rule}` }}>
          {authorHandle ? (
            <div style={{ display: "flex", fontFamily: mono, fontSize: s(16), letterSpacing: s(1), color: soft, fontWeight: 500 }}>
              {authorHandle}
            </div>
          ) : null}
          <div style={{ display: "flex", marginLeft: "auto" }}>
            <Signature host={host} palette={palette} fontSize={s(16)} />
          </div>
        </div>
      </div>

      {composition.reaction ? <ReactionStamp text={composition.reaction} accent={accent2} ground={ground} scale={c.scale} fontFamily={hand} /> : null}
    </div>
  );
}

/** THE REACTION STAMP — a reader's one-tap feeling, hand-lettered onto
 *  the card they're about to share. Only ever present on an asset a
 *  reader generated at share time (the IG feed/story routes, `?r=`),
 *  never on the OG link-unfurl image, which is baked once for the
 *  crawler and has no per-viewer reaction to carry. */
function ReactionStamp({ text, accent, ground, scale, fontFamily }: { text: string; accent: string; ground: string; scale: number; fontFamily: string }) {
  const s = (n: number) => Math.round(n * scale);
  return (
    <div style={{
      position: "absolute", right: s(56), bottom: s(120), display: "flex", alignItems: "center", justifyContent: "center",
      transform: "rotate(-9deg)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: `${s(10)}px ${s(22)}px`, border: `2px solid ${accent}`, borderRadius: 999,
        background: alphaHex(ground, 0.5),
      }}>
        <div style={{ display: "flex", fontFamily, fontWeight: 700, fontSize: s(30), color: accent, letterSpacing: s(1) }}>
          {text}
        </div>
      </div>
    </div>
  );
}

/** The one fallback — a story that vanished between the crawler and now. */
export function FallbackFrame({ canvas }: { canvas: CanvasKey }) {
  const c = CANVASES[canvas];
  return (
    <div style={{
      width: c.w, height: c.h, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F5F0E4", fontFamily: "serif", fontSize: Math.round(48 * c.scale),
      fontWeight: 400, color: "#141210",
    }}>
      Living Page
    </div>
  );
}
